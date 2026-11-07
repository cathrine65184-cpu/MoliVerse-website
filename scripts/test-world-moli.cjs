const assert = require("node:assert/strict"), make = require("./platform-test-backend.cjs");
(async () => {
  const b = await make();
  try {
    const calls = [], fetch = global.fetch;
    global.fetch = (u, init) => {
      if (String(u) !== "https://api.deepseek.com/chat/completions") return fetch(u, init);
      calls.push(JSON.parse(init.body));
      return Response.json({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: "Try a reading corner with a chair.",
              suggestAsset: "apple-basket",
              example: "An unreviewed invented example.",
            }),
          },
        }],
      });
    };
    const send = (who, q, extra={}) =>
      b.worldMoli(
        new Request("http://test", {
          method: "POST",
          headers: { origin: "https://moliverse.tech", authorization: "Bearer test-" + who },
          body: JSON.stringify({ explorer: b.ids.explorer, question: q, selected: "book", ...extra }),
        }),
      );
    assert.equal((await send("creator", "Help me learn about stories")).status, 403);
    assert.equal(calls.length, 0);
    const r = await send("guardian", "Help me learn about stories");
    assert.equal(r.status, 200);
    assert.equal((await r.json()).suggestAsset, null);
    assert.equal(calls.length, 1);
    assert.equal(JSON.stringify(calls[0]).includes(b.ids.explorer), false);
    assert.equal((await b.db.query("select * from lb_rewards")).rows.length, 0);
    assert.equal((await b.db.query("select * from lb_worlds")).rows.length, 0);
    const word=await send("guardian","Choose an example",{selected:"chair",language:"fr",action:"vocabulary-example"});
    assert.equal((await word.json()).reply,"Voici une chaise.");
    const context=JSON.parse(calls[1].messages[1].content);
    assert.equal(context.vocabulary.word,"une chaise");
    assert.deepEqual(context.vocabulary.allowedExamples,["Voici une chaise.","La chaise est ici."]);
    await b.db.exec("update guardian_preferences set ai_mentor_enabled=false");
    assert.equal((await send("guardian", "Help me")).status, 403);
    assert.equal(calls.length, 2);
    console.log(
      "Child Moli: scoped permission, grounded context, no IDs in model request, non-free proposal refused, no auto-edit/reward, revoked access passed (mock model).",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
