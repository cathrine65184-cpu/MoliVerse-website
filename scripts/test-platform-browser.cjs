const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  makeBackend = require("./platform-test-backend.cjs");
const base = process.env.PLATFORM_TEST_ORIGIN || "http://127.0.0.1:3022";
(async () => {
  const api = await makeBackend(), b = await chromium.launch({ channel: "chrome" });
  let current;
  try {
    async function page(name, width = 1300) {
      const p = await b.newPage({ viewport: { width, height: 850 } });
      current = p;
      p.setDefaultTimeout(9000);
      await p.route("https://*.supabase.co/**", api.route);
      await p.route("https://files.example.test/**", api.route);
      if (name) {
        await p.addInitScript(({ name, user, explorer }) => {
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
          if (name === "guardian") localStorage.setItem("moliverse-active-explorer", explorer);
        }, { name, user: api.session(name), explorer: api.ids.explorer });
      }
      return p;
    }
    const button = (p, name) => p.getByRole("button", { name, exact: true });
    const learner = await page("guardian", 390);
    await learner.goto(base + "/create/world/");
    await button(learner, "French fruit orders").click();
    await button(learner, "🍎 Apple").click();
    await button(learner, "une pomme").click();
    await button(learner, "🍎").click();
    await button(learner, "Check orders with Moli").click();
    await learner.getByText(/3\/3 orders correct/).waitFor();
    await button(learner, "Apple basket").click();
    await learner.getByLabel("size", { exact: true }).fill("35");
    await learner.getByLabel("x", { exact: true }).fill("65");
    await learner.getByLabel("angle", { exact: true }).fill("15");
    await learner.getByRole("button", { name: /Save world/ }).click();
    await learner.getByText("Private room saved to your Explorer.").waitFor();
    await learner.reload();
    await learner.locator(".pv-piece").waitFor();
    assert.equal(await learner.locator(".pv-piece").evaluate((el) => el.style.width), "35%");
    await button(learner, "Play my world").click();
    await button(learner, "Apple basket").click();
    await learner.getByText(/Une pomme · an apple/).waitFor();
    console.log(
      "A: three server-scored answers → earned basket → positioned/resized/rotated → saved and restored → play vocabulary card",
    );
    const creator = await page("creator");
    await creator.goto(base + "/teach/share/");
    await creator.getByText("New draft", { exact: true }).waitFor();
    await button(creator, "Continue").click();
    // Original one-page blank PDF with a valid xref table; never uses a real teacher file.
    let pdf = "%PDF-1.4\n", offsets = [0];
    for (
      const [i, o] of [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 240 180] /Resources <<>> >>",
      ].entries()
    ) {
      offsets.push(pdf.length);
      pdf += (i + 1) + " 0 obj\n" + o + "\nendobj\n";
    }
    const table = pdf.length;
    pdf += "xref\n0 4\n0000000000 65535 f \n" + offsets.slice(1).map((x) =>
      String(x).padStart(10, "0") + " 00000 n \n"
    ).join("") + "trailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n" + table + "\n%%EOF\n";
    await creator.locator("input[type=file]").setInputFiles({
      name: "drawing-page.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(pdf),
    });
    await creator.getByText(/Validated private attachment/).waitFor();
    await button(creator, "Continue").click();
    for (
      const [key, val] of Object.entries({
        title: "The sketchbook ferry",
        description: "Draw a place you know.",
        language: "French",
        subject: "Art",
        "Intended age group": "6–9",
        "Learning objectives": "Describe one place",
        "Estimated duration": "10 minutes",
        instructions: "Sketch and discuss",
        "Creator attribution": "Fixture teacher",
        "Copyright and permission declaration": "Original test PDF",
      })
    ) await creator.getByLabel(key, { exact: true }).fill(val);
    await button(creator, "Continue").click();
    await creator.getByRole("heading", { name: "The sketchbook ferry" }).waitFor();
    await button(creator, "Save private draft").click();
    await creator.getByText("Private draft saved.").waitFor();
    await button(creator, "Continue").click();
    await button(creator, "Submit for review").click();
    await creator.getByText(/Submitted for human review/).waitFor();
    const admin = await page("admin");
    await admin.goto(base + "/staff/review/");
    await button(admin, "Content review").click();
    await admin.getByRole("button", { name: /The sketchbook ferry · submitted/ }).click();
    await button(admin, "under review").click();
    await admin.getByRole("button", { name: /The sketchbook ferry · under_review/ }).click();
    for (const k of ["rights", "safety", "age", "culture", "quality", "technical", "privacy"]) {
      await admin.getByLabel("Human checked: " + k).check();
    }
    await button(admin, "approved").click();
    await admin.getByRole("button", { name: /The sketchbook ferry · approved/ }).click();
    await button(admin, "Publish approved version").click();
    await admin.getByText("Decision saved: published").waitFor();
    const visitor = await page(null);
    await visitor.goto(base + "/explore/");
    await visitor.getByRole("heading", { name: "The sketchbook ferry" }).waitFor();
    await button(visitor, "Explore experience").click();
    await button(visitor, "Start learning").click();
    const signed = await visitor.getByRole("link", { name: /Open reviewed resource/ }).getAttribute("href");
    assert(signed);
    // Chromium serves a viewer HTML wrapper for navigations to PDFs. Verify resource bytes separately.
    assert.equal(await visitor.evaluate(async (url) => (await fetch(url)).text(), signed), pdf);
    const opened = await visitor.goto(signed);
    assert.equal(opened.status(), 200);
    await visitor.goto(base + "/creators/?id=" + api.ids.creator);
    await visitor.getByRole("heading", { name: "Fixture teacher" }).waitFor();
    await visitor.getByRole("heading", { name: "The sketchbook ferry" }).waitFor();
    const anon = await page(null);
    await anon.goto(base + "/staff/review/");
    await anon.getByText("This page is unavailable.").waitFor();
    console.log(
      "B: PDF → private draft → human review → explicit publish → Plaza, profile, file access. Anonymous admin denied.",
    );
  } catch (e) {
    console.error((await current?.locator("body").innerText())?.slice(-2100));
    throw e;
  } finally {
    await b.close();
    await api.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
