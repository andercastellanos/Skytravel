/**
 * Browser regression checks for floating WhatsApp and GA4 event ownership.
 * Requires Playwright and locally installed Google Chrome; no repo dependency changes needed.
 * PLAYWRIGHT_MODULE may point to an externally installed playwright package.
 * SKYTRAVEL_QA_OUTPUT selects the JSON/screenshot artifact directory (defaults to OS temp).
 * Every analytics collect request and unmocked Netlify function request is intercepted.
 * Before clicks/submits, gtag is replaced with a recorder and form fetches are mocked.
 * Run: node scripts/check-whatsapp-analytics.js
 */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
function assertNoAstral(message){
 assert.doesNotMatch(message,/[\u{10000}-\u{10FFFF}]/u,'WhatsApp message contains a character above U+FFFF');
}
// Verify the regression guard rejects supplementary-plane characters and permits accents.
assert.throws(()=>assertNoAstral(String.fromCodePoint(0x1F64F)),/above U\+FFFF/);
assertNoAstral('España — ¿Cómo?');
const root=path.resolve(__dirname,'..');
// Decode all static WhatsApp hrefs, including percent-encoded text on unvisited pages.
const htmlFiles=require('node:child_process').execFileSync('git',['ls-files','-z','--','*.html'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
let staticWhatsAppMessages=0;
for(const file of htmlFiles){
 const source=fs.readFileSync(path.join(root,file),'utf8');
 for(const match of source.matchAll(/\bhref\s*=\s*(["'])(https:\/\/wa\.me\/[^"']*)\1/gi)){
  const text=new URL(match[2].replace(/&amp;/g,'&')).searchParams.get('text');
  if(text!==null){assertNoAstral(text);staticWhatsAppMessages++;}
 }
}
console.log('STATIC WHATSAPP MESSAGES',staticWhatsAppMessages,'decoded hrefs across',htmlFiles.length,'HTML files PASS');
const out=path.resolve(process.env.SKYTRAVEL_QA_OUTPUT || path.join(require('node:os').tmpdir(),'skytravel-whatsapp-qa'));
fs.mkdirSync(out,{recursive:true});
let browser;
const rules=fs.readFileSync(path.join(root,'netlify.toml'),'utf8').split('[[redirects]]').slice(1).map(b=>({from:b.match(/from\s*=\s*"([^"]+)"/)?.[1],to:b.match(/to\s*=\s*"([^"]+)"/)?.[1],status:Number(b.match(/status\s*=\s*(\d+)/)?.[1])}));
function resolve(urlPath,seen=new Set()){
 if(seen.has(urlPath))return null;seen.add(urlPath);
 const rule=rules.find(r=>r.from===urlPath);
 if(rule){if(rule.status===200)return path.join(root,rule.to);return resolve(rule.to,seen);}
 for(const p of [urlPath,urlPath+'.html',urlPath.replace(/\/$/,'')+'/index.html']){
  const f=path.join(root,p);if(f.startsWith(root+'/')&&fs.existsSync(f)&&fs.statSync(f).isFile())return f;
 }return null;
}
const server=http.createServer((req,res)=>{
 const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(p.startsWith('/.netlify/')){res.writeHead(500);return res.end('Mock functions in the browser; never call a real backend.');}
 const f=resolve(p);if(!f){res.writeHead(404);return res.end('Missing '+p);}
 const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2'};
 res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:'chrome',headless:true});
 const rows=[];const failures=[];let blockedAnalytics=0;
 const pages=['/','/index-es','/medjugorje-es','/medjugorje','/peregrinacion-tierrasanta-2027-es','/blog/medjugorje-encuentro-dios-transforma-corazon','/blog/retiro-ayuno-oracion-medjugorje','/contact-es','/es/experiences/medjugorje-2024-es','/about-es','/recibo'];
 async function contextFor(viewport,options={}){
  const context=await browser.newContext({viewport,serviceWorkers:'block'});
  const hits=[];const errors=[];const missing=[];
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin===origin){if(u.pathname.startsWith('/.netlify/'))return route.fulfill({status:500,body:'Unmocked backend prohibited'});return route.continue();}
   // Collect requests are observed, then fulfilled locally: no analytics leaves this browser.
   if(/\/g\/collect|\/collect/.test(u.pathname)){
    blockedAnalytics++;hits.push({url:req.url(),body:req.postData()||''});return route.fulfill({status:204,body:''});
   }
   if(options.loadAnalytics===false)return route.abort();
   if(u.hostname==='www.googletagmanager.com'&&u.pathname==='/gtag/js')return route.continue();
   if(['cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'].includes(u.hostname))return route.continue();
   return route.abort();
  });
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(origin)&&r.status()===404)missing.push(r.url());});
  await page.addInitScript(()=>{for(const type of ['click','auxclick'])document.addEventListener(type,e=>{if(e.target.closest&&e.target.closest('a'))e.preventDefault();},true);});
  return {context,page,hits,errors,missing};
 }
 function pageViews(hits){return hits.flatMap(h=>[new URL(h.url).searchParams,...h.body.split('\n').map(l=>new URLSearchParams(l))]).filter(p=>p.get('en')==='page_view').length;}
 async function recorder(page){await page.evaluate(()=>{window.__events=[];window.gtag=(...args)=>window.__events.push(args);});}
 async function events(page){return page.evaluate(()=>window.__events.filter(e=>e[0]==='event').map(e=>({name:e[1],params:e[2]})));}
 async function tap(page,selector,index=0){await recorder(page);await page.locator(selector).nth(index).evaluate(e=>e.click());return events(page);}
 async function form(page,outcome){
  await recorder(page);
  await page.evaluate(result=>{
   const form=document.querySelector('#contact-form');
   for(const [id,value] of Object.entries({firstName:'QA',lastName:'Preview',email:'preview@example.com',phone:'3055550123',pilgrimageInterest:'Medjugorje'}))form.querySelector('#'+id).value=value;
   const pref=form.querySelector('#preferredContact');pref.value=Array.from(pref.options).find(o=>o.value).value;
   form.querySelector('#consentContact').checked=true;
   const realFetch=window.fetch;window.__formFetches=0;
   window.fetch=(...args)=>String(args[0]).includes('/contact-lead')?(window.__formFetches++,new Promise(resolve=>window.__resolveLead=()=>resolve({ok:result==='success',json:async()=>result==='success'?{success:true}:{success:false,error:'Mock error'}}))):realFetch(...args);
   // A duplicate submit while awaiting the response must not create another request/event.
   form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
   form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  },outcome);
  assert.deepEqual((await events(page)).map(e=>e.name),['contact_form_submit'],'no success before server response');
  assert.equal(await page.evaluate(()=>window.__formFetches),1);
  await page.evaluate(()=>window.__resolveLead());
  await page.waitForFunction(()=>!document.querySelector('#contact-form').dataset.submitting);
  const result=await events(page);
  assert.deepEqual(result.map(e=>e.name),['contact_form_submit','contact_form_'+outcome]);
  return result.map(e=>e.name);
 }
 const samples=[];
 const expectedTripLabels={
  '/medjugorje':{es:'Peregrinación a Medjugorje 2027',en:'Medjugorje 2027 pilgrimage'},
  '/peregrinacion-tierrasanta-2027':{es:'Peregrinación a Tierra Santa y Medjugorje (marzo–abril 2027)',en:'Holy Land & Medjugorje pilgrimage (March–April 2027)'},
  '/tierrasanta2026':{es:'Peregrinación a Tierra Santa y Medjugorje (septiembre–octubre 2027)',en:'Holy Land & Medjugorje pilgrimage (September–October 2027)'},
  '/peregrinacion_bajo_el_manto_de_maria':{es:'Peregrinación Bajo el Manto de María 2027',en:'Under Mary’s Mantle 2027 pilgrimage'},
  '/peregrinacion_mexico_cancun_2027':{es:'Peregrinación a Guadalupe, México y Cancún 2027',en:'Guadalupe, Mexico & Cancún 2027 pilgrimage'}
 };
 async function whatsapp(page,selector,index=0,options={}){
  const meta=await page.evaluate(()=>({path:location.pathname,host:location.hostname.replace(/^www\./,''),lang:document.documentElement.lang,title:document.title}));
  const tripKey=meta.path.toLowerCase().replace(/\/$/,'').replace(/\.html$/,'').replace(/^\/peregrinaciones-2027\//,'/').replace(/-es$/,'');
  const trip=expectedTripLabels[tripKey]?.[meta.lang];
  const label=trip||meta.title.split(' | ')[0].trim().slice(0,60);
  const es=meta.lang==='es',blog=meta.path.startsWith('/blog/');
  const source=options.source||(es?'directo':'direct');
  const section=await page.locator(selector).nth(index).getAttribute('data-section')||'unknown';
  await recorder(page);
  await page.locator(selector).nth(index).evaluate((link,type)=>{
   if(type==='auxclick')link.dispatchEvent(new MouseEvent('auxclick',{bubbles:true,cancelable:true,button:1}));
   else if(type==='modified-click')link.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,ctrlKey:true}));
   else link.click();
  },options.type||'click');
  const actual=await events(page);assert.equal(actual.length,1,'one event, no contact_click');
  const event=actual[0],code=event.params.lead_ref;
  assert.match(code,/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
  assert.deepEqual(event,{name:'whatsapp_click',params:{page_path:meta.path,page_language:meta.lang,section,page_label:label,lead_ref:code,source_label:source,landing_path:options.landing||meta.path}});
  const href=await page.locator(selector).nth(index).getAttribute('href');
  const message=new URL(href).searchParams.get('text');
  assertNoAstral(message);
  assert.ok(message.length<500,'message below 500 characters');
  const intro=trip?(es?`Hola, Sky Travel J&M. Me interesa la ${trip.replace(/^Peregrinación/,'peregrinación')}. ¿Me pueden enviar fechas y precio?`:`Hello, Sky Travel J&M. I'm interested in the ${trip}. Could you send me dates and price?`):blog?(es?`Hola, Sky Travel J&M. Leí su artículo «${label}» y me gustaría recibir información sobre sus peregrinaciones.`:`Hello, Sky Travel J&M. I read your article "${label}" and I'd like information about your pilgrimages.`):(es?'Hola, Sky Travel J&M. Me gustaría recibir información sobre sus peregrinaciones.':"Hello, Sky Travel J&M. I'd like information about your pilgrimages.");
  const sourceText=['direct','directo'].includes(source)?'':(es?' · Los encontré en: ':' · Found you on: ')+source;
  const pageLine=(es?'Página: ':'Page: ')+(blog?'':label+' — ')+meta.host+meta.path;
  const expected=intro+'\n('+pageLine+sourceText+' · Ref. '+code+')\n'+(es?'Escribo desde (ciudad, estado o país): ':"I'm writing from (city, state or country): ");
  if(!options.clipped)assert.equal(message,expected,'correct complete template, page label/link, source, ref and final city prompt');
  assert.equal(message.match(/ · Ref\. ([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5})\)/)?.[1],code);
  assert.equal(message.split('\n').length,3,'real line breaks');
  assert.ok(!message.includes('utm_source=')&&!message.includes('private-search-query'),'no query strings/referrer paths in the message');
  return {page:meta.path,language:meta.lang,section,activation:options.type||'click',message,length:message.length,event};
 }

 for(const [view,viewport]of Object.entries({phone:{width:375,height:812},desktop:{width:1440,height:1000}})){
  for(const url of pages){
   const {context,page,hits,errors,missing}=await contextFor(viewport);
   const row={view,page:url};
   try{
    await page.goto(origin+url,{waitUntil:'networkidle',timeout:30000});
    await page.waitForFunction(()=>!!window.SkyTravelTracking);
    if(url==='/recibo'){
     assert.equal(await page.locator('.stjm-wa-float').count(),0);row.floating='absent (internal)';row.pageViews=0;
    }else{
     await page.waitForFunction(()=>document.querySelector('#contact-form')?.dataset.trackingInitialized==='true');
     await page.waitForFunction(()=>document.querySelector('#footer-container footer'));
     const fallbacks=await page.locator('a[href*="wa.me/"]').evaluateAll(links=>links.map(link=>new URL(link.href).searchParams.get('text')).filter(text=>text!==null));
     fallbacks.forEach(assertNoAstral);
     const b=page.locator('.stjm-wa-float');assert.equal(await b.count(),1);assert.equal(await b.isVisible(),true);
     const box=await b.boundingBox();assert.equal(box.width,view==='phone'?56:60);assert.equal(box.height,box.width);
     assert.equal(Math.round(viewport.width-box.x-box.width),20);assert.ok(Math.round(viewport.height-box.y-box.height)>=20);
     const suggestion=page.locator('[data-lang-suggest]');
     if(await suggestion.count())assert.equal(overlaps(box,await suggestion.boundingBox()),false);
     assert.equal(await b.getAttribute('target'),'_blank');assert.equal(await b.getAttribute('rel'),'noopener');
     assert.equal(await b.getAttribute('class'),'stjm-wa-float');
     assert.equal(await page.locator('#stjm-wa-float-css').count(),1);
     const floating=await whatsapp(page,'.stjm-wa-float');
     samples.push({...floating,view,link:'floating'});row.floating='whatsapp_click ×1 (floating_button; matched lead_ref)';
     const own='a[href^="https://wa.me/13056452625"]:not(.stjm-wa-float)';
     const ownCount=await page.locator(own).count();
     for(let i=0;i<ownCount;i++){
      const expected=await page.locator(own).nth(i).getAttribute('data-section')||'unknown';
      const actual=await whatsapp(page,own,i);assert.equal(actual.event.params.section,expected);
      if(i===0)samples.push({...actual,view,link:'contact/footer'});
     }row.otherWhatsApp=`${ownCount} links: whatsapp_click ×1 each, contact_click ×0`;
     const shares='a[href^="https://wa.me/?"]';const shareCount=await page.locator(shares).count();
     for(let i=0;i<shareCount;i++)assert.deepEqual(await tap(page,shares,i),[]);
     row.share=shareCount?`${shareCount} links: whatsapp_click ×0`:'N/A (no share link)';
     const methods={};for(const [protocol,method]of [['tel:','call'],['sms:','sms'],['mailto:','email']]){
      const selector=`a[href^="${protocol}"]`,count=await page.locator(selector).count();
      for(let i=0;i<count;i++){
       const actual=await tap(page,selector,i);assert.equal(actual.length,1);assert.equal(actual[0].name,'contact_click');assert.equal(actual[0].params.method,method);
      }methods[method]=count?`${count} links, contact_click ×1 each`:'N/A';
     }row.contact=methods;
     row.formSuccess=await form(page,'success');row.formError=await form(page,'error');
     const languageLinks='[data-lang-suggest] a';const languageCount=await page.locator(languageLinks).count();
     for(let i=0;i<languageCount;i++){const actual=await tap(page,languageLinks,i);assert.equal(actual.length,1);assert.equal(actual[0].name,'language_switch');}
     row.languageSwitch=languageCount?'language_switch ×1':'N/A (no Spanish suggestion on Spanish pages)';
     if(await page.locator('#blog-subscribe-form').count()){
      await recorder(page);await page.evaluate(()=>{
       document.querySelector('#bs-name').value='QA';document.querySelector('#bs-notificationPref').value='Correo';document.querySelector('#bs-email').value='preview@example.com';document.querySelector('#bs-consentSubscribe').checked=true;
       const oldFetch=window.fetch;window.fetch=(...a)=>String(a[0]).includes('/blog-subscribe')?Promise.resolve({ok:true,json:async()=>({success:true})}):oldFetch(...a);
       document.querySelector('#blog-subscribe-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
      });
      await page.waitForFunction(()=>window.__events.some(e=>e[1]==='blog_subscribe_success'));
      const names=(await events(page)).map(e=>e.name);assert.deepEqual(names,['blog_subscribe_submit','blog_subscribe_success']);row.newsletter=names;
     }else row.newsletter='N/A';
     // Actual GA4 library; collect requests are stopped locally before being transmitted.
     row.pageViews=pageViews(hits);assert.equal(row.pageViews,1,'one intercepted automatic page_view');
    }
    assert.deepEqual(errors,[],'no JS runtime errors');assert.deepEqual(missing,[],'no missing local resources');
    row.status='PASS';
   }catch(e){row.status='FAIL';row.error=e.stack;row.errors=errors;row.missing=missing;failures.push(row);}
   rows.push(row);fs.writeFileSync(path.join(out,'message-results.json'),JSON.stringify(samples,null,2));console.log(JSON.stringify(row));fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(rows,null,2));await context.close();
  }
 }
 // Visual/accessibility checks with the same outbound-analytics block.
 const visual=[];
 function overlaps(a,b){return a&&b&&a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;}
 for(const [view,viewport]of Object.entries({phone:{width:375,height:812},desktop:{width:1440,height:1000}})){
  const {context,page}=await contextFor(viewport);
  await page.goto(origin+'/index-es',{waitUntil:'networkidle'});
  await page.waitForSelector('.stjm-wa-float');
  await recorder(page);
  await page.screenshot({path:path.join(out,`whatsapp-${view}.png`)});
  if(view==='phone'){
   await page.locator('.menu-toggle').click();
   await page.waitForFunction(()=>document.querySelector('.stjm-wa-float').hasAttribute('data-hidden'));
   assert.equal(await page.locator('.stjm-wa-float').isVisible(),false);
   await page.screenshot({path:path.join(out,'whatsapp-phone-menu-open.png')});
   await page.keyboard.press('Escape');
   await page.waitForFunction(()=>!document.querySelector('.stjm-wa-float').hasAttribute('data-hidden'));
  }else{
   await page.keyboard.press('Tab');await page.locator('.stjm-wa-float').focus();
   assert.equal(await page.locator('.stjm-wa-float').evaluate(e=>e.matches(':focus-visible')),true);
   assert.notEqual(await page.locator('.stjm-wa-float').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
   await page.waitForTimeout(200);
   await page.screenshot({path:path.join(out,'whatsapp-desktop-keyboard-focus.png')});
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.ok(await page.locator('.stjm-wa-float').evaluate(e=>parseFloat(getComputedStyle(e).transitionDuration)<=0.00001));
  await page.emulateMedia({reducedMotion:'no-preference'});
  // Reload both owners twice; dynamic/footer links must still generate one event.
  await page.addScriptTag({url:origin+'/js/site-tracking.js?v=20261101'});
  await page.addScriptTag({url:origin+'/js/contact-tracking.min.js?v=20261031'});
  const one=await tap(page,'.stjm-wa-float');assert.equal(one.length,1);
  await recorder(page);await page.locator('.stjm-wa-float').evaluate(e=>{e.click();e.click();});
  const rapid=await events(page);
  assert.deepEqual(rapid.map(e=>e.name),['whatsapp_click','whatsapp_click']);
  assert.notEqual(rapid[0].params.lead_ref,rapid[1].params.lead_ref,'new reference for each tap');
  for(const type of ['auxclick','modified-click']){
   await whatsapp(page,'.stjm-wa-float',0,{type});
   await whatsapp(page,'#footer-container a[href^="https://wa.me/13056452625"]',0,{type});
  }
  const right=await page.locator('.stjm-wa-float').getAttribute('href');
  await recorder(page);await page.locator('.stjm-wa-float').dispatchEvent('auxclick',{button:2});
  assert.deepEqual(await events(page),[]);assert.equal(await page.locator('.stjm-wa-float').getAttribute('href'),right);
  await page.locator('footer').evaluate(e=>e.scrollIntoView());
  await page.waitForFunction(()=>document.querySelector('.stjm-wa-float').hasAttribute('data-hidden'));
  assert.equal(await page.locator('.stjm-wa-float').isVisible(),false);
  await page.screenshot({path:path.join(out,`whatsapp-${view}-footer.png`)});

  await page.goto(origin+'/contact-es',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#contact-form')?.dataset.trackingInitialized);
  await page.locator('#submit-btn').evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top-(window.innerHeight-130)));
  await page.waitForTimeout(100);
  await form(page,'success');
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.stjm-wa-float').isVisible(),true,'float visible above toast');
  const floating=await page.locator('.stjm-wa-float').boundingBox();
  assert.equal(overlaps(floating,await page.locator('#toast-container').boundingBox()),false);
  assert.equal(overlaps(floating,await page.locator('#submit-btn').boundingBox()),false);
  await page.screenshot({path:path.join(out,`whatsapp-${view}-contact-toast.png`)});
  // Bring the submit control into the default floating-button rectangle.
  await page.locator('#toast-container').evaluate(e=>e.remove());
  await page.locator('#submit-btn').evaluate(e=>window.scrollTo(0,window.scrollY+e.getBoundingClientRect().top-(window.innerHeight-68)));
  await page.waitForTimeout(100);
  assert.equal(overlaps(await page.locator('.stjm-wa-float').boundingBox(),await page.locator('#submit-btn').boundingBox()),false);
  // The blog already has a floating back-to-top button. Leave it usable too.
  await page.goto(origin+'/blog/medjugorje-encuentro-dios-transforma-corazon',{waitUntil:'networkidle'});
  await page.evaluate(()=>window.scrollTo(0,1200));
  await page.waitForFunction(()=>document.querySelector('.scroll-to-top.visible'));
  await page.waitForTimeout(100);
  assert.equal(overlaps(await page.locator('.stjm-wa-float').boundingBox(),await page.locator('.scroll-to-top').boundingBox()),false);
  await page.screenshot({path:path.join(out,`whatsapp-${view}-blog-scroll.png`)});
  visual.push({view,status:'PASS',checks:['dimensions/edge spacing','menu visibility (phone)','keyboard focus (desktop)','reduced motion','duplicate tracker initialization','two rapid taps count twice','footer unobstructed','toast and submit unobstructed','blog back-to-top unobstructed']});
  await context.close();
 }
 fs.writeFileSync(path.join(out,'visual-results.json'),JSON.stringify(visual,null,2));
 console.log('VISUAL',JSON.stringify(visual));
 const {context:edgeContext,page:edgePage}=await contextFor({width:375,height:812});
 await edgePage.goto(origin+'/index-es',{waitUntil:'networkidle'});
 await edgePage.waitForSelector('.stjm-wa-float');
 for(const href of ['https://wa.me/?text=share','https://wa.me/15555550123','https://wa.me/130564526250','https://wa.me/13056452625/extra','https://wa.me.invalid/13056452625']){
  await edgePage.evaluate(href=>{const a=document.createElement('a');a.id='qa-invalid-lead';a.href=href;a.dataset.event='whatsapp_click';document.body.appendChild(a);},href);
  assert.deepEqual(await tap(edgePage,'#qa-invalid-lead'),[],href);
  await edgePage.locator('#qa-invalid-lead').evaluate(e=>e.remove());
 }
 await edgeContext.close();
 console.log('NON-LEADS 5 share/other-number/misleading-attribute cases PASS');
 // Every prefilled trip message survives for the public clean URL AND physical file.
 const {context:aliasContext,page:aliasPage}=await contextFor({width:375,height:812});
 await aliasContext.route('**/gtag/js**',r=>r.abort());
 const originals=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/whatsapp-trip-messages.json'),'utf8'));
 const aliasResults=[];
 Object.values(originals).forEach(assertNoAstral);
 for(const [file,message]of Object.entries(originals)){
  const html=fs.readFileSync(path.join(root,file),'utf8');
  const canonical=new URL(html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)[1]).pathname;
  for(const url of [canonical,file]){
   await aliasPage.goto(origin+url,{waitUntil:'domcontentloaded'});
   await aliasPage.waitForSelector('.stjm-wa-float');
   const actual=new URL(await aliasPage.locator('.stjm-wa-float').getAttribute('href')).searchParams.get('text');
   assertNoAstral(actual);
   assert.equal(actual,message,url);
   const activation=await whatsapp(aliasPage,'.stjm-wa-float',0,{source:'direct',landing:aliasResults[0]?.url||url});
   aliasResults.push({url,fallback:message,message:activation.message,lead_ref:activation.event.params.lead_ref,status:'PASS'});
  }
 }
 fs.writeFileSync(path.join(out,'trip-message-results.json'),JSON.stringify(aliasResults,null,2));
 console.log('TRIP MESSAGES',aliasResults.length,'PASS');
 // Test each exclusion independently of noindex metadata using public-page HTML fixtures.
 const publicHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const exclusions=['recibo','estado','pagar','pay','empleados','cumpleanos','crear-destino','crear-experiencia','trip-gallery','galeria-viaje'];
 let exclusionCount=0;
 for(const stem of exclusions){for(const suffix of ['','-es','.html','-es.html']){
  const routePath='/'+stem+suffix;
  await aliasPage.route(origin+routePath,r=>r.fulfill({contentType:'text/html',body:publicHtml}));
  await aliasPage.goto(origin+routePath,{waitUntil:'domcontentloaded'});
  await aliasPage.waitForFunction(()=>!!window.SkyTravelTracking);
  await aliasPage.waitForTimeout(30);
  assert.equal(await aliasPage.locator('.stjm-wa-float').count(),0,routePath);exclusionCount++;
  await aliasPage.unroute(origin+routePath);
 }}
 await aliasPage.route(origin+'/qa-noindex',r=>r.fulfill({contentType:'text/html',body:publicHtml.replace('content="index, follow"','content="noindex, follow"')}));
 await aliasPage.goto(origin+'/qa-noindex',{waitUntil:'domcontentloaded'});
 await aliasPage.waitForFunction(()=>!!window.SkyTravelTracking);await aliasPage.waitForTimeout(30);
 assert.equal(await aliasPage.locator('.stjm-wa-float').count(),0,'other noindex page');
 console.log('EXCLUSIONS',exclusionCount,'URL variants plus independent noindex page PASS');
 // Explicit internal opt-in survives a later page load; opt-out clears it.
 for(const [url,expected]of [['/?internal=1','1'],['/about-es','1'],['/?internal=0','0']]){
  await aliasPage.goto(origin+url,{waitUntil:'domcontentloaded'});
  assert.equal(await aliasPage.evaluate(()=>localStorage.getItem('stjm_internal')),expected);
  const flags=await aliasPage.evaluate(()=>window.dataLayer.filter(e=>e[0]==='set'&&e[1]?.traffic_type==='internal').length);
  assert.equal(flags,expected==='1'?1:0);
 }
 await aliasContext.close();
 fs.writeFileSync(path.join(out,'extra-results.json'),JSON.stringify({tripAliases:aliasResults.length,excludedVariants:exclusionCount,noindex:true,internalPersistence:true,nonLeadCases:5,status:'PASS'},null,2));

 // Keep the English homepage suggestion clear at every requested phone size.
 const overlapResults=[];
 for(const viewport of [{width:375,height:812},{width:390,height:844},{width:360,height:740}]){
  const {context,page}=await contextFor(viewport,{loadAnalytics:false});
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.stjm-wa-float');
  await page.waitForTimeout(100);
  const button=await page.locator('.stjm-wa-float').boundingBox();
  const suggestion=await page.locator('[data-lang-suggest]').boundingBox();
  assert.equal(await page.locator('.stjm-wa-float').isVisible(),true);
  assert.equal(overlaps(button,suggestion),false,'English homepage Spanish suggestion unobstructed');
  const result={viewport,button,suggestion,gap:suggestion.y-button.y-button.height,overlap:false,status:'PASS'};
  assert.ok(result.gap>=11.5,'at least 12px between button and suggestion');
  overlapResults.push(result);await page.screenshot({path:path.join(out,`homepage-clear-${viewport.width}x${viewport.height}.png`)});
  await context.close();
 }
 fs.writeFileSync(path.join(out,'overlap-results.json'),JSON.stringify(overlapResults,null,2));
 console.log('HOMEPAGE OVERLAP',JSON.stringify(overlapResults));

 const sourceCases=[
  {name:'Google',referrer:'https://google.com/search?q=private-search-query',source:'Google'},
  {name:'Google subdomain',referrer:'https://news.google.com/',source:'Google'},
  {name:'Google country domain',referrer:'https://www.google.co.uk/search',source:'Google'},
  {name:'Gemini',referrer:'https://gemini.google.com/app/hidden',source:'Gemini'},
  {name:'Gemini country domain',referrer:'https://gemini.google.co.uk/app',source:'Gemini'},
  {name:'Bing',referrer:'https://www.bing.com/search',source:'Bing'},
  {name:'Yahoo',referrer:'https://search.yahoo.com/search',source:'Yahoo'},
  {name:'DuckDuckGo',referrer:'https://duckduckgo.com/',source:'DuckDuckGo'},
  {name:'ChatGPT',referrer:'https://chatgpt.com/c/private',source:'ChatGPT'},
  {name:'ChatGPT legacy domain',referrer:'https://chat.openai.com/',source:'ChatGPT'},
  {name:'Perplexity',referrer:'https://perplexity.ai/search/private',source:'Perplexity'},
  {name:'Copilot',referrer:'https://copilot.microsoft.com/',source:'Copilot'},
  {name:'Claude',referrer:'https://claude.ai/chat/private',source:'Claude'},
  {name:'Facebook link redirect',referrer:'https://l.facebook.com/l.php',source:'Facebook'},
  {name:'Facebook mobile',referrer:'https://m.facebook.com/',source:'Facebook'},
  {name:'Facebook short link',referrer:'https://fb.me/test',source:'Facebook'},
  {name:'Instagram',referrer:'https://instagram.com/',source:'Instagram'},
  {name:'Instagram link redirect',referrer:'https://l.instagram.com/',source:'Instagram'},
  {name:'TikTok',referrer:'https://www.tiktok.com/',source:'TikTok'},
  {name:'YouTube',referrer:'https://www.youtube.com/',source:'YouTube'},
  {name:'Centro Medjugorje',referrer:'https://www.centromedjugorje.org/',source:'Centro Medjugorje'},
  {name:'WhatsApp short link',referrer:'https://wa.me/',source:'WhatsApp'},
  {name:'WhatsApp web',referrer:'https://web.whatsapp.com/',source:'WhatsApp'},
  {name:'Unknown external host',referrer:'https://www.parish.example/news?private-search-query',source:'parish.example'},
  ...Object.entries({facebook:'Facebook',fb:'Facebook',instagram:'Instagram',ig:'Instagram',whatsapp:'WhatsApp',wa:'WhatsApp',email:'Email',newsletter:'Email'}).map(([utm,source])=>({name:'utm_source='+utm,first:'/?utm_source='+utm,referrer:'https://google.com/',source})),
  {name:'Unknown UTM source preserved',first:'/?utm_source=Parish%20Partner',source:'Parish Partner'},
  {name:'Direct English',source:'direct'},
  {name:'Direct Spanish',first:'/index-es',source:'directo'},
  {name:'Own domain without an earlier stored source',referrer:'https://www.skytraveljm.com/contact',source:'direct'},
  {name:'Netlify preview without an earlier stored source',referrer:'https://deploy-preview-84--skytraveljm.netlify.app/',source:'direct'}
 ];
 const sourceResults=[];
 for(const test of sourceCases){
  const {context,page}=await contextFor({width:375,height:812},{loadAnalytics:false});
  const first=test.first||'/',landing=new URL(first,origin).pathname;
  // Mock referrers before scripts execute; no navigation to the referring site occurs.
  await page.addInitScript(({firstPath,referrer})=>Object.defineProperty(document,'referrer',{configurable:true,get:()=>location.pathname===firstPath?referrer:'https://deploy-preview-84--skytraveljm.netlify.app/'}),{firstPath:landing,referrer:test.referrer||''});
  await page.goto(origin+first,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.stjm-wa-float');
  const firstClick=await whatsapp(page,'.stjm-wa-float',0,{source:test.source,landing});
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('stjm_src')),test.source);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('stjm_landing_path')),landing);
  // Later UTMs and an own preview referrer must not replace first-page attribution.
  await page.goto(origin+'/about-es?utm_source=second-page-source',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('.stjm-wa-float');
  const secondClick=await whatsapp(page,'.stjm-wa-float',0,{source:test.source,landing});
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('stjm_src')),test.source);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('stjm_landing_path')),landing);
  sourceResults.push({case:test.name,referrer:test.referrer||'',first,source:test.source,landing_path:landing,firstMessage:firstClick.message,secondMessage:secondClick.message,secondSource:secondClick.event.params.source_label,secondLanding:secondClick.event.params.landing_path,status:'PASS'});
  await context.close();
 }
 fs.writeFileSync(path.join(out,'source-results.json'),JSON.stringify(sourceResults,null,2));
 console.log('FIRST-PAGE SOURCES',sourceResults.length,'cases × 2 pages PASS');
 // Unusually long campaigns still produce an encodable message below 500 characters.
 const longMessages=[];
 for(const longSource of ['Parish Campaign '.repeat(60),'Á'.repeat(1200)]){
  const {context:longContext,page:longPage}=await contextFor({width:375,height:812},{loadAnalytics:false});
  await longPage.goto(origin+'/medjugorje-es?utm_source='+encodeURIComponent(longSource),{waitUntil:'domcontentloaded'});
  await longPage.waitForSelector('.stjm-wa-float');
  const longClick=await whatsapp(longPage,'.stjm-wa-float',0,{source:longSource,landing:'/medjugorje-es',clipped:true});
  assert.ok(longClick.message.endsWith('Escribo desde (ciudad, estado o país): '));
  assert.ok(longClick.message.includes('… · Ref. '));
  longMessages.push(longClick.message.length);await longContext.close();
 }
 // Blocking storage cannot prevent a link rewrite or its single GA4 event.
 const {context:blockedContext,page:blockedPage}=await contextFor({width:375,height:812},{loadAnalytics:false});
 await blockedPage.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{get(){throw new Error('Blocked storage');}}));
 await blockedPage.goto(origin+'/index-es',{waitUntil:'domcontentloaded'});
 await blockedPage.waitForSelector('.stjm-wa-float');
 await whatsapp(blockedPage,'.stjm-wa-float');await blockedContext.close();
 fs.writeFileSync(path.join(out,'follow-up-summary.json'),JSON.stringify({sourceCases:sourceResults.length,sourcePageChecks:sourceResults.length*2,overlapSizes:overlapResults.length,samples:samples.length,longMessages,storageUnavailable:'PASS',status:failures.length?'FAIL':'PASS'},null,2));

 await browser.close();server.close();console.log(JSON.stringify({rows:rows.length,failures:failures.length,blockedAnalytics}));if(failures.length)process.exitCode=1;
})().catch(async e=>{console.error(e);if(browser)await browser.close();server.close();process.exitCode=1;});
