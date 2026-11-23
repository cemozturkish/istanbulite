const { chromium, devices } = require('playwright');
const fs = require('fs');
const SB = 'https://fgxispjoiynnoqitwpks.supabase.co';
const UID = '11111111-1111-4111-8111-111111111111';
function b64(o){return Buffer.from(JSON.stringify(o)).toString('base64url');}
const JWT = b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:UID,role:'authenticated',exp:4102444800,aud:'authenticated',email:'deniz@example.com'})+'.sig';
const USER = {id:UID,aud:'authenticated',role:'authenticated',email:'deniz@example.com',app_metadata:{provider:'email'},user_metadata:{},created_at:'2025-03-01T10:00:00Z'};
const SESSION = {access_token:JWT,refresh_token:'r',expires_in:3600*24*365,expires_at:4102444800,token_type:'bearer',user:USER};

function parseFilters(url){
  const f=[]; let order=null, limit=null;
  for (const [k,v] of url.searchParams){
    if (k==='select'||k==='on_conflict'||k==='columns') continue;
    if (k==='order'){order=v;continue;}
    if (k==='limit'){limit=+v;continue;}
    if (k==='offset') continue;
    if (k==='or'||k==='and'){continue;}
    const m=v.match(/^(not\.)?(eq|neq|gt|gte|lt|lte|in|is|like|ilike|cs|ov)\.(.*)$/s);
    if(m) f.push({col:k,neg:!!m[1],op:m[2],val:m[3]});
  }
  return {f,order,limit};
}
function test(row,{col,neg,op,val}){
  const x=row[col]; let r;
  const s=v=>v==null?null:String(v);
  switch(op){
    case 'eq': r=s(x)===val; break;
    case 'neq': r=s(x)!==val; break;
    case 'gt': r=x!=null&&s(x)>val; break;
    case 'gte': r=x!=null&&s(x)>=val; break;
    case 'lt': r=x!=null&&s(x)<val; break;
    case 'lte': r=x!=null&&s(x)<=val; break;
    case 'in': { const list=val.replace(/^\(|\)$/g,'').split(',').map(t=>t.replace(/^"|"$/g,'')); r=list.includes(s(x)); break; }
    case 'is': r= val==='null'? x==null : String(x)===val; break;
    default: r=true;
  }
  return neg?!r:r;
}
async function install(context, db, rpc, log){
  await context.addInitScript(([key,sess])=>{ try{localStorage.setItem(key,JSON.stringify(sess));}catch(e){} }, ['sb-fgxispjoiynnoqitwpks-auth-token', SESSION]);
  await context.route('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', r=>r.fulfill({path:__dirname+'/sbjs/package/dist/umd/supabase.js',contentType:'application/javascript'}));
  await context.route(SB+'/**', async route=>{
    const req=route.request(); const url=new URL(req.url()); const p=url.pathname; const m=req.method();
    const cors={'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*','access-control-expose-headers':'content-range'};
    if(m==='OPTIONS') return route.fulfill({status:200,headers:cors});
    if(p.startsWith('/auth/v1/user')) return route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(USER)});
    if(p.startsWith('/auth/v1/token')) return route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(SESSION)});
    if(p.startsWith('/rest/v1/rpc/')){
      const name=p.slice(13); let body={}; try{body=JSON.parse(req.postData()||'{}')}catch(e){}
      log && log('RPC '+name+' '+JSON.stringify(body).slice(0,120));
      let out = rpc[name]; if (typeof out==='function') out=out(body);
      if(out===undefined){ return route.fulfill({status:404,headers:cors,contentType:'application/json',body:JSON.stringify({code:'PGRST202',message:'not found'})}); }
      return route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(out)});
    }
    if(p.startsWith('/rest/v1/')){
      const table=p.slice(9);
      const accept=req.headers()['accept']||'';
      if(m!=='GET'&&m!=='HEAD'){
        log && log(m+' '+table+' '+(req.postData()||'').slice(0,100));
        let body=null; try{body=JSON.parse(req.postData()||'null')}catch(e){}
        const out = Array.isArray(body)?body:(body?[body]:[]);
        if(accept.includes('pgrst.object')) return route.fulfill({status:200,headers:cors,contentType:'application/json',body:JSON.stringify(out[0]||{})});
        return route.fulfill({status:201,headers:cors,contentType:'application/json',body:JSON.stringify(out)});
      }
      const {f,order,limit}=parseFilters(url);
      let rows=(db[table]||[]).filter(r=>f.every(x=>test(r,x)));
      if(order){ const [col,dir]=order.split(',')[0].split('.'); rows=[...rows].sort((a,b)=>(a[col]>b[col]?1:a[col]<b[col]?-1:0)*(dir==='desc'?-1:1)); }
      const total=rows.length;
      if(limit!=null) rows=rows.slice(0,limit);
      log && log('GET '+table+' '+url.search.slice(0,150)+' -> '+rows.length+(db[table]?'':' (NO TABLE)'));
      const headers={...cors,'content-range':'0-'+Math.max(rows.length-1,0)+'/'+total};
      if(accept.includes('pgrst.object')){
        if(!rows.length) return route.fulfill({status:406,headers,contentType:'application/json',body:JSON.stringify({code:'PGRST116',message:'no rows'})});
        return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(rows[0])});
      }
      return route.fulfill({status:200,headers,contentType:'application/json',body:m==='HEAD'?'':JSON.stringify(rows)});
    }
    log && log('OTHER '+m+' '+p);
    return route.fulfill({status:200,headers:cors,body:'{}'});
  });
  // Any other external host: abort quietly
  await context.route(/^https:\/\/(?!fgxispjoiynnoqitwpks|cdn\.jsdelivr)/, r=>r.abort());
}
module.exports={install,UID};
