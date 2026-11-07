const {chromium}=require('playwright'),assert=require('node:assert/strict'),make=require('./platform-test-backend.cjs');
const base=process.env.PLATFORM_TEST_ORIGIN||'http://127.0.0.1:3022';
(async()=>{const api=await make(),browser=await chromium.launch({channel:'chrome'});try{
 for(const width of [1440,390]){
  await api.db.exec('delete from lb_worlds;delete from lb_rewards;delete from lb_attempts;delete from lb_vocab_events;delete from lb_room_preferences');
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});let errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://*.supabase.co/**',api.route);
  await page.addInitScript(({user,explorer})=>{localStorage.setItem('sb-fiycuwnimmhnxnaiwvud-auth-token',JSON.stringify({access_token:'test-guardian',refresh_token:'fake',expires_at:Math.floor(Date.now()/1000)+3500,user}));localStorage.setItem('moliverse-active-explorer',explorer);},{user:api.session('guardian'),explorer:api.ids.explorer});
  await page.goto(base+'/create/');await page.locator('.pv-piece').first().waitFor();assert.equal(await page.locator('.pv-piece').count(),6);
  await page.locator('.pv-assets').getByRole('button',{name:'Reading chair',exact:true}).click();assert.equal(await page.locator('.pv-piece').count(),7);
  const selected=page.locator('.pv-piece[data-picked=true]'),box=await selected.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+30,box.y+box.height/2-20,{steps:6});await page.mouse.up();
  await page.getByLabel('Size',{exact:true}).fill('24');await page.getByLabel('Turn',{exact:true}).fill('10');
  await page.getByRole('button',{name:'Learn this word',exact:true}).click();await page.getByRole('heading',{name:'une chaise',exact:true}).waitFor();
  await page.getByRole('button',{name:'Add to my words',exact:true}).click();await page.getByText('Vocabulary note saved privately.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Practise',exact:true}).click();await page.getByRole('button',{name:'a chair',exact:true}).click();await page.getByText(/Yes — une chaise/).waitFor();
  await page.getByRole('button',{name:'Review this word',exact:true}).click();await page.getByRole('button',{name:'a chair',exact:true}).click();await page.getByText(/1 discovery · 1 practice · 1 review/).waitFor();
  await page.getByRole('button',{name:'Close word card',exact:true}).click();
  await page.locator('.pv-assets').getByRole('button',{name:/Apple basket · locked/}).click();
  for(const name of ['🍎 Apple','une pomme','🍎','Check orders with Moli'])await page.getByRole('button',{name,exact:true}).click();
  await page.getByText(/3\/3 orders correct/).waitFor();await page.getByRole('button',{name:'Return to my room',exact:true}).click();
  await page.locator('.pv-assets').getByRole('button',{name:'Apple basket',exact:true}).click();
  await page.getByRole('button',{name:/Save world/}).click();await page.getByText('Private room saved to your Explorer.',{exact:true}).waitFor();
  await page.reload();await page.locator('.pv-piece').first().waitFor();assert.equal(await page.locator('.pv-piece').count(),8);
  await page.getByRole('button',{name:'Play my world',exact:true}).click();await page.locator('.pv-plane').getByRole('button',{name:'Apple basket',exact:true}).click();await page.getByRole('heading',{name:'une pomme',exact:true}).waitFor();
  await page.getByRole('button',{name:'Close word card',exact:true}).click();await page.getByText('Things in my room · 8',{exact:true}).click();await page.getByRole('button',{name:'Reading chair 7',exact:true}).click();await page.getByText(/1 discovery · 1 practice · 1 review/).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const roomBox=await page.locator('.pv-view').boundingBox();assert(roomBox.x+roomBox.width<=width,'The whole room must fit the viewport');assert.deepEqual(errors,[]);
  await page.screenshot({path:'/private/tmp/moliverse-growing-'+width+'.png',fullPage:true});await page.close();
  console.log(width+': starter room, chair movement/size/turn, vocabulary, server award, private save/reload and review passed.');
 }
 const guest=await browser.newPage({viewport:{width:390,height:844}});await guest.route('https://*.supabase.co/**',r=>r.abort());await guest.goto(base+'/create/');await guest.locator('.pv-piece').first().waitFor();await guest.getByRole('button',{name:/Save world/}).click();await guest.reload();await guest.locator('.pv-piece').first().waitFor();assert.equal(await guest.locator('.pv-piece').count(),6);
 await guest.goto(base+'/explore/');await guest.getByLabel('Learning language').selectOption('French');assert.equal(await guest.getByText('Morning at the little bakery',{exact:true}).count(),0);await guest.getByRole('link',{name:/Moli’s Journey/}).click();await guest.waitForURL('**/moli-journey/');await guest.getByRole('button',{name:/开始游戏/}).click();
 console.log('Guest room persistence and original China role-play entry passed.');
}finally{await browser.close();await api.close()}})().catch(e=>{console.error(e);process.exitCode=1});
