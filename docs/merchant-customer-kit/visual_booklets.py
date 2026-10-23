"""Bilingual illustrated manuals with distinct artwork and editable vector diagrams."""
from pathlib import Path
import math
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.pagesizes import A4
from html import escape
import pypdfium2 as pdfium
from create_booklets import merchant, customer, OUT

W,H=A4
ROOT=OUT.parents[1]; DEST=ROOT/'output/pdf'; ASSETS=OUT/'assets'
LOGO=ASSETS/'smartsoko-header-logo.png'
GREEN=HexColor('#154638'); ORANGE=HexColor('#D86B30'); CREAM=HexColor('#FBF8F0')
PALE=HexColor('#E5EEE5'); INK=HexColor('#172D25'); MUTED=HexColor('#52645C')
STYLES={
 'title':ParagraphStyle('t',fontName='Helvetica-Bold',fontSize=24,leading=28,textColor=INK),
 'swtitle':ParagraphStyle('s',fontName='Helvetica',fontSize=13,leading=17,textColor=INK),
 'heading':ParagraphStyle('h',fontName='Helvetica-Bold',fontSize=11,leading=14,textColor=INK),
 'body':ParagraphStyle('b',fontName='Helvetica',fontSize=10.5,leading=14.5,textColor=INK),
 'small':ParagraphStyle('sm',fontName='Helvetica',fontSize=9,leading=12,textColor=MUTED),
 'cover':ParagraphStyle('c',fontName='Helvetica-Bold',fontSize=35,leading=39,textColor=INK),
 'center':ParagraphStyle('ce',fontName='Helvetica-Bold',fontSize=10.5,leading=14,alignment=1,textColor=INK)
}

def text(c,s,x,y,width,style='body'):
    obj=Paragraph(escape(s).replace('\n','<br/>'),STYLES[style]); _,h=obj.wrap(width,H)
    if y-h<43: raise ValueError(f'Text overflows page {c.getPageNumber()}: {s[:45]} at {y-h}')
    obj.drawOn(c,x,y-h);return y-h

def base(c,kind):
    c.setFillColor(CREAM);c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(GREEN);c.rect(0,H-7,W,7,fill=1,stroke=0)
    draw_logo(c,38,H-17,198 if c.getPageNumber()==1 else 142,43 if c.getPageNumber()==1 else 31)
    c.setFillColor(GREEN)
    c.setFont('Helvetica',8);c.drawRightString(W-38,H-33,kind)
    c.setFillColor(MUTED);c.setFont('Helvetica',8)
    c.drawString(38,25,'English + Kiswahili  |  SmartSoko')
    c.drawRightString(W-38,25,f'{c.getPageNumber():02d}')

def draw_logo(c,x,top,max_width,max_height):
    # Fit the visible transparent artwork, leaving its original pixels untouched.
    with Image.open(LOGO) as im:
        iw,ih=im.size
        bounds=im.getchannel('A').getbbox() if 'A' in im.getbands() else (0,0,iw,ih)
    left,upper,right,lower=bounds
    scale=min(max_width/(right-left),max_height/(lower-upper))
    c.drawImage(str(LOGO),x-left*scale,top-(ih-upper)*scale,iw*scale,ih*scale,mask='auto')

def title(c,en,sw,kind='VISUAL GUIDE / MWONGOZO WA PICHA'):
    base(c,kind);y=text(c,en,38,H-65,W-76,'title')
    return text(c,sw,38,y-9,W-76,'swtitle')-23

def art(c,key,x,y,w,h):
    path=ASSETS/f'{key}.png'
    with Image.open(path) as im: iw,ih=im.size
    scale=min(w/iw,h/ih);dw,dh=iw*scale,ih*scale
    c.drawImage(str(path),x+(w-dw)/2,y-h+(h-dh)/2,dw,dh,mask='auto')

def arrow(c,x1,y1,x2,y2,color=ORANGE):
    c.setStrokeColor(color);c.setFillColor(color);c.setLineWidth(1.8)
    c.line(x1,y1,x2,y2);a=math.atan2(y2-y1,x2-x1);sz=6
    q=c.beginPath();q.moveTo(x2,y2)
    q.lineTo(x2-sz*math.cos(a-.5),y2-sz*math.sin(a-.5))
    q.lineTo(x2-sz*math.cos(a+.5),y2-sz*math.sin(a+.5));q.close();c.drawPath(q,fill=1,stroke=0)

def icon(c,kind,x,y,size=30):
    c.saveState();c.translate(x,y);c.scale(size/32,size/32)
    c.setStrokeColor(GREEN);c.setFillColor(GREEN);c.setLineWidth(1.8)
    if kind=='phone':
        c.roundRect(7,1,18,30,3,fill=0,stroke=1);c.line(12,27,20,27);c.circle(16,5,1,fill=1,stroke=0)
        c.rect(11,12,10,10,fill=0,stroke=1)
    elif kind=='shop':
        c.rect(4,2,24,19,fill=0,stroke=1);c.rect(3,21,26,7,fill=0,stroke=1)
        for xx in [8,14,20,26]:c.line(xx,21,xx,28)
        c.rect(8,2,7,11,fill=0,stroke=1);c.rect(19,10,5,6,fill=0,stroke=1)
    elif kind=='box':
        c.rect(3,4,26,23,fill=0,stroke=1);c.line(3,20,29,20);c.line(16,4,16,27)
        c.line(8,11,12,7);c.line(12,7,21,16)
    elif kind=='bottle':
        c.setFillColor(HexColor('#E8BD43'))
        c.roundRect(9,1,14,21,3,fill=1,stroke=1)
        c.rect(12,22,8,7,fill=1,stroke=1)
        c.setFillColor(GREEN);c.rect(11,29,10,3,fill=1,stroke=0)
        c.setFillColor(CREAM);c.rect(11,8,10,8,fill=1,stroke=0)
    elif kind=='cart':
        c.line(1,28,6,28);c.line(6,28,10,10);c.line(10,10,27,10)
        c.line(8,23,30,23);c.line(30,23,27,14);c.line(27,14,9,14)
        c.circle(12,4,2.3,fill=0,stroke=1);c.circle(25,4,2.3,fill=0,stroke=1)
    elif kind=='truck':
        c.rect(1,10,18,17,fill=0,stroke=1);c.rect(19,10,11,11,fill=0,stroke=1)
        c.circle(8,7,4,fill=0,stroke=1);c.circle(25,7,4,fill=0,stroke=1)
        c.line(22,18,27,18)
    elif kind=='money':
        c.roundRect(1,7,30,21,3,fill=0,stroke=1);c.circle(16,17,5,fill=0,stroke=1)
        c.line(5,11,8,11);c.line(24,24,27,24)
    elif kind=='check':
        c.circle(16,16,14,fill=0,stroke=1);c.line(8,16,14,10);c.line(14,10,24,23)
    elif kind=='list':
        c.rect(5,1,22,30,fill=0,stroke=1)
        for yy in [23,16,9]:c.circle(10,yy,1,fill=1,stroke=0);c.line(14,yy,23,yy)
    elif kind=='pin':
        q=c.beginPath();q.moveTo(16,1);q.curveTo(-7,22,7,32,16,31);q.curveTo(34,32,36,19,16,1)
        c.drawPath(q,fill=0,stroke=1);c.circle(16,22,4,fill=0,stroke=1)
    c.restoreState()

def strip(c,steps,y):
    span=(W-76)/len(steps)
    for i,(kind,en,sw) in enumerate(steps):
        x=38+i*span;icon(c,kind,x+span/2-15,y-32,30)
        text(c,en+'\n'+sw,x,y-42,span,'center')
        if i<len(steps)-1:arrow(c,x+span-16,y-18,x+span+12,y-18)

def pair(c,en,sw,x,y,w):
    y=text(c,en,x,y,w,'heading');return text(c,sw,x,y-4,w,'body')

def numbered(c,n,x,y):
    c.setFillColor(ORANGE);c.circle(x,y,11,fill=1,stroke=0)
    c.setFillColor(white);c.setFont('Helvetica-Bold',10);c.drawCentredString(x,y-3,str(n))

def cover(c,is_merchant):
    base(c,'SUPERMARKETS AND SMEs' if is_merchant else 'CUSTOMER GUIDE')
    y=text(c,'Your shop on SmartSoko' if is_merchant else 'Shop with SmartSoko',38,H-83,W-76,'cover')
    y=text(c,'Duka lako kwenye SmartSoko' if is_merchant else 'Nunua kupitia SmartSoko',38,y-13,W-76,'swtitle')
    art(c,'catalogue' if is_merchant else 'shopping',38,y-25,W-76,325)
    y-=375
    y=pair(c,'A practical illustrated manual for owners and staff' if is_merchant else 'An illustrated guide from your basket to your doorstep',
      'Mwongozo wa picha kwa wamiliki na wafanyakazi' if is_merchant else 'Mwongozo wa picha kutoka kikapuni hadi nyumbani',38,y,W-76)
    strip(c,[('shop','List products','Weka bidhaa'),('box','Pack orders','Fungasha oda'),('money','Check payments','Kagua malipo')] if is_merchant else [('cart','Choose','Chagua'),('phone','Order','Agiza'),('truck','Receive','Pokea')],y-28)
    text(c,'4 visual explainers inside / Maelezo 4 ya picha ndani',38,85,W-76,'small')
    c.showPage()

STRIPS=[ [('shop','Your shop','Duka lako'),('phone','Online catalogue','Bidhaa mtandaoni'),('cart','Customer orders','Oda za wateja')],
 [('phone','Sign in','Ingia'),('pin','Check details','Kagua taarifa'),('check','Practise','Fanya mazoezi')],
 [('box','Count stock','Hesabu bidhaa'),('phone','Save product','Hifadhi bidhaa'),('check','Check listing','Kagua taarifa')],
 [('list','Read order','Soma oda'),('box','Pack','Fungasha'),('truck','Hand over','Kabidhi')],
 [('list','Order records','Kumbukumbu'),('money','Payment status','Hali ya malipo'),('check','Reconcile','Linganisha')]]

def reading(c,page,idx,is_merchant=True):
    en,sw,blocks=page;y=title(c,en,sw,'MERCHANT MANUAL' if is_merchant else 'CUSTOMER GUIDE')
    strip(c,STRIPS[min(idx,4)] if is_merchant else ([('cart','Basket','Kikapu'),('pin','Address','Anwani'),('money','Payment','Malipo')] if idx==0 else [('truck','Track','Fuatilia'),('box','Check items','Kagua bidhaa'),('phone','Get help','Pata msaada')]),y)
    top=y-104;cw=(W-98)/2
    c.setFillColor(GREEN);c.setFont('Helvetica-Bold',8.5);c.drawString(38,top,'ENGLISH');c.drawString(60+cw,top,'KISWAHILI');top-=18
    for eh,body,sh,swbody in blocks:
        if not is_merchant and eh=='Stay safe and stay in touch':
            body=body.split('\nCustomer link')[0]
        if eh=='Inside this booklet':
            body='3 Prepare your shop\n4 Product listing diagram\n5 Product instructions\n6 Order instructions\n7 Order flowchart\n8 Finance and support\n9 Payment infographic\n10 Daily routine and launch record\n11 How SmartSoko connects everyone\n12 First day checklist'
            swbody='3 Andaa duka\n4 Mchoro wa taarifa za bidhaa\n5 Maelekezo ya bidhaa\n6 Maelekezo ya oda\n7 Mchoro wa hatua za oda\n8 Fedha na msaada\n9 Mchoro wa malipo\n10 Ratiba na taarifa za kuanza\n11 SmartSoko inaunganisha wahusika\n12 Orodha ya siku ya kwanza'
        body=body.replace('Record the agreed details on the final page.','Record the agreed details on page 10.')
        swbody=swbody.replace('Andika makubaliano katika ukurasa wa mwisho.','Andika makubaliano katika ukurasa wa 10.')
        ly=text(c,eh,38,top,cw,'heading');ly=text(c,body,38,ly-5,cw)
        ry=text(c,sh,60+cw,top,cw,'heading');ry=text(c,swbody,60+cw,ry-5,cw)
        top=min(ly,ry)-17
    c.showPage()

def catalogue(c):
    y=title(c,'Build a product customers can understand','Weka bidhaa ambayo mteja ataielewa')
    art(c,'catalogue',38,y,238,159)
    pair(c,'Every listing answers four questions','Kila bidhaa ijibu maswali manne',300,y-13,255)
    text(c,'What is it? What size? What price? Is it available?\n\nNi bidhaa gani? Ukubwa gani? Bei gani? Inapatikana?',300,y-69,255)
    top=y-190
    # Schematic product card with numbered annotation pointers, not an app screenshot.
    c.setFillColor(white);c.setStrokeColor(PALE);c.roundRect(38,top-280,229,280,12,fill=1,stroke=1)
    icon(c,'bottle',126,top-70,50)
    text(c,'Sunflower oil 1 litre',53,top-91,195,'heading')
    text(c,'Mafuta ya alizeti lita 1',53,top-112,195,'body')
    text(c,'TSh 6,500',53,top-150,195,'title')
    text(c,'Stock / Idadi  12',53,top-196,195,'heading')
    text(c,'Available / Inapatikana',53,top-228,195,'body')
    for i,(dy,en,sw) in enumerate([(55,'Clear picture','Picha sahihi'),(115,'Name and pack size','Jina na ukubwa wa kifurushi'),(165,'Price for one unit','Bei ya kipimo kimoja'),(232,'Stock and availability','Idadi na upatikanaji')],1):
        yy=top-dy;arrow(c,270,yy,299,yy);numbered(c,i,316,yy)
        pair(c,en,sw,338,yy+12,216)
    bottom=top-307
    pair(c,'Save then check the listing again','Hifadhi kisha kagua tena taarifa',38,bottom,W-76)
    text(c,'Illustrative product card and prices, not a live app screen.\nMfano wa taarifa na bei za bidhaa, si picha ya moja kwa moja ya programu.',38,bottom-63,W-76,'small')
    c.showPage()

def flow_row(c,n,kind,en,sw,detail,detail_sw,y):
    numbered(c,n,49,y-18);icon(c,kind,78,y-34,29)
    yy=pair(c,en,sw,124,y,200)
    text(c,detail+'\n'+detail_sw,342,y,211,'small')
    return min(yy,y-52)

def order_flow(c):
    y=title(c,'From a new order to handover','Kutoka oda mpya hadi kukabidhi')
    art(c,'packing',38,y,235,156)
    pair(c,'Check first then accept','Kagua kwanza kisha kubali',300,y-15,252)
    text(c,'Use the next action shown in Orders. Update the status as work is completed.\n\nTumia hatua inayofuata katika Orders. Sasisha hali kadiri kazi inavyokamilika.',300,y-69,252)
    y-=188
    rows=[('list','Read and check stock','Soma na kagua bidhaa','Verify items and quantities.','Hakikisha bidhaa na idadi.'),('check','Accept the order','Kubali oda','Only after checking availability.','Baada ya kuhakiki upatikanaji.'),('box','Pick and pack','Kusanya na fungasha','Match items to the order.','Linganisha bidhaa na oda.'),('truck','Ready and hand over','Tayari na kukabidhi','Match the order reference.','Linganisha namba ya oda.')]
    for i,row in enumerate(rows,1):
        flow_row(c,i,*row,y)
        if i<4:arrow(c,49,y-33,49,y-63)
        y-=78
    y-=7
    pair(c,'Item missing at the stock check','Bidhaa haipo wakati wa kukagua',38,y,W-76)
    text(c,'Contact the customer and agree any replacement or price change. Get support for changes the app cannot make.\nWasiliana na mteja na mkubaliane kuhusu mbadala au tofauti ya bei. Pata msaada kwa mabadiliko ambayo programu haiwezi kufanya.',38,y-46,W-76)
    c.showPage()

def money(c):
    y=title(c,'Understand the money in your business','Elewa fedha za biashara yako')
    pair(c,'An order record is not proof of money received','Kumbukumbu ya oda si uthibitisho wa kupokea fedha',38,y,W-76)
    y-=75
    steps=[('list','Check the order','Kagua oda','Match the order amount and reference.','Linganisha kiasi na namba ya oda.'),('money','Review Finance','Kagua Finance','Check balances, deductions and payout history.','Kagua salio, makato na historia ya malipo.'),('phone','Check your account','Kagua akaunti yako','Match the transfer to bank or mobile money records.','Linganisha muamala na benki au fedha za simu.'),('check','Resolve any difference','Tatua tofauti','Use the order or payout reference with support.','Tumia namba ya oda au malipo kuomba msaada.')]
    for i,row in enumerate(steps,1):
        flow_row(c,i,*row,y)
        if i<4:arrow(c,49,y-35,49,y-70)
        y-=87
    y-=8
    c.setStrokeColor(PALE);c.line(38,y,W-38,y);y-=22
    text(c,'Sales to profit / Kutoka mauzo hadi faida',38,y,W-76,'heading');y-=38
    labels=[('Sales','Mauzo'),('Product costs','Gharama za bidhaa'),('Other costs','Gharama nyingine'),('Profit or loss','Faida au hasara')]
    span=(W-76)/4
    for i,(en,sw) in enumerate(labels):
        x=38+i*span;icon(c,'money' if i in [0,3] else 'list',x+42,y-37,32)
        text(c,en+'\n'+sw,x,y-48,span-4,'center')
        if i<3:
            c.setFillColor(ORANGE);c.setFont('Helvetica-Bold',19);c.drawCentredString(x+span-4,y-25,'=' if i==2 else '-')
    text(c,'Other costs can include agreed platform charges, packaging, refunds and delivery costs you cover.\nGharama nyingine zinaweza kuwa ada zilizokubaliwa, vifungashio, marejesho na usafirishaji unaolipia.',38,y-112,W-76,'small')
    c.showPage()

def ecosystem(c):
    y=title(c,'How SmartSoko connects everyone','Jinsi SmartSoko inavyowaunganisha wahusika')
    art(c,'shopping',38,y,247,164);art(c,'delivery',309,y,247,164)
    y-=198
    rows=[('phone','Customer places an order','Mteja anatuma oda','Products, address and payment option.','Bidhaa, anwani na njia ya malipo.'),('shop','Shop reviews and prepares','Duka linakagua na kuandaa','Confirm stock then pick and pack.','Hakikisha bidhaa zipo kisha fungasha.'),('truck','Delivery partner collects','Msafirishaji anachukua','Match the order before handover.','Linganisha oda kabla ya kukabidhi.'),('check','Customer receives and checks','Mteja anapokea na kukagua','Check items and report any issue.','Kagua bidhaa na toa taarifa ya tatizo.')]
    for i,row in enumerate(rows,1):
        flow_row(c,i,*row,y)
        if i<4:arrow(c,49,y-34,49,y-69)
        y-=85
    text(c,'Delivery is subject to the service available for that order. Pickup applies only when offered.\nUsafirishaji hutegemea huduma inayopatikana kwa oda hiyo. Kuchukua dukani kunatumika pale kunaporuhusiwa.',38,y-7,W-76,'small')
    c.showPage()

def daily(c):
    y=title(c,'Daily routine and launch record','Ratiba ya kila siku na taarifa za kuanza','MERCHANT MANUAL')
    b=merchant[5][2][0];cw=(W-98)/2
    ly=text(c,b[0],38,y,cw,'heading');ly=text(c,b[1],38,ly-6,cw)
    ry=text(c,b[2],60+cw,y,cw,'heading');ry=text(c,b[3],60+cw,ry-6,cw)
    y=min(ly,ry)-30
    y=pair(c,'Complete with your SmartSoko representative','Jaza pamoja na mwakilishi wa SmartSoko',38,y,W-76)-23
    fields=[('Shop name','Jina la duka'),('Merchant link','Kiungo cha mfanyabiashara'),('Customer link','Kiungo cha wateja'),('Support contact','Mawasiliano ya msaada'),('Service area','Eneo la huduma'),('Charges and commission','Ada na kamisheni'),('Delivery arrangement','Utaratibu wa usafirishaji'),('Payout timing and method','Muda na njia ya malipo'),('Returns procedure','Utaratibu wa kurudisha bidhaa'),('Staff trained and date','Waliofundishwa na tarehe')]
    for i,(en,sw) in enumerate(fields):
        col=i%2;row=i//2;x=38+col*(cw+22);yy=y-row*61
        text(c,en+' / '+sw,x,yy,cw,'small');c.setStrokeColor(MUTED);c.setLineWidth(.6);c.line(x,yy-41,x+cw,yy-41)
    c.showPage()

def customer_order(c):
    y=title(c,'Place an order in four steps','Tuma oda kwa hatua nne')
    art(c,'shopping',38,y,230,153)
    pair(c,'Choose carefully before confirming','Chagua kwa makini kabla ya kuthibitisha',295,y-10,260)
    text(c,'Check brand, pack size, quantity and delivery details.\n\nKagua chapa, ukubwa wa kifurushi, idadi na taarifa za usafirishaji.',295,y-79,260)
    y-=186
    rows=[('shop','Choose shop and products','Chagua duka na bidhaa','Browse the available catalogue.','Tazama bidhaa zinazopatikana.'),('cart','Review your basket','Kagua kikapu chako','Check quantities and pack sizes.','Kagua idadi na ukubwa.'),('pin','Add delivery details','Weka taarifa za kupeleka','Use a reachable phone number.','Weka simu inayopatikana.'),('money','Review total and confirm','Kagua jumla na uthibitishe','Choose an available payment option.','Chagua njia ya malipo iliyopo.')]
    for i,row in enumerate(rows,1):
        flow_row(c,i,*row,y)
        if i<4:arrow(c,49,y-34,49,y-69)
        y-=84
    pair(c,'Save the order reference','Hifadhi namba ya oda',38,y-6,W-76)
    text(c,'If payment is uncertain, check the order and transaction before paying again.\nMalipo yasipoeleweka, kagua oda na muamala kabla ya kulipa tena.',38,y-55,W-76,'small')
    c.showPage()

def checkout(c):
    y=title(c,'Know your total before you confirm','Jua jumla kabla ya kuthibitisha')
    art(c,'catalogue',38,y,215,143)
    pair(c,'Example basket','Mfano wa kikapu',285,y-14,268)
    text(c,'2 bottles of cooking oil\nTSh 6,500 each\n\nChupa 2 za mafuta\nTSh 6,500 kila moja',285,y-59,268)
    y-=177
    c.setStrokeColor(PALE);c.setLineWidth(1)
    rows=[('Products / Bidhaa','2 x 6,500','13,000'),('Delivery / Usafirishaji','Example fee / Ada ya mfano','+ 2,000'),('Other charges / Ada nyingine','None in this example / Hakuna katika mfano huu','+ 0')]
    for en,sub,amount in rows:
        icon(c,'list' if 'Products' in en else 'truck' if 'Delivery' in en else 'money',43,y-32,30)
        text(c,en,92,y,310,'heading');text(c,sub,92,y-22,310,'small')
        c.setFillColor(INK);c.setFont('Helvetica-Bold',19);c.drawRightString(W-40,y-25,amount)
        c.line(38,y-59,W-38,y-59);y-=79
    text(c,'Final amount / Kiasi cha mwisho',38,y,W-76,'heading')
    c.setFillColor(GREEN);c.setFont('Helvetica-Bold',32);c.drawString(38,y-49,'TSh 15,000')
    y-=83
    pair(c,'Use the actual total shown at checkout','Tumia jumla halisi inayoonyeshwa wakati wa kulipia',38,y,W-76)
    text(c,'All amounts above are illustrative. Actual prices, delivery fees, other charges and discounts may differ.\nKiasi chote hapo juu ni mfano. Bei halisi, ada za usafirishaji, gharama nyingine na punguzo vinaweza kutofautiana.',38,y-65,W-76,'small')
    c.showPage()

def tracking(c):
    y=title(c,'Follow your shopping to the door','Fuatilia bidhaa hadi nyumbani')
    art(c,'packing',38,y,247,165);art(c,'delivery',309,y,247,165)
    y-=198
    rows=[('list','Order submitted','Oda imetumwa','Keep the reference.','Hifadhi namba ya oda.'),('box','Shop prepares items','Duka linaandaa bidhaa','Stay reachable for questions.','Patikana kwa maswali.'),('truck','Delivery in progress','Bidhaa zinasafirishwa','Follow available updates.','Fuatilia taarifa zinazopatikana.'),('check','Receive and check','Pokea na kagua','Check quantity and visible condition.','Kagua idadi na hali ya bidhaa.')]
    for i,row in enumerate(rows,1):
        flow_row(c,i,*row,y)
        if i<4:arrow(c,49,y-34,49,y-68)
        y-=82
    text(c,'This is a simplified journey, not a promised delivery time or an exact screen.\nHuu ni muhtasari wa hatua, si ahadi ya muda wa kufikishwa wala picha halisi ya programu.',38,y-12,W-76,'small')
    c.showPage()

def issues(c):
    y=title(c,'A simple path when something goes wrong','Hatua rahisi tatizo linapotokea')
    pair(c,'Keep one reference for the whole conversation','Tumia namba moja ya oda katika mawasiliano yote',38,y,W-76);y-=82
    # Three branches feed into a shared support action.
    cols=[('money','Payment unclear','Malipo hayaeleweki','Check the transaction first.','Kagua muamala kwanza.'),('box','Missing or wrong item','Bidhaa imekosekana au si sahihi','Keep details and useful photos.','Hifadhi taarifa na picha zinazofaa.'),('truck','Delivery delayed','Usafirishaji umechelewa','Check order updates.','Kagua taarifa za oda.')]
    span=(W-100)/3
    for i,(ic,en,sw,detail,dsw) in enumerate(cols):
        x=38+i*(span+12)
        icon(c,ic,x+span/2-20,y-40,40)
        z=text(c,en+'\n'+sw,x,y-57,span,'center')
        text(c,detail+'\n'+dsw,x,y-125,span,'small')
        arrow(c,x+span/2,y-190,x+span/2,y-214)
    mid=W/2;join=y-214
    c.setStrokeColor(ORANGE);c.line(38+span/2,join,38+2*(span+12)+span/2,join)
    arrow(c,mid,join,mid,join-30)
    numbered(c,1,49,join-66)
    pair(c,'Find your order reference','Tafuta namba ya oda yako',77,join-50,W-117)
    arrow(c,49,join-83,49,join-115)
    numbered(c,2,49,join-135)
    pair(c,'Contact the shop or SmartSoko support','Wasiliana na duka au msaada wa SmartSoko',77,join-119,W-117)
    arrow(c,49,join-152,49,join-184)
    numbered(c,3,49,join-204)
    pair(c,'Confirm the next step and keep the reply','Thibitisha hatua inayofuata na uhifadhi jibu',77,join-188,W-117)
    text(c,'Check payment status before paying again. Cancellation and refund terms depend on the order.\nKagua hali ya malipo kabla ya kulipa tena. Masharti ya kufuta oda na kurejesha fedha hutegemea oda.',38,join-263,W-76,'small')
    c.showPage()

def back(c,is_merchant):
    y=title(c,'Ready for your first day' if is_merchant else 'Ready for your next shop','Jiandae kwa siku yako ya kwanza' if is_merchant else 'Jiandae kwa ununuzi wako ujao','QUICK CHECKLIST / ORODHA YA UKAGUZI')
    # A checklist itself is a functional visual, with distinct icons rather than repeated artwork.
    rows=[('shop','Check prices and stock','Kagua bei na idadi ya bidhaa'),('phone','Confirm staff can see orders','Hakikisha wafanyakazi wanaona oda'),('box','Practise packing and handover','Fanya mazoezi ya kufungasha na kukabidhi'),('money','Confirm payment arrangements','Thibitisha utaratibu wa malipo')] if is_merchant else [('cart','Check product sizes and quantities','Kagua ukubwa na idadi ya bidhaa'),('pin','Check the address and phone','Kagua anwani na simu'),('money','Review the final amount','Kagua kiasi cha mwisho'),('list','Keep order and payment references','Hifadhi namba za oda na malipo')]
    for ic,en,sw in rows:
        icon(c,ic,40,y-40,35);pair(c,en,sw,96,y-2,W-173)
        c.setStrokeColor(GREEN);c.rect(W-55,y-25,14,14,fill=0,stroke=1);y-=87
    y-=10
    for label in ['Customer link / Kiungo cha wateja','Shop contact / Mawasiliano ya duka','SmartSoko support / Msaada wa SmartSoko']:
        text(c,label,38,y,W-76,'heading');c.setStrokeColor(MUTED);c.setLineWidth(.6);c.line(38,y-41,W-38,y-41);y-=70
    text(c,'Illustrations show example situations. Diagrams simplify the workflow.\nVielelezo vinaonyesha hali za mfano. Michoro inarahisisha maelezo ya hatua.',38,70,W-76,'small')
    c.showPage()

def build():
    for stem,is_merchant in [('SmartSoko-SME-Manual-Visual-Edition',True),('SmartSoko-Customer-Guide-Visual-Edition',False)]:
        path=DEST/(stem+'.pdf');c=canvas.Canvas(str(path),pagesize=A4)
        c.setTitle('SmartSoko illustrated SME manual' if is_merchant else 'SmartSoko illustrated customer guide');c.setAuthor('SmartSoko')
        cover(c,is_merchant)
        if is_merchant:
            reading(c,merchant[0],0);reading(c,merchant[1],1);catalogue(c)
            reading(c,merchant[2],2);reading(c,merchant[3],3);order_flow(c)
            reading(c,merchant[4],4);money(c);daily(c);ecosystem(c)
        else:
            reading(c,customer[0],0,False);customer_order(c);checkout(c);tracking(c)
            reading(c,customer[1],1,False);issues(c)
        back(c,is_merchant);c.save()
        pdf=pdfium.PdfDocument(str(path));expected=12 if is_merchant else 8
        assert len(pdf)==expected,(stem,len(pdf))
        qa=OUT/('qa-'+stem);qa.mkdir(exist_ok=True)
        for i,page in enumerate(pdf):page.render(scale=1.45).to_pil().save(qa/f'page-{i+1}.png')
        print(str(path),len(pdf),'pages')

if __name__=='__main__':build()
