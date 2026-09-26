const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../admin.html'),'utf8');
function fn(name){const a=source.indexOf('function '+name+'('),start=source.slice(a-6,a)==='async '?a-6:a;return source.slice(start,source.indexOf('\n}',a)+2);}
function setup(error=null){
  const calls=[],status={},sw={},editor={querySelector:()=>status};let refreshed=0;
  const c=vm.createContext({sb:{rpc:async(name,args)=>{calls.push({name,args});return{error};},from:()=>{throw Error('unexpected direct table write');}},
    document:{getElementById:id=>id==='sw-night'?{value:'2026-09-26'}:sw},
    sozReadEditor:()=>({word:'ELMAS',definition:'Meaning',syllables:['EL','MAS']}),loadSozcelSuggestions:()=>refreshed++,console:{error(){}}});
  vm.runInContext(['adminGameSaveError','writeGameLineup','sozConfirmPick'].map(fn).join('\n'),c);
  return {c,calls,status,editor,get refreshed(){return refreshed;}};
}
test('lineup and word each use one RPC with no direct table writes',async()=>{
  const h=setup();assert.equal((await h.c.writeGameLineup('2026-09-26',['sozcel',null])).error,null);
  await h.c.sozConfirmPick('suggestion','untrusted-author',h.editor);
  assert.equal(h.calls.length,2);assert.equal(h.calls[0].name,'admin_set_game_lineup');assert.equal(h.calls[1].name,'admin_pick_sozcel_suggestion');
  assert.equal(h.calls[1].args.p_id,'suggestion');assert.equal(h.calls[1].args.sozcul_id,undefined);assert.equal(h.refreshed,1);
});
test('missing migration is actionable and never falls back to partial saves',async()=>{
  const h=setup({code:'PGRST202',message:'not found'});
  assert.match((await h.c.writeGameLineup('2026-09-26',[])).error.message,/admin_game_transactions.sql/);
  await h.c.sozConfirmPick('suggestion','author',h.editor);assert.match(h.status.textContent,/admin_game_transactions.sql/);assert.equal(h.refreshed,0);
});
