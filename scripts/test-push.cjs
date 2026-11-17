// Push notifications: the admin preview renders templates the way
// push_render() does, and push.js is inert on the web but holds a tap
// that arrives before the page has said what to open.
const test = require('node:test'), assert = require('node:assert/strict');
const vm = require('node:vm'), fs = require('node:fs'), path = require('node:path');

const admin = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
function fn(name) { const a = admin.indexOf('function ' + name + '('); return admin.slice(a, admin.indexOf('\n}', a) + 2); }

test('preview tidies what an empty placeholder leaves', () => {
  const c = vm.createContext({});
  vm.runInContext(fn('pushRender'), c);
  const vars = { title: 'Çay', day: 'Yarın', time: '18:30', place: '' };
  assert.equal(c.pushRender('{title} · {day} {time} · {place}', vars), 'Çay · Yarın 18:30');
  assert.equal(c.pushRender('{place} · {title}', vars), 'Çay');
  assert.equal(c.pushRender('{name} de geliyor {nope}', { name: 'Cem' }), 'Cem de geliyor');
});

const pushSrc = fs.readFileSync(path.join(__dirname, '../push.js'), 'utf8');
function load(win) { const c = vm.createContext({ window: win, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, console }); vm.runInContext(pushSrc, c); return win.IstPush; }

test('on the web every call is a no-op', async () => {
  const P = load({});
  await P.init({ sb: { rpc: () => { throw Error('no rpc on the web'); } }, ask: true });
  await P.unregister({});
});

test('a cold-start tap waits for onOpen; ask=false never prompts', async () => {
  const listeners = {}, calls = [];
  const plugin = {
    addListener: (ev, cb) => { listeners[ev] = cb; },
    checkPermissions: async () => ({ receive: 'prompt' }),
    requestPermissions: async () => { calls.push('request'); return { receive: 'granted' }; },
    register: async () => { calls.push('register'); },
  };
  const P = load({ Capacitor: { isNativePlatform: () => true, Plugins: { PushNotifications: plugin } } });
  listeners.pushNotificationActionPerformed({ notification: { data: { event_id: 'e1' } } });
  let opened = null;
  P.onOpen(d => { opened = d; });
  assert.equal(opened.event_id, 'e1');
  await P.init({ sb: { rpc: async () => ({}) }, ask: false });
  assert.deepEqual(calls, []);
  await P.init({ sb: { rpc: async () => ({}) }, ask: true });
  assert.deepEqual(calls, ['request', 'register']);
});
