// Isolated PostgreSQL check; never connects to Supabase.
// Install @electric-sql/pglite in a temporary directory and set NODE_PATH
// to its node_modules, then: node --test scripts/check-baski-migration.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const migration = readFileSync(join(__dirname, '../db/baski_v1.sql'), 'utf8');

test('edition migration preserves publication decisions on install and rerun', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role authenticated;
      create schema auth;
      create function auth.jwt() returns jsonb language sql as 'select null::jsonb';
      create table public.events (id integer primary key, event_date timestamptz);
      create table public.neighborhood_polls (id integer primary key, active boolean);
      create table public.library_letters (id uuid primary key);
      create table public.neighborhoods (id text primary key);
      insert into events values (1, now() + interval '1 day'), (2, now() + interval '2 days');
      insert into neighborhood_polls values (1, true), (2, true);
    `);
    await db.exec(migration);
    const snapshot = async () => (await db.query(`
      select 'event' as kind, id, edition_date::text, edition_order from events
      union all
      select 'poll', id, edition_date::text, edition_order from neighborhood_polls
      order by kind, id
    `)).rows;
    assert.ok((await snapshot()).every(row => row.edition_date === null), 'installation must not publish existing content');
    await db.exec(`
      update events set edition_date = '2026-09-26', edition_order = 3;
      update neighborhood_polls set edition_date = '2026-09-26', edition_order = 4;
      update events set edition_date = null where id = 2;
      update neighborhood_polls set edition_date = null where id = 2;
      insert into events values (3, now() + interval '3 days', null, 0, null, null);
      insert into neighborhood_polls values (3, true, null, 0);
    `);
    const before = await snapshot();
    await db.exec(migration);
    await db.exec(migration);
    assert.deepEqual(await snapshot(), before, 'published, withdrawn, and new draft rows must all stay unchanged');
    const editions = await db.query(`select events_current_edition('2026-09-27')::text as event, polls_current_edition('2026-09-27')::text as poll`);
    assert.deepEqual(editions.rows, [{ event: '2026-09-26', poll: '2026-09-26' }]);
  } finally {
    await db.close();
  }
});
