const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const source = file => fs.readFileSync(path.join(root, file), 'utf8');
function context(values) { const c = vm.createContext(values); c.window = c; return c; }
function load(c, file) { vm.runInContext(source(file), c); }
function functionSource(file, name) {
  const s = source(file);
  const start = s.search(new RegExp('(?:async )?function ' + name + '\\('));
  assert(start >= 0);
  return s.slice(start, s.indexOf('\n}', start) + 2);
}
function element() {
  const classes = new Set();
  return { style: {}, hidden: false, disabled: false, textContent: '', handlers: {},
    classList: {add: x => classes.add(x), remove: x => classes.delete(x), contains: x => classes.has(x)},
    addEventListener(type, fn) { this.handlers[type] = fn; },
    remove() { this.removed = true; },
  };
}
function loader(failed) {
  let now = 0, serial = 0, finished = 0;
  const timers = new Map(); let frames = [];
  const els = Object.fromEntries(['loading-overlay','loading-frame-back','loading-frame-front'].map(id => [id, element()]));
  const c = context({document: {getElementById: id => els[id]},
    performance: {now: () => now, getEntriesByType: () => []},
    sessionStorage: {getItem: () => null, setItem() {}},
    Image: class { set src(v) { if (!v.includes(failed)) this.onload?.(); else this.onerror?.(); } },
    requestAnimationFrame: fn => frames.push(fn),
    setTimeout: (fn, ms) => { const id = ++serial; timers.set(id, {at: now + ms, fn}); return id; },
    clearTimeout: id => timers.delete(id),
  });
  load(c, 'loading-screen.js');
  const resolve = c.LoadingScreen.start(() => finished++, {force:true});
  function advance(ms) {
    const end = now + ms;
    while (now < end) {
      now = Math.min(now + 16, end);
      for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.fn(); }
      const batch = frames; frames = []; batch.forEach(fn => fn(now));
    }
  }
  return {resolve, advance, els, get finished() {return finished;}};
}

test('failed/stalled frame cannot hold resolved entry; missing transition still removes overlay', () => {
  const h = loader('09.jpg');
  h.advance(5000); assert.equal(h.finished, 0, 'never bypass unresolved auth');
  h.resolve(); h.resolve(); h.advance(3000); assert.equal(h.finished, 1);
  h.advance(1000); assert.equal(h.els['loading-overlay'].removed, true);
  assert.equal(h.finished, 1);
});
test('successful frames retain normal minimum animation duration', () => {
  const h = loader('not-a-frame'); h.resolve(); h.advance(1900); assert.equal(h.finished, 0);
  h.advance(200); assert.equal(h.finished, 1);
  h.advance(4000); assert.equal(h.finished, 1);
});

function storageHarness() {
  let uid = 'A'; const values = new Map();
  const sb = {auth: {getSession: async () => ({data: {session: uid ? {user:{id:uid}} : null}})}};
  const c = context({localStorage: {getItem:k=>values.get(k)||null, setItem:(k,v)=>values.set(k,v), removeItem:k=>values.delete(k)}});
  load(c,'game-storage.js');
  return {c,sb,values,switchTo(id){uid=id;}};
}
test('boards and started flags are isolated by member; legacy saves are never adopted', async () => {
  const h = storageHarness();
  h.values.set('sozcel_state_2026-9-25','legacy');
  const a = h.c.IstGameStorage.create(h.sb);
  assert.equal(await a.get('sozcel_state_2026-9-25'),null);
  for (const key of ['sozcel_state_2026-9-25','tumcel_state_2026-9-25','bulmaca_started_2026-9-25']) await a.set(key,'A progress');
  h.switchTo('B'); const b = h.c.IstGameStorage.create(h.sb);
  assert.equal(await b.get('sozcel_state_2026-9-25'), null);
  assert.equal(await b.get('bulmaca_started_2026-9-25'), null);
  await b.set('sozcel_state_2026-9-25','B progress');
  await a.set('sozcel_state_2026-9-25','stale A write');
  assert.equal((await a.session()).data.session,null);
  assert.equal(await b.get('sozcel_state_2026-9-25'),'B progress');
  h.switchTo('A'); assert.equal(await a.get('sozcel_state_2026-9-25'),'A progress');
});
test('signed-out games and unavailable local storage fail safely', async () => {
  const h = storageHarness(); h.switchTo(null);
  const guest = h.c.IstGameStorage.create(h.sb); await guest.set('state','guest');
  h.switchTo('B'); assert.equal((await guest.session()).data.session,null); assert.equal(h.values.size,0);
  const b = h.c.IstGameStorage.create(h.sb);
  h.c.localStorage.getItem = () => {throw new Error('unavailable');};
  assert.equal(await b.get('state'),null);
});

for (const game of ['sozcel','tumcel','bulmaca']) {
  test(game + ' saves use scoped storage and keep remote mirroring', async () => {
    const writes = [], remote = [];
    const c = context({SAVE_KEY:game+'_state_date',currentRow:1,currentGuess:'',gameOver:false,
      submittedGuesses:['ELMAS'],TARGET_WORD:'ELMAS',solvedQuotes:[],mistakes:3,guessedCombos:[],allFragments:[],
      userAnswers:{},gameCompleted:false,checkAttempts:1,
      gameStorage:{set:async (k,v)=>writes.push([k,JSON.parse(v)])},saveStateRemote:async state=>remote.push(state)});
    vm.runInContext(functionSource(game+'.html','saveState'), c); await c.saveState();
    assert.equal(writes.length,1); assert.equal(remote.length,1);
    const s=source(game+'.html');
    assert.match(s, /game-storage\.js\?v=1/);
    for (const fn of ['recordGameResult','saveStateRemote','restoreState','markAsPlayed','markPlayedGames']) {
      assert.doesNotMatch(functionSource(game+'.html',fn),/sb\.auth\.getSession\(|localStorage\./);
    }
  });
}
test('normal game closure refreshes after teardown; unmount does not reload', () => {
  let refreshes = 0, after;
  const layer=element(),frame={src:'sozcel.html'};
  const c=context({document:{getElementById:id=>id==='fb-game-frame'?frame:layer},
    IstSheet:{close:(el,fn)=>{after=fn;},syncDim(){}},refreshOyunColumn:()=>refreshes++});
  vm.runInContext(functionSource('project.html','closeGameOverlay'),c);
  c.closeGameOverlay(); assert.equal(refreshes,0); after(); assert.equal(refreshes,1); assert.equal(frame.src,'about:blank');
  c.closeGameOverlay(true); assert.equal(refreshes,1);
});

test('mahalle save errors remain visible and retry succeeds', async () => {
  let response = {data:null,error:{message:'offline'}};
  const select=element();select.value='mahalle-1';const save=element(),later=element(),error=element(),overlay=element();
  const controls={'#ist-mp-select':select,'#ist-mp-save':save,'#ist-mp-later':later,'#ist-mp-error':error};
  overlay.querySelector=id=>controls[id];
  const c=context({document:{createElement:()=>overlay,body:{appendChild(){}}},requestAnimationFrame:fn=>fn(),
    setTimeout:fn=>fn(),sessionStorage:{setItem(){}},console:{error(){}}});
  load(c,'mahalle-picker.js');
  const sb={from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({data:{neighborhood:'district',onboarded_at:'date'}}),
    order:async()=>({data:[{id:'mahalle-1',name_tr:'Test'}]}),update(){return this;},single:async()=>{if(response instanceof Error)throw response;return response;}})};
  await c.MahallePicker.maybeRun({sb,user:{id:'A'}});
  for (const failure of [{data:null,error:{message:'offline'}},new Error('network'),{data:null,error:null}]) {
    response=failure; await save.handlers.click();
    assert.equal(overlay.removed,undefined);assert.equal(save.disabled,false);assert.equal(error.hidden,false);assert.match(error.textContent,/tekrar/);
  }
  response={data:{id:'A'},error:null};await save.handlers.click();assert.equal(overlay.removed,true);
});

test('all page scripts parse and shared asset versions agree', () => {
  const refs=new Map();
  for(const f of fs.readdirSync(root)) {
    if(f.endsWith('.js')) new vm.Script(source(f),{filename:f});
    if(!f.endsWith('.html'))continue;
    const s=source(f);
    for(const m of s.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
      if(!/\bsrc\s*=|application\/ld\+json/.test(m[1]))new vm.Script(m[2],{filename:f});
    }
    for(const m of s.matchAll(/(?:src|href)="([\w.\-/]+\.(?:js|css))(\?v=\d+)?"/g)) {
      assert(m[2],f+': unversioned '+m[1]);
      if(refs.has(m[1]))assert.equal(m[2],refs.get(m[1]),m[1]);
      refs.set(m[1],m[2]);assert(fs.existsSync(path.join(root,m[1])),m[1]);
    }
  }
});
