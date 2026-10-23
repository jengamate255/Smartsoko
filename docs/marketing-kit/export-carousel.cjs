const fs = require('fs');
const path = require('path');
const {chromium} = require('C:/Users/Dvid/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.join(__dirname,'share');
const slides=[
 ['TUNAJIANDAA KUANZA','Soko la karibu.<br>Kwa maisha yako.','SmartSoko inajiandaa kuanza majaribio Kunduchi na Tegeta.','Fahamu SmartSoko →'],
 ['KWA WATEJA','Unahitaji nini<br>kutoka kwa<br>wauzaji wa karibu?','Vyakula, mboga, matunda au bidhaa za matumizi ya kila siku? Tuambie unachotafuta.','Pata taarifa za uzinduzi →'],
 ['KWA WAUZAJI','Una mgahawa<br>au duka?','Ulizia jinsi ya kushiriki katika majaribio: bidhaa, oda, usafirishaji, gharama na masharti.','Zungumza na SmartSoko →'],
 ['TUANDIKIE WHATSAPP','Tuanze<br>mazungumzo.','Tuma “MTEJA” kupata taarifa au “MUUZAJI” kuulizia kujiunga.','0620771067']
];
function html(k,title,body,cta,n,qr){return `<!doctype html><html lang="sw"><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}.art{width:1080px;height:1080px;background:${n===3?'#173f32':'#f8f5eb'};color:${n===3?'#f8f5eb':'#173f32'};padding:70px;display:flex;flex-direction:column}.brand{font-size:43px;font-weight:800;letter-spacing:-2px}.k{font-size:22px;font-weight:700;letter-spacing:3px;color:${n===3?'#efb55e':'#865315'};margin-top:65px}h1{font-size:87px;line-height:1.03;letter-spacing:-3px;margin:35px 0}p{font-size:32px;line-height:1.45;margin:0;max-width:930px}.cta{margin-top:auto;font-size:34px;font-weight:700;border-top:2px solid #9fae9f;padding-top:28px}.footer{display:flex;justify-content:space-between;font-size:22px;margin-top:28px;gap:15px}.qr{width:330px;height:330px;margin-top:28px;image-rendering:pixelated}.qr-title{font-size:72px;margin-top:32px}.qr-contact{font-size:48px;font-weight:800;margin-top:20px}</style><main class="art"><div class="brand">SmartSoko</div><div class="k">${k}</div><h1 class="${qr?'qr-title':''}">${title}</h1><p>${body}</p>${qr?`<img class="qr" src="${qr}" alt="QR code ya WhatsApp"><div class="qr-contact">0620771067</div>`:''}<div class="cta">${cta}</div><div class="footer"><span>Kunduchi &amp; Tegeta</span><span>${qr?'Pata taarifa za uzinduzi':`${n+1} / 4`}</span></div></main></html>`;}
(async()=>{
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});const page=await browser.newPage({viewport:{width:1080,height:1080},deviceScaleFactor:1});
const qr='data:image/png;base64,'+fs.readFileSync(path.join(out,'whatsapp-qr.png')).toString('base64');
const jobs=slides.map((s,n)=>({name:'carousel-sw-0'+(n+1),html:html(...s,n)}));
jobs.push({name:'whatsapp-qr-poster-sw',html:html('KUNDUCHI NA TEGETA','Karibu SmartSoko.','Skeni kuzungumza nasi kuhusu uzinduzi au kujiunga kama muuzaji.','Tunajiandaa kuanza majaribio.',0,qr)});
for(const job of jobs){fs.writeFileSync(path.join(out,job.name+'.html'),job.html);await page.setContent(job.html);await page.evaluate(()=>document.fonts.ready);const bad=await page.evaluate(()=>[...document.querySelectorAll('.art,.art *')].some(e=>e.scrollWidth>e.clientWidth+1||e.getBoundingClientRect().bottom>1080));if(bad)throw Error(job.name+' overflow');await page.screenshot({path:path.join(out,job.name+'.png')});console.log(job.name+' OK')}
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
