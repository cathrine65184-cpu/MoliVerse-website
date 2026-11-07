/* Serve out/ locally; provide Playwright via NODE_PATH. No external service required. */
const {chromium}=require("playwright"),assert=require("node:assert/strict");
const base=process.env.BAKERY_TEST_ORIGIN||"http://127.0.0.1:3022";
(async()=>{
 const b=await chromium.launch({channel:"chrome"});try{
 for(const width of [1440,390]){
 const ctx=await b.newContext({viewport:{width,height:850},reducedMotion:width===390?"reduce":"no-preference"});
 const p=await ctx.newPage(), failures=[],ai=[];p.on("pageerror",e=>failures.push(e.message));
 await p.route("https://*.supabase.co/**",r=>{if(r.request().url().includes("/functions/"))ai.push(r.request().url());return r.abort()});
 await p.goto(base+"/learn/");await p.getByRole("link",{name:/Make & play/}).click();await p.waitForURL("**/create/");
 const free=new URL(await p.getByRole("link",{name:/Open free creation/}).getAttribute("href"),base);
 assert.equal(free.pathname,"/teach/studio/");assert.equal(free.searchParams.get("mode"),"young-creator");assert.equal(free.searchParams.get("workspace"),"learner");
 const btn=name=>p.getByRole("button",{name,exact:true});
 await btn("Open the bakery →").click();await btn("une baguette").click();await btn("un croissant").click();
 await btn("Visitor").click();await btn("Merci !").click();await p.getByText(/Nobody has handed you anything yet/).first().waitFor();
 await btn("Give me a hint").click();await btn("Bonjour !").click();await p.getByRole("heading",{name:"Dress your bakery window"}).waitFor();
 await p.getByLabel("Shop name").selectOption("La Lune Dorée");await p.getByLabel("Awning colour").selectOption("Rose");
 await p.locator("fieldset").getByRole("button",{name:"un croissant"}).click();await btn("Save my bakery").click();
 await btn("I can greet a visitor.").click();await p.reload();await btn("Open the bakery →").click();
 await p.getByRole("heading",{name:"La Lune Dorée"}).waitFor();assert.equal(await p.locator(".bakery-scene").getAttribute("data-awning"),"Rose");
 await btn("Try a new order").click();await btn("Choose the long loaf").click();await btn("Choose the curved pastry").click();
 await btn("Bonjour !").click();await btn("Choose the long loaf").click();await p.getByText(/1 review round finished/).waitFor();
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(failures,[]);assert.deepEqual(ai,[]);await btn("Start over").click();await btn("Erase and start over").click();
 assert.equal(await p.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith("moliverse:learner-create:"))),false);
 await p.screenshot({path:'/private/tmp/moliverse-bakery-'+width+'.png'});await ctx.close();console.log(width,"create, persist, revisit, review, reset passed");
 }
 const p=await b.newPage();await p.addInitScript(()=>{const write=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith("moliverse:learner-create:"))throw Error("Quota");return write.call(this,k,v)}});
 await p.goto(base+"/create/");await p.getByRole("button",{name:"Open the bakery →"}).click();await p.getByRole("button",{name:"une baguette"}).click();await p.getByText(/could not save/).waitFor();await p.getByRole("button",{name:"un croissant"}).click();await p.getByRole("button",{name:"Bonjour !"}).waitFor();
 console.log("Storage failure leaves lesson playable");
 for(const allow of [true,false]){
 const q=await b.newPage(),uid="00000000-0000-4000-a000-000000000001",explorer="00000000-0000-4000-a000-000000000002";
 await q.addInitScript(({uid,explorer})=>{
   localStorage.setItem("moliverse-active-explorer",explorer);
   localStorage.setItem("sb-fiycuwnimmhnxnaiwvud-auth-token",JSON.stringify({access_token:"test",refresh_token:"test",token_type:"bearer",expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3500,user:{id:uid,aud:"authenticated",role:"authenticated",app_metadata:{},user_metadata:{}}}));
 },{uid,explorer});
 await q.route("https://*.supabase.co/**",route=>{
   const u=new URL(route.request().url());
   if(u.pathname.endsWith("/explorers")){assert.equal(u.searchParams.get("guardian_id"),"eq."+uid);return route.fulfill({json:[{id:explorer,status:"active"}]})}
   if(u.pathname.endsWith("/guardian_preferences"))return route.fulfill({json:[{save_memories:allow}]});
   return route.abort();
 });
 await q.goto(base+"/create/");await q.getByRole("button",{name:"Open the bakery →"}).click();
 await q.getByRole("button",{name:"une baguette"}).click();await q.getByText(/1\/2 baskets/).waitFor();
 const keys=await q.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith("moliverse:learner-create:")));
 assert.deepEqual(keys,allow?["moliverse:learner-create:morning-bakery:v1:user:"+uid+":explorer:"+explorer]:[]);await q.close();
 }
 console.log("Scoped guardian saving and session-only preference passed with isolated auth doubles.");
 }finally{await b.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
