const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  make = require("./platform-test-backend.cjs");
const base = process.env.PLATFORM_TEST_ORIGIN || "http://127.0.0.1:3022";
(async () => {
  const api = await make(),
    native = global.fetch,
    b = await chromium.launch({ channel: "chrome" });
  let current;
  try {
    let modelCalls = 0;
    global.fetch = async (u, init) => {
      if (String(u) !== "https://api.deepseek.com/chat/completions") {
        return native(u, init);
      }
      modelCalls++;
      const body = JSON.parse(init.body);
      return Response.json({
        choices: [{
          message: {
            content: JSON.stringify({
              reply: body.messages.length > 3
                ? "Yes, let’s practise une pomme together."
                : "In French, an apple is une pomme. Would you like to practise?",
              tool: body.messages.length > 3
                ? "create_practice"
                : "lookup_vocabulary",
              entryId: "fr-apple-v1",
            }),
          },
        }],
      });
    };
    async function page(name, width) {
      const p = await b.newPage({ viewport: { width, height: 1000 } });
      current = p;
      p.setDefaultTimeout(12000);
      await p.route("https://*.supabase.co/**", api.route);
      if (name) {
        await p.addInitScript(({ user, explorer, name }) => {
          localStorage.setItem(
            "sb-fiycuwnimmhnxnaiwvud-auth-token",
            JSON.stringify({
              access_token: "test-" + name,
              refresh_token: "fake",
              token_type: "bearer",
              expires_at: Math.floor(Date.now() / 1000) + 3500,
              expires_in: 3600,
              user,
            }),
          );
          localStorage.setItem("moliverse-active-explorer", explorer);
        }, { name, user: api.session(name), explorer: api.ids.explorer });
      }
      return p;
    }
    for (const width of [1440, 390]) {
      const p = await page(null, width);
      await p.goto(base + "/meet-moli/");
      await p.getByRole("button", { name: "Explore apple", exact: true })
        .click();
      await p.getByRole("heading", { name: "une pomme", exact: true })
        .waitFor();
      await p.getByRole("button", { name: "Add to my words", exact: true })
        .click();
      await p.getByRole("button", { name: "Practise", exact: true }).click();
      await p.getByRole("button", { name: "an apple", exact: true }).click();
      await p.getByText(/You practised recognising it/).waitFor();
      await p.getByLabel("Ask Moli a language question").fill(
        "How do I say cat?",
      );
      await p.getByRole("button", { name: "Send question" }).click();
      await p.getByRole("heading", { name: "un chat", exact: true }).waitFor();
      await p.reload();
      await p.getByRole("heading", { name: "un chat", exact: true }).waitFor();
      await p.getByRole("button", { name: /My words to revisit/ }).click();
      await p.getByRole("button", { name: "une pomme →", exact: true }).click();
      await p.getByText("Try to remember:", { exact: false }).waitFor();
      assert.equal(modelCalls, 0);
      assert.equal(
        await p.evaluate(() =>
          document.documentElement.scrollWidth > innerWidth
        ),
        false,
      );
      assert.equal(await p.getByText("Offline word guide · no AI request").count(), 1);
      await p.screenshot({
        path: "/private/tmp/meet-moli-" + width + ".png",
        fullPage: true,
      });
      await p.close();
      console.log(
        width,
        "offline word → practice → save/reload → review, no AI calls and no overflow passed",
      );
    }
    const p = await page("guardian", 1280);
    await p.goto(base + "/meet-moli/");
    await p.getByText("Live AI help · DeepSeek").waitFor();
    await p.getByLabel("Ask Moli a language question").fill(
      "How do I say apple?",
    );
    await p.getByRole("button", { name: "Send question" }).click();
    await p.getByText("Conversation saved privately to your account.", {
      exact: true,
    }).waitFor();
    await p.getByLabel("Ask Moli a language question").fill(
      "Let’s practise it.",
    );
    await p.getByRole("button", { name: "Send question" }).click();
    await p.getByText("Yes, let’s practise une pomme together.", {
      exact: true,
    }).waitFor();
    await p.reload();
    await p.getByText("Yes, let’s practise une pomme together.", {
      exact: true,
    }).waitFor();
    assert.equal(modelCalls, 2);
    await p.getByText("Live AI help · DeepSeek").waitFor();
    await p.getByRole("link", { name: /Practise French fruit orders/ }).click();
    await p.getByText("Order 1:", { exact: false }).waitFor();
    await p.getByRole("button", { name: "🍎 Apple", exact: true }).click();
    await p.getByRole("button", { name: "une pomme", exact: true }).click();
    await p.getByRole("button", { name: "🍎", exact: true }).click();
    await p.getByRole("button", { name: "Check orders with Moli", exact: true })
      .click();
    await p.getByText(/3\/3 orders correct/).waitFor();
    await p.getByRole("button", { name: "Return to my room", exact: true })
      .click();
    await p.getByRole("button", { name: "Little cat", exact: true }).click();
    await p.getByRole("button", { name: /Save world/ }).click();
    await p.getByText("Private room saved to your Explorer.", { exact: true })
      .waitFor();
    console.log(
      "Guardian: mocked provider multi-turn → private save/reload → approved reward → animal decoration and real SQL save passed.",
    );
    await p.close();
    const denied = await page("creator", 390);
    await denied.goto(base + "/meet-moli/");
    await denied.getByText(/Could not open this Explorer/).waitFor();
    assert.equal(await denied.getByText("Offline word guide · no AI request").count(), 1);
    await denied.close();
    const blocked = await page(null, 390);
    await blocked.addInitScript(() => {
      Storage.prototype.getItem = function () {
        throw Error("blocked");
      };
      Storage.prototype.setItem = function () {
        throw Error("blocked");
      };
    });
    await blocked.goto(base + "/meet-moli/");
    await blocked.getByRole("button", { name: "Explore rabbit", exact: true })
      .click();
    await blocked.getByRole("heading", { name: "un lapin", exact: true })
      .waitFor();
    await blocked.close();
  } catch (e) {
    if (current && !current.isClosed()) {
      await current.screenshot({
        path: "/private/tmp/meet-moli-failure.png",
        fullPage: true,
      });
    }
    throw e;
  } finally {
    global.fetch = native;
    await b.close();
    await api.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
