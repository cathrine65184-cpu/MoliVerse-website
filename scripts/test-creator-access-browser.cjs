// Isolated browser sessions; no real accounts, model calls or verification grants.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 const base=process.env.CREATOR_TEST_ORIGIN||'http://127.0.0.1:3022';
 try{
 for(const state of ['signed_out','unverified','pending','restricted','eligible','profile_required','error']){
  const page=await browser.newPage({viewport:{width:390,height:844}});let access=state,requested=0,ai=0;
  if(state!=='signed_out')await page.addInitScript(()=>localStorage.setItem('sb-fiycuwnimmhnxnaiwvud-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3500,user:{id:'00000000-0000-4000-a000-000000000001',role:'authenticated',app_metadata:{},user_metadata:{}}})));
  await page.route('https://*.supabase.co/**',async r=>{
   const url=r.request().url();
   if(url.includes('/rpc/cm_access_status'))return r.fulfill(state==='error'?{status:503,json:{message:'fixture failure'}}:{json:access});
   if(url.includes('/rpc/cm_request_verification')){requested++;access='pending';assert.equal(r.request().postDataJSON().adult_declared,true);return r.fulfill({json:access})}
   if(url.includes('/functions/'))ai++;
   return r.fulfill({json:{}});
  });
  await page.goto(base+'/teach/studio/?mode=young-creator');
  const heading={signed_out:'A little idea can become something meaningful.',unverified:'Complete Verification',pending:'Your adult check is pending.',restricted:'This account cannot open adult creator tools.',eligible:'Let’s shape your idea.',profile_required:'Finish your creator account.'}[state];
  if(state==='error')await page.getByRole('button',{name:'Retry access check'}).waitFor();else await page.getByRole('heading',{name:heading,exact:true}).waitFor();
  assert.equal(ai,0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(state==='unverified'){
   assert.equal(await page.getByRole('button',{name:'Request adult verification'}).isEnabled(),false);
   await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Request adult verification'}).click();await page.getByRole('heading',{name:'Your adult check is pending.'}).waitFor();assert.equal(requested,1);assert.equal(ai,0);
  }
  if(state==='signed_out'){
   await page.getByRole('link',{name:'Create Creator Account'}).click();
   await page.getByRole('radio').nth(1).waitFor();assert.equal(await page.getByRole('radio').nth(1).isChecked(),true);
  }
  await page.close();console.log('Access UI: '+state+' passed');
 }
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});await page.goto(base+'/teach/');
  assert.equal(await page.locator('.creator-start-card').count(),3);assert.equal(await page.getByText('Make a story world',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.creator-start').screenshot({path:'/private/tmp/moliverse-creator-home-'+width+'.png'});await page.close();
 }
 console.log('Creator homepage: three responsive paths, teacher story-board CTA removed.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
