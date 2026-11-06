const { PGlite } = require("@electric-sql/pglite"),
  fs = require("node:fs"),
  assert = require("node:assert/strict");
(async () => {
  const db = new PGlite();
  try {
    const q = async (sql, args = []) => (await db.query(sql, args)).rows;
    const g = "00000000-0000-4000-a000-000000000001",
      c = "00000000-0000-4000-a000-000000000002",
      admin = "00000000-0000-4000-a000-000000000003",
      e = "00000000-0000-4000-a000-000000000004",
      file = "00000000-0000-4000-a000-000000000005";
    await db.exec(
      "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;create policy legacy_permissive on storage.objects for all using(true) with check(true);grant usage on schema storage to authenticated,anon;grant select,insert on storage.objects to authenticated,anon;insert into storage.objects values('lb-private','somebody/art');create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select current_setting('test.jwt',true)::jsonb$$;grant usage on schema auth to public;create table public.explorers(id uuid primary key,guardian_id uuid,status text);create table public.guardian_preferences(explorer_id uuid primary key,save_memories boolean)",
    );
    for (const f of ["learn-build-platform", "open-publishing", "platform-admin"]) {
      await db.exec(fs.readFileSync("supabase/" + f + ".sql", "utf8"));
    }
    await q("insert into auth.users values($1),($2),($3)", [g, c, admin]);
    await q("insert into public.explorers values($1,$2,'active')", [e, g]);
    await q("insert into public.guardian_preferences values($1,true,false)", [e]);
    const login = async (id, isAdmin = false) => {
      await db.exec("reset role;set role authenticated");
      await q("select set_config('test.uid',$1,false),set_config('test.jwt',$2,false)", [
        id,
        JSON.stringify({ app_metadata: { moli_admin: isAdmin } }),
      ]);
    };
    await login(g);
    await assert.rejects(q("select lb_approve_apple('self approval')"), /Human content review/);
    await login(admin, true);
    await q("select lb_approve_apple('Human test review of all three orders')");
    await login(g);
    const scene = JSON.stringify([{
      id: "placed-1",
      asset: "apple-basket",
      x: 40,
      y: 60,
      size: 22,
      angle: 20,
    }]);
    assert.equal((await q("select * from storage.objects where bucket_id='lb-private'")).length, 0);
    await assert.rejects(
      q("insert into storage.objects values('lb-private','forged.pdf')"),
      /row-level security/,
    );
    const save = (rev) => q("select lb_save_world($1,$2,$3)", [e, rev, scene]);
    await assert.rejects(save(0), /Asset unavailable/);
    await assert.rejects(
      q("insert into lb_rewards(explorer,asset) values($1,'apple-basket')", [e]),
      /permission denied/,
    );
    await assert.rejects(
      q("insert into lb_recognition(program,admin_id) values('pay me',$1)", [g]),
      /permission denied/,
    );
    const attempt = (nonce, answers) =>
      q("select lb_practise($1,$2,'apple-orders-v1',$3) as r", [e, nonce, JSON.stringify(answers)]);
    assert.equal((await attempt(g, ["pear", "pain", "milk"]))[0].r.earned, false);
    for (let i = 0; i < 2; i++) assert.equal((await attempt(c, ["apple", "pomme", "apple"]))[0].r.score, 3);
    assert.equal((await attempt(admin, ["pear", "pain", "milk"]))[0].r.earned, true);
    assert.equal((await q("select * from lb_rewards")).length, 1);
    await save(0);
    await assert.rejects(save(0), /World changed/);
    await login(c);
    assert.equal((await q("select * from lb_worlds")).length, 0);
    await assert.rejects(save(1), /Explorer/);
    await assert.rejects(attempt(g, ["pear", "pain", "milk"]), /Explorer/);
    await q("select lb_apply('Young creator','Test name','My story','English','Books')");
    await assert.rejects(q("select lb_verify($1,'approved','Reviewed')", [c]), /Independent/);
    await login(admin, true);
    await q("select lb_verify($1,'approved','Reviewed')", [c]);
    await db.exec("reset role");
    await q("insert into public.lb_files values($1,$2,'private/test','application/pdf',120,now())", [
      file,
      c,
    ]);
    await login(c);
    const meta = {
      type: "PDF",
      title: "Ferry lesson",
      description: "Sketch a crossing.",
      language: "English",
      subject: "Art",
      age: "6–9",
      objectives: "Describe a place",
      duration: "10 min",
      instructions: "Read together",
      attribution: "Test creator",
      rights: "Original",
      link: "",
    };
    const id = (await q("select lb_edit(null,0,$1,$2) as id", [JSON.stringify(meta), file]))[0].id;
    await assert.rejects(
      q("select lb_edit(null,0,$1,null)", [
        JSON.stringify({ ...meta, type: "External resource", link: "javascript:alert(1)" }),
      ]),
      /HTTPS/,
    );
    const transition = (rev, status, checks = {}) =>
      q("select lb_transition($1,$2,$3,$4)", [id, rev, status, JSON.stringify(checks)]);
    await transition(1, "submitted");
    await login(c, true);
    await assert.rejects(transition(2, "under_review"), /Independent/);
    await login(admin, true);
    await transition(2, "under_review");
    await assert.rejects(transition(3, "approved"), /Check rights/);
    await transition(3, "changes_requested", { note: "Add a goal" });
    await login(c);
    await q("select lb_edit($1,4,$2,$3)", [id, JSON.stringify(meta), file]);
    await transition(5, "submitted");
    await login(admin, true);
    await transition(6, "under_review");
    await transition(
      7,
      "approved",
      Object.fromEntries(
        ["rights", "safety", "age", "culture", "quality", "technical", "privacy"].map((k) => [k, true]),
      ),
    );
    await login(g);
    assert.equal((await q("select id from lb_submissions")).length, 0);
    await login(admin, true);
    await transition(8, "published");
    await db.exec("reset role;set role anon");
    assert.equal((await q("select id from lb_submissions")).length, 1);
    await assert.rejects(q("select * from lb_files"), /permission denied/);
    console.log(
      "PostgreSQL: scoped scene save/restore, idempotent reward, non-revocation, RLS, creator verification, independent human review, revision loop and publish passed.",
    );
  } finally {
    await db.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
