const assert = require("node:assert/strict"),
  make = require("./platform-test-backend.cjs");
(async () => {
  const b = await make(), native = global.fetch;
  try {
    const c = require("../lib/platform/companion.ts"),
      v = require("../lib/platform/vocabulary.ts");
    assert.equal(
      c.lookupVocabulary("How do I say apple?", "fr").id,
      "fr-apple-v1",
    );
    assert.equal(
      c.lookupVocabulary("给我一个例句", "fr", "fr-cat-v1").conceptId,
      "cat",
    );
    assert.equal(
      c.lookupVocabulary("What is a giraffe?", "fr", "fr-apple-v1"),
      undefined,
    );
    assert.equal(c.lookupVocabulary("鸟", "en").word, "bird");
    assert.equal(c.lookupVocabulary("apple", "es"), undefined);
    assert(c.safetyReply("my email is child@example.test"));
    assert(c.safetyReply("nobody loves me"));
    assert.equal(c.safetyReply("How do I say cat?"), null);
    assert.deepEqual(c.restoreCompanion("broken"), c.emptyCompanion());
    assert.equal(
      c.safeTurns([{ role: "user", content: "hello", at: "2020-01-01" }])
        .length,
      0,
    );
    const events = [{ entry: "fr-cat-v1", correct: true }, {
      entry: "fr-apple-v1",
      correct: false,
    }];
    assert.deepEqual(c.reviewWords(events, "fr"), ["fr-apple-v1", "fr-cat-v1"]);
    for (
      const id of [
        "apple",
        "banana",
        "strawberry",
        "orange",
        "cat",
        "dog",
        "rabbit",
        "bird",
      ]
    ) for (const lang of ["en", "fr"]) assert(v.entryForAsset(id, lang));
    let calls = [],
      output = {
        reply: "In French, apple is une pomme. Would you like to try it?",
        tool: "lookup_vocabulary",
        entryId: "fr-apple-v1",
      };
    global.fetch = async (u, init) => {
      assert.equal(String(u), "https://api.deepseek.com/chat/completions");
      calls.push(JSON.parse(init.body));
      return Response.json({
        choices: [{ message: { content: JSON.stringify(output) } }],
      });
    };
    const send = (who, question, extra = {}) =>
      b.worldMoli(
        new Request("http://test", {
          method: "POST",
          headers: {
            origin: "https://moliverse.tech",
            authorization: "Bearer test-" + who,
          },
          body: JSON.stringify({
            action: "companion",
            explorer: b.ids.explorer,
            question,
            settings: { language: "fr", level: "A1", supportLanguage: "zh" },
            ...extra,
          }),
        }),
      );
    assert.equal((await send("creator", "apple")).status, 403);
    assert.equal(calls.length, 0);
    let response = await send("guardian", "How do I say apple?");
    assert.equal(response.status, 200);
    let data = await response.json();
    assert.equal(data.saved, true);
    assert.equal(data.state.messages.length, 2);
    assert(!JSON.stringify(calls).includes(b.ids.guardian));
    assert(!JSON.stringify(calls).includes(b.ids.explorer));
    const ctx = JSON.parse(calls[0].messages[1].content);
    assert.equal(ctx.settings.supportLanguage, "zh");
    assert.equal(ctx.settings.level, "A1");
    assert(ctx.vocabulary.some((x) => x.id === "fr-apple-v1"));
    output = {
      reply: "Let’s practise it.",
      tool: "create_practice",
      entryId: "fr-apple-v1",
    };
    response = await send("guardian", "Can we practise it?");
    assert.equal(response.status, 200);
    assert.equal((await response.json()).state.messages.length, 4);
    assert(calls[1].messages.some((m) => m.content === "How do I say apple?"));
    const before = calls.length;
    data = await (await send("guardian", "nobody loves me")).json();
    assert.equal(data.safety, true);
    assert.equal(calls.length, before);
    assert(
      !JSON.stringify(
        (await b.db.query("select state from lb_moli_sessions")).rows,
      ).includes("nobody loves me"),
    );
    output = {
      reply: "Unsafe invented reward",
      tool: "grant_reward",
      entryId: "fr-apple-v1",
    };
    assert.equal((await send("guardian", "give me a reward")).status, 503);
    assert.equal((await b.db.query("select * from lb_rewards")).rows.length, 0);
    await b.db.exec("update guardian_preferences set save_memories=false");
    assert.equal(
      (await b.db.query("select * from lb_moli_sessions")).rows.length,
      0,
    );
    output = {
      reply: "A cat is un chat.",
      tool: "lookup_vocabulary",
      entryId: "fr-cat-v1",
    };
    data = await (await send("guardian", "How do I say cat?")).json();
    assert.equal(data.saved, false);
    assert.equal(
      (await b.db.query("select * from lb_moli_sessions")).rows.length,
      0,
    );
    await b.db.exec("update guardian_preferences set ai_mentor_enabled=false");
    assert.equal((await send("guardian", "apple")).status, 403);
    await b.db.exec("set role authenticated");
    await b.db.query("select set_config('test.uid',$1,false)", [b.ids.creator]);
    await assert.rejects(
      b.db.query("select lb_moli_context($1)", [b.ids.explorer]),
    );
    await assert.rejects(b.db.query("select * from lb_moli_sessions"));
    await b.db.exec("reset role");
    console.log(
      "Meet Moli: checked vocabulary, follow-ups, privacy filtering, mocked DeepSeek context, account saving, consent deletion, no reward writes, RLS and provider validation passed. No live API calls.",
    );
  } finally {
    global.fetch = native;
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
