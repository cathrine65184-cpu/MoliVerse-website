/* Browser-test bridge, never imported by the site. Real migration SQL and RPCs;
   synthetic Auth, PostgREST transport and Storage, real media handler + decoder,
   scanner test double. No production variables or external calls. */
const { PGlite } = require("@electric-sql/pglite"),
  fs = require("node:fs"),
  ts = require("typescript"),
  Module = require("node:module");
const ids = {
  guardian: "00000000-0000-4000-a000-000000000001",
  creator: "00000000-0000-4000-a000-000000000002",
  admin: "00000000-0000-4000-a000-000000000003",
  explorer: "00000000-0000-4000-a000-000000000004",
};
module.exports = async function backend() {
  const db = new PGlite(),
    blobs = new Map(),
    tokens = new Map(),
    session = (name) => ({
      id: ids[name],
      aud: "authenticated",
      role: "authenticated",
      app_metadata: { moli_admin: name === "admin" },
      user_metadata: {},
    });
  for (const name of ["guardian", "creator", "admin"]) tokens.set("test-" + name, session(name));
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;create policy legacy_permissive on storage.objects for all using(true) with check(true);grant usage on schema storage to authenticated,anon;grant select,insert on storage.objects to authenticated,anon;insert into storage.objects values('lb-private','somebody/art');create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select current_setting('test.jwt',true)::jsonb$$;grant usage on schema auth to public;create table public.explorers(id uuid primary key,guardian_id uuid,status text);create table public.guardian_preferences(explorer_id uuid primary key,save_memories boolean,ai_mentor_enabled boolean)",
  );
  for (const f of ["learn-build-platform", "open-publishing", "platform-admin", "growing-world", "meet-moli-assets", "growing-world-vocabulary-seed", "meet-moli"]) {
    await db.exec(fs.readFileSync("supabase/" + f + ".sql", "utf8"));
  }
  await db.query("insert into auth.users values($1),($2),($3)", [ids.guardian, ids.creator, ids.admin]);
  await db.exec("grant select on explorers,guardian_preferences to service_role");
  await db.exec(
    "grant select on explorers,guardian_preferences to authenticated;alter table explorers enable row level security;alter table guardian_preferences enable row level security;create policy explorer_read on explorers for select using (guardian_id=auth.uid());create policy pref_read on guardian_preferences for select using(exists(select 1 from explorers where id=explorer_id and guardian_id=auth.uid()))",
  );
  await db.query("insert into explorers values($1,$2,'active')", [ids.explorer, ids.guardian]);
  await db.query("insert into guardian_preferences values($1,true,true,true)", [ids.explorer]);
  await db.query(
    "insert into lb_creators(id,kind,name,bio,languages,interests,status) values($1,'Professional educator','Fixture teacher','Test profile','French','Stories','approved')",
    [ids.creator],
  );
  const sqlName = (s) => {
    if (!/^[a-z_]+$/.test(s)) throw Error("bad identifier");
    return s;
  };
  const exec = (token, sql, args = []) =>
    db.transaction(async (tx) => {
      const user = tokens.get(token);
      await tx.exec("set local role " + (token === "svc" ? "service_role" : user ? "authenticated" : "anon"));
      await tx.query("select set_config('test.uid',$1,true),set_config('test.jwt',$2,true)", [
        user?.id || "",
        JSON.stringify({ app_metadata: user?.app_metadata || {} }),
      ]);
      return (await tx.query(sql, args)).rows;
    });
  const rpc = async (token, fn, args) => {
    const values = Object.values(args).map((v) => v && typeof v === "object" ? JSON.stringify(v) : v);
    return (await exec(
      token,
      "select " + sqlName(fn) + "(" +
        Object.keys(args).map((k, i) => sqlName(k) + " => $" + (i + 1)).join(",") + ") as v",
      values,
    ))[0].v;
  };
  function client(token) {
    return {
      auth: { getUser: async (t) => ({ data: { user: tokens.get(t || token) || null } }) },
      rpc: async (fn, args = {}) => {
        try {
          return { data: await rpc(token, fn, args) };
        } catch (e) {
          return { error: e };
        }
      },
      from: (table) => {
        let cols = "*", filters = [], insert;
        const run = async () => {
          try {
            if (insert) {
              const keys = Object.keys(insert);
              await exec(
                token,
                "insert into " + sqlName(table) + "(" + keys.map(sqlName) + ") values(" + keys.map((_, i) =>
                  "$" + (i + 1)
                ) + ")",
                Object.values(insert),
              );
              return { data: null };
            }
            return {
              data: await exec(
                token,
                "select " + (cols === "*" ? "*" : cols.split(",").map(sqlName).join(",")) + " from " +
                  sqlName(table) + (filters.length
                    ? " where " + filters.map(([k], i) =>
                      sqlName(k) + "=$" + (i + 1)
                    ).join(" and ")
                    : ""),
                filters.map((f) => f[1]),
              ),
            };
          } catch (e) {
            return { error: e };
          }
        };
        const chain = {
          select: (s) => (cols = s, chain),
          eq: (k, v) => (filters.push([k, v]), chain),
          order: () => chain,
          limit: () => chain,
          insert: (v) => (insert = v, chain),
          maybeSingle: async () => {
            const r = await run();
            return { ...r, data: r.data?.[0] };
          },
          single: async () => chain.maybeSingle(),
          then: (yes, no) => run().then(yes, no),
        };
        return chain;
      },
      storage: {
        from: () => ({
          upload: async (p, b) => {
            blobs.set(p, Buffer.from(b));
            return {};
          },
          remove: async (paths) => {
            for (const p of paths) blobs.delete(p);
            return {};
          },
          createSignedUrl: async (p) => ({ data: { signedUrl: "https://files.example.test/" + p } }),
        }),
      },
    };
  }
  let handler;
  global.Deno = {
    serve: (fn) => handler = fn,
    env: {
      get: (k) =>
        ({
          SUPABASE_URL: "https://fake.local",
          SUPABASE_SERVICE_ROLE_KEY: "svc",
          SUPABASE_ANON_KEY: "anon",
          DEEPSEEK_KEY: "test-only",
          MEDIA_WORKER_URL: "https://worker.test",
          MEDIA_WORKER_TOKEN: "x".repeat(40),
        })[k],
    },
  };
  const nativeLoad = Module._load;
  Module._load = function (req, ...rest) {
    if (req === "https://esm.sh/@supabase/supabase-js@2") {
      return {
        createClient: (_url, key, opt) =>
          client(key === "svc" ? "svc" : (opt.global?.headers?.Authorization || "").replace("Bearer ", "")),
      };
    }
    return nativeLoad.call(this, req, ...rest);
  };
  require.extensions[".ts"] = (m, f) =>
    m._compile(
      ts.transpileModule(fs.readFileSync(f, "utf8"), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
      }).outputText,
      f,
    );
  require("../supabase/functions/world-moli/index.ts");
  const worldMoli = handler;
  require("../supabase/functions/platform-media/index.ts");
  Module._load = nativeLoad;
  const { processFile } = await import("../services/platform-media/process.mjs"), nativeFetch = global.fetch;
  global.fetch = (url, init) =>
    String(url).startsWith("https://worker.test/")
      ? processFile(
        Buffer.from(init.body),
        init.headers["Content-Type"],
        init.headers["X-Art"] === "1",
        async () => {},
      ).then((x) => Response.json(x), () => new Response(null, { status: 422 }))
      : nativeFetch(url, init);
  async function route(r) {
    const req = r.request(),
      u = new URL(req.url()),
      token = (req.headers().authorization || "").replace("Bearer ", "");
    try {
      if (u.hostname === "files.example.test") {
        const b = blobs.get(u.pathname.slice(1));
        return r.fulfill({
          status: b ? 200 : 404,
          headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/pdf" },
          body: b || "",
        });
      }
      if (u.pathname.includes("/functions/v1/platform-media")) {
        const res = await handler(
          new Request(u, { method: "POST", headers: req.headers(), body: req.postData() }),
        );
        return r.fulfill({ status: res.status, json: await res.json() });
      }
      if (u.pathname.includes("/functions/v1/world-moli")) {
        const res=await worldMoli(new Request(u,{method:"POST",headers:req.headers(),body:req.postData()}));
        return r.fulfill({status:res.status,json:await res.json()});
      }
      if (u.pathname.startsWith("/auth/")) return r.fulfill({ json: tokens.get(token) || {} });
      const table = u.pathname.split("/").pop();
      if (u.pathname.includes("/rpc/")) {
        return r.fulfill({ json: await rpc(token, table, req.postDataJSON() || {}) });
      }
      let args = [], filters = [];
      for (const [k, v] of u.searchParams) {
        if (v.startsWith("eq.")) {
          args.push(v.slice(3));
          filters.push(sqlName(k) + "=$" + args.length);
        }
        if (v.startsWith("in.")) {
          const set = v.slice(4, -1).split(",").map((x) => x.replaceAll('"', ""));
          filters.push(
            sqlName(k) + " in (" + set.map((x) => (args.push(x), "$" + args.length)).join(",") + ")",
          );
        }
        if (k === "or" && v.startsWith("(source.eq.official,explorer.eq.")) {
          args.push(v.slice(32, -1));
          filters.push("(source='official' or explorer=$" + args.length + "::uuid)");
        }
      }
      const cols = (u.searchParams.get("select") || "id").split(",").map(sqlName).join(",");
      const data = await exec(
        token,
        "select " + cols + " from " + sqlName(table) +
          (filters.length ? " where " + filters.join(" and ") : ""),
        args,
      );
      return r.fulfill({
        status: 200,
        headers: { "content-range": "0-" + Math.max(0, data.length - 1) + "/" + data.length },
        json: req.headers().accept?.includes("vnd.pgrst.object") ? data[0] || null : data,
      });
    } catch (e) {
      return r.fulfill({ status: 400, json: { message: e.message } });
    }
  }
  await rpc("test-admin", "lb_approve_apple", {
    check_note: "Explicit approval in isolated test fixtures only.",
  });
  return {
    ids,
    session,
    route,
    handler,
    worldMoli,
    db,
    blobs,
    close: async () => {
      global.fetch = nativeFetch;
      await db.close();
    },
  };
};
