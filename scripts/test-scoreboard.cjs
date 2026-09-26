const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function harness(tables, {cap=2, at='2026-09-25T18:00:00Z', fail}={}) {
  class Clock extends Date { constructor(...args) { super(...(args.length ? args : [at])); } }
  const c = vm.createContext({Date:Clock, Intl}); c.window=c;
  for(const f of ['ist-date.js','scoreboard.js']) vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
  const calls=[];
  const sb={from(table) {
    const filters=[]; let order,limit;
    const q={select(){return q;}, eq(k,v){filters.push([k,'eq',v]);return q;},
      in(k,v){filters.push([k,'in',Array.from(v)]);return q;},gte(k,v){filters.push([k,'gte',v]);return q;},
      gt(k,v){filters.push([k,'gt',v]);return q;},order(k){order=k;return q;},limit(n){limit=n;return q;},
      then(resolve,reject) {
        const call={table,filters,order,limit};calls.push(call);
        if(fail?.(call,calls)) return Promise.resolve({error:new Error('query failed'),data:null}).then(resolve,reject);
        let rows=(tables[table]||[]).filter(r=>filters.every(([k,op,v])=>op==='eq'?r[k]===v:op==='in'?v.includes(r[k]):op==='gte'?r[k]>=v:r[k]>v));
        rows=rows.slice().sort((a,b)=>a[order]<b[order]?-1:a[order]>b[order]?1:0).slice(0,Math.min(cap,limit));
        return Promise.resolve({data:rows,error:null}).then(resolve,reject);
      }};return q;
  }};
  return {weekly:opts=>c.IstScoreboard.weekly(sb,opts),calls};
}
const row=(id,uid,date,attempts=1,won=true,neighborhood='a',created_at='2026-09-25T18:00:00Z')=>({id,user_id:uid,date,attempts,won,neighborhood,created_at,game:'sozcel'});
const profile=id=>({id,first_name:id,neighborhood:'a'});

test('bounds results to this week and reads through server caps smaller than page size', async()=>{
  const results=Array.from({length:1100},(_,i)=>row(String(i).padStart(5,'0'),'old','2026-1-1'));
  for(let i=0;i<7;i++)results.push(row('r'+i,'u'+i,'2026-9-25',i===6?1:6,true,'a','2026-09-25T18:00:0'+i+'Z'));
  results.push(row('future','future','2026-9-26'));
  const h=harness({game_results:results,profiles:Array.from({length:7},(_,i)=>profile('u'+i))});
  const r=await h.weekly();assert.equal(r.error,null);assert.equal(r.rows[0].uid,'u6');assert.equal(r.rows.length,5);
  const reads=h.calls.filter(c=>c.table==='game_results');assert.equal(reads.length,5);
  for(const c of reads){assert(c.filters.some(([k,op])=>k==='date'&&op==='in'));assert.equal(c.order,'id');}
  assert(r.rows.every(r=>r.uid!=='future'&&r.uid!=='old'));
});
test('district scores still compute first solver against all districts',async()=>{
  const h=harness({game_results:[row('1','first','2026-9-25',2,true,'a','2026-09-25T18:00:00Z'),row('2','second','2026-9-25',2,true,'b','2026-09-25T18:01:00Z')],profiles:[profile('first'),profile('second')]});
  const r=await h.weekly({neighborhoodFilter:'b'});assert.equal(r.rows.length,1);assert.equal(r.rows[0].score,17);
});
test('date aliases and duplicate results do not multiply player or author credit',async()=>{
  const h=harness({game_results:[row('1','player','2026-9-25',6,false),row('2','player','2026-09-25',2),row('3','player','2026-9-25',1)],
    sozcel_used_answers:[{used_on:'2026-09-25',sozcul_id:'author'}],profiles:[profile('player'),profile('author')]});
  const r=await h.weekly();assert.equal(r.rows.find(r=>r.uid==='player').score,30);assert.equal(r.rows.find(r=>r.uid==='author').score,5);
});
test('Istanbul week crosses month/year boundaries without lexical date ranges',async()=>{
  const h=harness({game_results:[row('1','a','2025-12-29'),row('2','a','2026-1-1'),row('3','b','2025-12-28')],profiles:[profile('a')]},{at:'2025-12-31T22:00:00Z'});
  const r=await h.weekly();assert.equal(r.rows.length,1);assert.equal(r.rows[0].score,60);
});
test('mid-pagination and bonus query failures never return a partial leaderboard',async()=>{
  const tables={game_results:[row('1','a','2026-9-25'),row('2','b','2026-9-25'),row('3','c','2026-9-25')],profiles:[profile('a')]};
  for(const fail of [c=>c.table==='game_results'&&c.filters.some(([k,op])=>k==='id'&&op==='gt'),c=>c.table==='sozcel_used_answers']) {
    const r=await harness(tables,{fail}).weekly();assert.equal(r.rows,null);assert(r.error);
  }
});
test('empty week returns an empty board',async()=>{const r=await harness({}).weekly();assert.equal(r.error,null);assert.equal(r.rows.length,0);});
