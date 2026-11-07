// Isolated guests. Abort remote services: no AI requests, real accounts or private materials.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.CULTURE_TEST_ORIGIN||'http://127.0.0.1:3022';
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],ai=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://*.supabase.co/**',route=>{if(route.request().url().includes('/functions/'))ai.push(route.request().url());return route.abort()});
  const noOverflow=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto(base+'/');await page.getByRole('link',{name:/Culture Weekly/}).click();
  await page.getByRole('heading',{name:'Culture Weekly',exact:true}).waitFor();await noOverflow();
  await page.getByRole('link',{name:'Open this issue →'}).click();
  await page.getByRole('heading',{name:'What “Peace” in Ukraine Might Look Like',exact:true}).waitFor();
  assert.equal(await page.locator('.weekly-article img').count(),0);
  const word=page.locator('details').filter({has:page.locator('summary',{hasText:'ceasefire'})});
  await word.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await word.evaluate(e=>e.open),true);
  await page.getByRole('link',{name:'Read the background source ↓'}).click();
  assert.match(page.url(),/#un-glossary$/);await noOverflow();
  await page.goto(base+'/culture/peace-in-ukraine/');
  await page.screenshot({path:'/private/tmp/moliverse-culture-'+width+'.png',fullPage:true});
  await page.getByRole('link',{name:'Explore a learning activity →'}).click();
  await page.getByLabel('Learning language').selectOption('French');
  await page.getByRole('link',{name:/Moli’s Journey/}).waitFor();
  await page.getByLabel('Find an adventure').fill('nothing-matches-this');await page.getByText(/No adventures match yet/).waitFor();
  await page.getByLabel('Find an adventure').fill('China');await noOverflow();
  await page.getByRole('link',{name:/Moli’s Journey/}).click();
  await page.getByRole('button',{name:/开始游戏/}).waitFor();
  assert.deepEqual(errors,[]);assert.deepEqual(ai,[]);await context.close();
  console.log(width+': home → weekly → vocabulary/source; plaza French/search → original China role-play passed.');
 }}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
