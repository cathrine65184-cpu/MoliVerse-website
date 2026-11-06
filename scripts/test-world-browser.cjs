const { chromium } = require("playwright"), assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({ channel: "chrome" });
  try {
    for (const width of [1280, 390]) {
      const p = await b.newPage({ viewport: { width, height: 850 } });
      await p.goto("http://127.0.0.1:3022/create/world/");
      await p.getByRole("button", { name: "Reading chair" }).click();
      await p.getByRole("button", { name: "Duplicate", exact: true }).click();
      await p.getByRole("button", { name: "Undo", exact: true }).click();
      await p.getByRole("button", { name: "Redo", exact: true }).click();
      await p.getByRole("button", { name: /Save world/ }).click();
      await p.reload();
      await p.locator(".pv-piece").first().waitFor();
      assert.equal(await p.locator(".pv-piece").count(), 2);
      await p.getByRole("button", { name: "Play my world" }).click();
      await p.locator(".pv-piece").last().click();
      await p.getByText("Reading chair is part of your world.").waitFor();
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      console.log(width, "edit, save, reload, play passed");
      await p.close();
    }
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
