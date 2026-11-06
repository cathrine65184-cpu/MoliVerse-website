const assert = require("node:assert/strict"),
  bridge = require("./platform-test-backend.cjs"),
  sharp = require("../services/platform-media/node_modules/sharp");
(async () => {
  const b = await bridge();
  try {
    const call = (token, payload) =>
      b.handler(
        new Request("http://test", {
          method: "POST",
          headers: { origin: "https://moliverse.tech", authorization: "Bearer test-" + token },
          body: JSON.stringify(payload),
        }),
      );
    const input = {
      action: "art",
      explorer: b.ids.explorer,
      name: "Tree drawing",
      category: "Nature",
      mime: "image/png",
      data:
        (await sharp({ create: { width: 96, height: 72, channels: 3, background: "green" } }).withMetadata()
          .png().toBuffer()).toString("base64"),
    };
    assert.equal((await call("creator", input)).status, 403);
    const ok = await call("guardian", input);
    assert.equal(ok.status, 200, await ok.clone().text());
    assert.equal((await call("creator", { action: "asset_urls", explorer: b.ids.explorer })).status, 403);
    assert.equal((await call("guardian", { action: "asset_urls", explorer: b.ids.explorer })).status, 200);
    assert.equal(
      (await call("guardian", {
        ...input,
        mime: "image/webp",
        data: Buffer.from("<svg onload=alert(1)>").toString("base64"),
      })).status,
      422,
    );
    assert.equal(
      (await call("guardian", { ...input, action: "generate", idea: "a pink bakery" })).status,
      503,
    );
    assert.equal(
      (await call("guardian", { ...input, ticket: "forged", expires: Date.now() + 10000 })).status,
      403,
    );
    await b.db.query("update guardian_preferences set artwork_uploads=false");
    assert.equal((await call("guardian", input)).status, 403);
    console.log(
      "D: media ownership, active consent, private thumbnail signing, spoof refusal, generated provenance and unavailable provider passed (local adapters).",
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
