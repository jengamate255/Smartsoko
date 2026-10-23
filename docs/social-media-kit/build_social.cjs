/* Native SVG layouts using the existing SmartSoko artwork and approved logo. */
const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/Dvid/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'output/social-media');
const assets=path.join(root,'docs/merchant-customer-kit/assets');
const C={cream:'#FBF8F0',navy:'#153C6A',green:'#196047',yellow:'#F1BE42',orange:'#DC6A32',ink:'#18392F',pale:'#E8EFE5',white:'#FFFFFF'};
fs.mkdirSync(out,{recursive:true});
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const data=k=>'data:image/png;base64,'+fs.readFileSync(path.join(assets,k+'.png')).toString('base64');
const img={};for(const key of ['catalogue','shopping','packing','delivery','smartsoko-header-logo'])img[key]=data(key);
const texts={
 en:{cta:'Message us to get started',subcta:'Ask about availability in your area',merchantTag:'FOR SUPERMARKETS & LOCAL SHOPS',merchantTitle:['Your shop.','Their next order.'],merchantBody:['Bring your products to an online catalogue.','Give customers another way to shop.'],merchantFeatures:['List products','Manage orders','Check payments'],customerTag:'FOOD & EVERYDAY ESSENTIALS',customerTitle:['Groceries from','local shops.'],customerBody:['Browse products. Check your basket.','Choose from the options available to you.'],customerFeatures:['Choose','Order','Receive'],howTag:'HOW SMARTSOKO WORKS',howTitle:['Your order in','four simple steps.'],howSteps:[['Choose a shop','Browse products and pack sizes.'],['Review your basket','Check quantities, address and total.'],['Confirm your order','Choose an available payment method.'],['Track and receive','Follow updates and check your items.']],deliveryTag:'FROM THE SHOP TO YOUR DOOR',deliveryTitle:['Follow your order.','Know the next step.'],deliveryBody:['Keep your order reference handy.','Follow the updates available for your order.'],deliverySteps:['Order placed','Shop prepares','On the way','Received'],deliveryNote:'Delivery depends on service availability.'},
 sw:{cta:'Tutumie ujumbe kuanza',subcta:'Ulizia huduma katika eneo lako',merchantTag:'KWA MADUKA MAKUBWA NA YA KAWAIDA',merchantTitle:['Duka lako.','Oda yao inayofuata.'],merchantBody:['Weka bidhaa zako kwenye orodha mtandaoni.','Wape wateja njia nyingine ya kununua.'],merchantFeatures:['Weka bidhaa','Simamia oda','Kagua malipo'],customerTag:'VYAKULA NA BIDHAA ZA KILA SIKU',customerTitle:['Mahitaji yako','kutoka maduka ya karibu.'],customerBody:['Tazama bidhaa. Kagua kikapu chako.','Chagua huduma zinazopatikana kwako.'],customerFeatures:['Chagua','Agiza','Pokea'],howTag:'JINSI SMARTSOKO INAVYOFANYA KAZI',howTitle:['Oda yako kwa','hatua nne rahisi.'],howSteps:[['Chagua duka','Tazama bidhaa na ukubwa wa vifurushi.'],['Kagua kikapu','Hakikisha idadi, anwani na jumla.'],['Thibitisha oda','Chagua njia ya malipo inayopatikana.'],['Fuatilia na upokee','Fuatilia taarifa na ukague bidhaa.']],deliveryTag:'KUTOKA DUKANI HADI MLANGONI',deliveryTitle:['Fuatilia oda yako.','Jua hatua inayofuata.'],deliveryBody:['Hifadhi namba ya oda yako.','Fuatilia taarifa zinazopatikana kuhusu oda.'],deliverySteps:['Oda imetumwa','Duka linaandaa','Njiani','Imepokelewa'],deliveryNote:'Usafirishaji hutegemea huduma inayopatikana.'}
};
function make(theme,lang,format){
 const t=texts[lang],story=format==='story',H=story?1920:1350,top=story?180:58,bottom=story?1735:1290;
 const bg=theme==='customer'?C.navy:C.cream;let chunks=[],defs=[];
 const add=s=>chunks.push(s);
 const rect=(x,y,w,h,fill,r=0)=>add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`);
 const txt=(s,x,y,size=30,color=C.ink,weight=400)=>add(`<text x="${x}" y="${y}" font-family="Arial" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(s)}</text>`);
 const lines=(a,x,y,size,color,weight=400,lead=size*1.15)=>a.forEach((s,i)=>txt(s,x,y+i*lead,size,color,weight));
 const photo=(key,x,y,w,h,r=24)=>{const id='clip'+defs.length;defs.push(`<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>`);add(`<image href="${img[key]}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`);};
 const logo=()=>{rect(64,top,310,100,C.cream,16);add(`<svg x="76" y="${top+8}" width="286" height="84" viewBox="134 49 1937 625" preserveAspectRatio="xMinYMid meet"><image href="${img['smartsoko-header-logo']}" width="2172" height="724"/></svg>`);};
 const circle=(x,y,r,fill)=>add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`);
 const arrow=(x,y,color)=>add(`<path d="M${x} ${y}h28m-9 -8 9 8-9 8" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`);
 const cta=()=>{const y=bottom-116;rect(64,y,952,86,theme==='customer'?C.yellow:C.green,18);txt(t.cta,98,y+56,34,theme==='customer'?C.navy:C.white,700);arrow(955,y+43,theme==='customer'?C.navy:C.white);txt(t.subcta,66,bottom,23,theme==='customer'?'#DCE7F2':C.green);};
 const steps=(labels,y,color)=>{const span=952/labels.length;labels.forEach((s,i)=>{const x=64+i*span;circle(x+18,y-10,16,C.yellow);txt(i+1,x+12,y-4,18,C.navy,700);txt(s,x+45,y,25,color,700);if(i<labels.length-1)arrow(x+span-53,y-10,color);});};
 rect(0,0,1080,H,bg);
 // Fine brand strip drawn from the colours in the supplied logo.
 [C.navy,C.green,C.yellow,C.orange].forEach((c,i)=>rect(i*270,0,270,12,c));
 logo();
 if(theme==='merchant'){
   txt(t.merchantTag,66,top+151,22,C.green,700);
   lines(t.merchantTitle,60,top+252,lang==='sw'?70:83,C.navy,700,92);
   lines(t.merchantBody,66,top+406,28,C.ink,400,39);
   const py=top+483,ph=(bottom-223)-py;
   photo('catalogue',64,py,952,ph);
   steps(t.merchantFeatures,bottom-168,C.ink);cta();
 }else if(theme==='customer'){
   txt(t.customerTag,66,top+151,22,C.yellow,700);
   lines(t.customerTitle,60,top+251,lang==='sw'?57:83,C.white,700,88);
   lines(t.customerBody,66,top+402,28,C.white,400,39);
   const py=top+480,ph=(bottom-223)-py;
   photo('shopping',64,py,952,ph);
   steps(t.customerFeatures,bottom-168,C.white);cta();
 }else if(theme==='how'){
   txt(t.howTag,66,top+151,22,C.green,700);
   lines(t.howTitle,60,top+250,lang==='sw'?75:77,C.navy,700,88);
   const start=top+393,end=bottom-159,gap=story?24:16,rh=(end-start-gap*3)/4;
   const pics=['shopping','catalogue','packing','delivery'];
   t.howSteps.forEach(([heading,body],i)=>{
     const y=start+i*(rh+gap);rect(64,y,952,rh,i%2?C.pale:'#FFFFFF',20);
     const thumb=story?170:116;photo(pics[i],85,y+(rh-thumb)/2,thumb,thumb,14);
     const x=story?283:226;circle(x+18,y+rh/2-28,18,C.green);txt(i+1,x+12,y+rh/2-21,21,C.white,700);
     txt(heading,x+49,y+rh/2-18,33,C.navy,700);
     txt(body,x,y+rh/2+29,lang==='sw'?24:25,C.ink);
   });cta();
 }else{
   txt(t.deliveryTag,66,top+151,22,C.green,700);
   lines(t.deliveryTitle,60,top+250,lang==='sw'?66:70,C.navy,700,85);
   lines(t.deliveryBody,66,top+399,28,C.ink,400,39);
   const py=top+479,ph=(bottom-280)-py;photo('delivery',64,py,952,ph);
   const yy=bottom-230,span=952/4;
   t.deliverySteps.forEach((s,i)=>{const x=64+i*span;circle(x+18,yy-4,17,i===3?C.green:C.yellow);txt(i+1,x+12,yy+2,19,i===3?C.white:C.navy,700);txt(s,x,yy+39,23,C.ink,700);if(i<3)arrow(x+50,yy-4,C.green);});
   txt(t.deliveryNote,66,bottom-145,22,C.green);cta();
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="${H}" viewBox="0 0 1080 ${H}"><defs>${defs.join('')}</defs>${chunks.join('')}</svg>`;
}
async function build(){
 let manifest=[];
 for(const [i,theme] of ['merchant','customer','how','delivery'].entries())for(const lang of ['en','sw'])for(const format of ['feed','story']){
   const dir=path.join(out,format);fs.mkdirSync(dir,{recursive:true});
   const stem=`${i+1}-${theme}-${lang}-${format}`,svg=make(theme,lang,format);
   fs.mkdirSync(path.join(out,'editable-svg'),{recursive:true});
   fs.writeFileSync(path.join(out,'editable-svg',stem+'.svg'),svg);
   const file=path.join(dir,stem+'.png');await sharp(Buffer.from(svg)).png().toFile(file);
   const meta=await sharp(file).metadata();if(meta.width!==1080||meta.height!==(format==='feed'?1350:1920))throw Error(stem);
   manifest.push({file:path.relative(out,file),language:lang,theme,format,width:meta.width,height:meta.height});
 }
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2));
 // Review sheet uses the completed designs, not modified illustration assets.
 const feed=manifest.filter(x=>x.format==='feed');const tiles=[];
 for(let i=0;i<feed.length;i++)tiles.push({input:await sharp(path.join(out,feed[i].file)).resize(270,338).toBuffer(),left:(i%4)*290+20,top:Math.floor(i/4)*358+20});
 await sharp({create:{width:1180,height:736,channels:3,background:C.cream}}).composite(tiles).png().toFile(path.join(out,'campaign-preview.png'));
 console.log(`Created ${manifest.length} PNG graphics, matching editable SVG layouts and preview.`);
}
build().catch(e=>{console.error(e);process.exitCode=1;});
