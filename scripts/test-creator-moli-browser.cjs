/* Optional: serve the static export, provide Playwright via NODE_PATH. All model/auth traffic is mocked. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const {handler}=require('./test-creator-moli.cjs');
(async()=>{
 const b=await chromium.launch({channel:'chrome'});try{
 const base=process.env.CREATOR_TEST_ORIGIN||'http://127.0.0.1:3022';
 for(const width of [1300,390]){
 const page=await b.newPage({viewport:{width,height:850}});let errors=[];
 page.on('pageerror',e=>errors.push(e.message));const user={id:'00000000-0000-4000-a000-000000000001',aud:'authenticated',role:'authenticated',app_metadata:{creator_moli_adult:true},user_metadata:{}};
 await page.addInitScript(user=>{localStorage.setItem('sb-fiycuwnimmhnxnaiwvud-auth-token',JSON.stringify({access_token:'ok',refresh_token:'test',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3500,token_type:'bearer',user}))},user);
 await page.route('https://*.supabase.co/**',async route=>{
 const url=route.request().url();
 if(url.includes('/functions/v1/creator-moli')){
 const r=await handler(new Request(url,{method:route.request().method(),headers:route.request().headers(),body:route.request().postData()||undefined}));
 await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers.entries()),body:await r.text()});
 }else await route.fulfill({json:user});});
 await page.goto(base+'/teach/creator/');
 const name='Ferry notebook '+width;
 await page.getByLabel('New project').fill(name);await page.getByRole('button',{name:'Start notebook'}).click();await page.getByLabel('Your idea').fill('My aunt taught me to sketch on the ferry.');
 await page.getByRole('button',{name:'Send to Moli'}).click();await page.getByText('What do you remember?',{exact:false}).first().waitFor();
 if(width<760)await page.getByRole('button',{name:'Idea board & draft'}).click();
 await page.getByRole('button',{name:'Review suggestion'}).click();await page.getByRole('textbox',{name:'Topic',exact:true}).fill('Sketching from the ferry');await page.getByRole('button',{name:'Confirm',exact:true}).click();
 await page.getByRole('button',{name:'Suggest an outline'}).click();await page.getByLabel('Title',{exact:true}).fill('An artist on the ferry',{timeout:6000}).catch(async e=>{throw Error(e.message+"\n"+(await page.locator('body').innerText()).slice(-2500))});await page.getByRole('button',{name:'Save new version'}).click();
 await page.getByText('Private · saved version 1').waitFor();await page.reload();
 if(width<760)await page.getByRole('button',{name:'Idea board & draft'}).click();
 await page.getByText('Private · saved version 1').waitFor();
 await page.getByRole('button',{name:'Ask Moli to review saved draft'}).click();await page.getByText('Moli’s review · v1').waitFor();
 await page.getByRole('button',{name:'Submit saved version for human review'}).click();
 await page.getByText('Submitted for human review · not published').waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log('Creator workspace passed at '+width+'px (local doubles)');
 }
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
