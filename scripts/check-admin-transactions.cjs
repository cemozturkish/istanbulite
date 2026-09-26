// Isolated PostgreSQL tests using PGlite; never connects to Supabase.
// Install @electric-sql/pglite in a temporary directory, then run:
// NODE_PATH=/absolute/temp/node_modules node --test scripts/check-admin-transactions.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const sql = file => fs.readFileSync(path.join(root,'db',file),'utf8');
const admin='00000000-0000-0000-0000-000000000001', member='00000000-0000-0000-0000-000000000002';
const s1='00000000-0000-0000-0000-000000000011', s2='00000000-0000-0000-0000-000000000012';

test('admin transactions on an isolated database', async t => {
  const db = new PGlite();
  try {
    await db.exec(`create role authenticated; create role anon; create schema auth;
      create table public.profiles(id uuid primary key);
      insert into public.profiles values ('${admin}'), ('${member}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.uid',true),'')::uuid$$;
      create function public.is_admin() returns boolean language sql stable as $$select auth.uid() = '${admin}'::uuid$$;
      grant usage on schema auth to authenticated, anon;`);
    for(const file of ['game_night_slots.sql','game_day_toggles.sql','sozcel_used_answers.sql'])await db.exec(sql(file));
    await db.exec('alter table public.sozcel_used_answers add column definition text, add column syllables text[], add column sozcul_id uuid references public.profiles(id);');
    for(const file of ['sozcel_used_answers_v6_admin_override.sql','sozcel_word_suggestions.sql','sozcel_word_suggestions_v2_standing_pool.sql'])await db.exec(sql(file));
    // Baseline Supabase grants are not checked in; supply them explicitly.
    await db.exec('grant usage on schema public to authenticated, anon; grant select,insert,update,delete on all tables in schema public to authenticated;');
    await db.exec(sql('admin_game_transactions.sql'));
    await db.exec(sql('admin_game_transactions.sql'));
    async function actor(uid,role='authenticated') {
      await db.exec('reset role');await db.query("select set_config('request.uid',$1,false)",[uid||'']);await db.exec('set role '+role);
    }
    const lineup=(date,games)=>db.query('select public.admin_set_game_lineup($1::date,$2::text[])',[date,games]);
    const pick=(id,night,word='ELMAS',syllables=['EL','MAS'])=>db.query('select public.admin_pick_sozcel_suggestion($1::uuid,$2::date,$3,$4,$5::text[])',[id,night,word,'Meaning',syllables]);
    async function snapshot() {return (await db.query("select * from (select 'slots' as kind,to_jsonb(t) as row from public.game_night_slots t union all select 'toggles',to_jsonb(t) from public.game_day_toggles t) snapshot order by kind,row::text")).rows;}
    await t.test('anonymous and ordinary members cannot save either operation',async()=>{
      for(const [uid,role] of [['','anon'],[member,'authenticated'],['','authenticated']]) {
        await actor(uid,role);await assert.rejects(lineup('2026-09-26',['sozcel','tumcel']),e=>e.code==='42501');
        await assert.rejects(pick(s1,'2026-09-26'),e=>e.code==='42501');
      }
    });
    await actor(admin);
    await t.test('lineup replacement, swaps, and empty slots keep toggles consistent',async()=>{
      for(const games of [['sozcel','tumcel'],['tumcel','sozcel'],['bulmaca',null],[null,null]]) {
        await lineup('2026-09-26',games);
        assert.deepEqual((await db.query('select game from public.game_night_slots order by slot')).rows.map(r=>r.game),games);
        const off=(await db.query('select game from public.game_day_toggles order by game')).rows.map(r=>r.game);
        assert.deepEqual(off,['bulmaca','sozcel','tumcel'].filter(g=>!games.includes(g)));
      }
    });
    await t.test('invalid lineups leave existing data untouched',async()=>{
      const before=await snapshot();
      for(const games of [null,[],['sozcel'],['sozcel','sozcel'],['unknown',null],['sozcel','tumcel','bulmaca']])await assert.rejects(lineup('2026-09-26',games),e=>e.code==='22023');
      assert.deepEqual(await snapshot(),before);
    });
    await t.test('failure after lineup replacement rolls back both tables',async()=>{
      const before=await snapshot();await db.exec('reset role');
      await db.exec("create function public.fail_toggle() returns trigger language plpgsql as $$begin raise exception 'forced toggle failure'; end$$; create trigger fail_toggle before insert on public.game_day_toggles for each row execute function public.fail_toggle();");
      await actor(admin);await assert.rejects(lineup('2026-09-26',['sozcel','tumcel']),/forced toggle failure/);
      assert.deepEqual(await snapshot(),before);
      await db.exec('reset role; drop trigger fail_toggle on public.game_day_toggles;');await actor(admin);
    });
    await db.exec('reset role');
    await db.query("insert into public.sozcel_word_suggestions(id,word,suggested_by,status) values($1,'elmas',$3,'pending'),($2,'kalem',$3,'passed')",[s1,s2,member]);
    await actor(admin);
    await t.test('pick credits database author; replacing a pick retires only the previous pick',async()=>{
      await pick(s1,'2026-09-26');await pick(s1,'2026-09-26');
      await db.query("update public.sozcel_word_suggestions set status='pending' where id=$1",[s2]);
      await pick(s2,'2026-09-26','KALEM',['KA','LEM']);
      const words=(await db.query('select word,sozcul_id from public.sozcel_used_answers')).rows;
      assert.deepEqual(words,[{word:'KALEM',sozcul_id:member}]);
      assert.deepEqual((await db.query('select status from public.sozcel_word_suggestions order by id')).rows.map(r=>r.status),['passed','picked']);
      await assert.rejects(pick(s2,'2026-09-27','KALEM',['KA','LEM']),e=>e.code==='22023');
      await assert.rejects(pick(s1,'2026-09-27'),e=>e.code==='22023');
    });
    await t.test('missing or invalid suggestions cannot write a word',async()=>{
      await assert.rejects(pick('00000000-0000-0000-0000-000000000099','2026-09-27'),e=>e.code==='P0002');
      await assert.rejects(pick(s2,'2026-09-26','ELMAS',['EL','XXX']),e=>e.code==='22023');
      await assert.rejects(pick(s2,'2026-09-26','ELMAS',[null,'ELMAS']),e=>e.code==='22023');
      assert.equal((await db.query('select word from public.sozcel_used_answers')).rows[0].word,'KALEM');
    });
    await t.test('failure updating suggestion rolls back the word upsert',async()=>{
      await db.exec('reset role');await db.exec("create function public.fail_pick() returns trigger language plpgsql as $$begin raise exception 'forced pick failure'; end$$; create trigger fail_pick before update on public.sozcel_word_suggestions for each row execute function public.fail_pick();");
      await actor(admin);await assert.rejects(pick(s2,'2026-09-26'),/forced pick failure/);
      assert.equal((await db.query('select word from public.sozcel_used_answers')).rows[0].word,'KALEM');
    });
  } finally {await db.close();}
});
