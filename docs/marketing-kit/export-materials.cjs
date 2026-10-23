// Export local marketing artwork. No network access or app data required.
const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/Dvid/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = __dirname;
const out = path.join(root, 'share');
const pdfDir = path.resolve(root, '../../output/pdf');
const copy = [
  {id:'customer-sw',lang:'sw',audience:'customer',eyebrow:'TUNAJIANDAA KUANZA',title:'Soko la karibu.<br>Maisha ya kila siku.',body:'Vyakula na bidhaa za kila siku kutoka kwa wauzaji wa karibu.',cta:'Pata taarifa za uzinduzi',fine:'Tunapanga kupanua huduma Dar es Salaam.'},
  {id:'merchant-sw',lang:'sw',audience:'merchant',eyebrow:'TUNATAFUTA WAUZAJI',title:'Bidhaa zako.<br>Duka lako.<br>Wateja wa karibu.',body:'Una mgahawa au duka? Ulizia jinsi ya kushiriki katika majaribio ya SmartSoko.',cta:'Zungumza nasi kuhusu kujiunga',fine:'Vigezo, gharama na masharti vitaelezwa kabla ya kujiunga.'},
  {id:'customer-en',lang:'en',audience:'customer',eyebrow:'PREPARING TO LAUNCH',title:'Your neighbourhood.<br>Your marketplace.',body:'Discover local food, groceries and everyday essentials with SmartSoko.',cta:'Get launch updates',fine:'Expansion across Dar es Salaam is planned.'},
  {id:'merchant-en',lang:'en',audience:'merchant',eyebrow:'MERCHANT RECRUITMENT',title:'Your products.<br>Your shop.<br>Nearby customers.',body:'Run a restaurant or shop? Ask about joining the SmartSoko pilot.',cta:'Talk to us about joining',fine:'Eligibility, fees and terms explained before you join.'}
];
function artwork(c, vertical) {
  return `<!doctype html><html lang="${c.lang}"><meta charset="utf-8"><style>
  *{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif}.art{width:1080px;height:${vertical?1920:1080}px;padding:${vertical?'190px 76px 230px':'64px 70px'};background:${c.audience==='merchant'?'#173f32':'#f8f5eb'};color:${c.audience==='merchant'?'#f8f5eb':'#173f32'};display:flex;flex-direction:column}.brand{font-size:43px;font-weight:800;letter-spacing:-2px}.eyebrow{font-size:20px;letter-spacing:3px;color:${c.audience==='merchant'?'#efb55e':'#865315'};margin-top:${vertical?140:60}px;font-weight:700}.area{font-size:33px;margin-top:18px;font-weight:700}h1{font-size:${vertical?91:77}px;line-height:1.03;letter-spacing:-3px;margin:${vertical?60:34}px 0 26px}p{font-size:29px;line-height:1.4;max-width:850px;margin:0}.bottom{margin-top:auto;border-top:2px solid ${c.audience==='merchant'?'#668275':'#cfcdbd'};padding-top:30px}.cta{font-size:28px;font-weight:700}.number{font-size:68px;font-weight:800;letter-spacing:1px;margin-top:12px}.fine{font-size:21px;line-height:1.4;margin-top:22px;max-width:850px}
  </style><main class="art"><div class="brand">SmartSoko</div><div class="eyebrow">${c.eyebrow}</div><div class="area">Kunduchi &amp; Tegeta</div><h1>${c.title}</h1><p>${c.body}</p><section class="bottom"><div class="cta">${c.cta}</div><div class="number">WhatsApp: 0620771067</div><div class="fine">${c.fine}</div></section></main></html>`;
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});fs.mkdirSync(pdfDir,{recursive:true});
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1080,height:1920},deviceScaleFactor:1});
  for(const c of copy) for(const vertical of [false,true]) {
    const name=c.id+(vertical?'-status':'-square');
    const html=artwork(c,vertical);
    fs.writeFileSync(path.join(out,name+'.html'),html);
    await page.setViewportSize({width:1080,height:vertical?1920:1080});
    await page.setContent(html);await page.evaluate(()=>document.fonts.ready);
    const check=await page.evaluate(()=>{const a=document.querySelector('.art');return {width:a.scrollWidth,height:a.scrollHeight,expected:a.clientHeight,overflow:[...a.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>1080||e.getBoundingClientRect().bottom>a.getBoundingClientRect().bottom).map(e=>e.tagName)}});
    if(check.height>check.expected||check.overflow.length) throw Error(name+' overflow '+JSON.stringify(check));
    await page.screenshot({path:path.join(out,name+'.png')});
    console.log(name+' OK');
  }
  await page.goto('file:///'+path.join(root,'flyers.html').replace(/\\/g,'/'));
  await page.emulateMedia({media:'print'});
  const checks=await page.locator('.sheet').evaluateAll(els=>els.map(e=>({height:e.clientHeight,scroll:e.scrollHeight})));
  if(checks.some(c=>c.scroll>c.height+1))throw Error('Print overflow '+JSON.stringify(checks));
  await page.pdf({path:path.join(pdfDir,'smartsoko-pilot-flyers.pdf'),printBackground:true,preferCSSPageSize:true});
  // Save print-layout page previews for inspection.
  await page.setViewportSize({width:1100,height:1200});
  for(let i=0;i<4;i++)await page.locator('.sheet').nth(i).screenshot({path:path.join(out,'flyer-'+copy[i].id+'.png')});
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
