from create_booklets import merchant, customer, OUT
from pathlib import Path
from html import escape
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
import pypdfium2 as pdfium

ROOT=OUT.parents[1]
DEST=ROOT/'output/pdf'
ART=OUT/'assets/smartsoko-marketplace-illustration.png'
W,H=A4
GREEN=HexColor('#154638'); ORANGE=HexColor('#D86B30'); CREAM=HexColor('#F8F4EA')
GREY=HexColor('#52645C')
styles={
 'title':ParagraphStyle('title',fontName='Helvetica-Bold',fontSize=24,leading=27,textColor=black),
 'swtitle':ParagraphStyle('swtitle',fontName='Helvetica',fontSize=13,leading=17,textColor=black),
 'heading':ParagraphStyle('heading',fontName='Helvetica-Bold',fontSize=11,leading=14,textColor=black),
 'body':ParagraphStyle('body',fontName='Helvetica',fontSize=10,leading=13.5,textColor=black),
 'cover':ParagraphStyle('cover',fontName='Helvetica-Bold',fontSize=34,leading=37,textColor=black),
 'intro':ParagraphStyle('intro',fontName='Helvetica',fontSize=12,leading=17,textColor=black)
}
def p(c,text,x,top,width,style='body'):
    obj=Paragraph(escape(text).replace('\n','<br/>'),styles[style])
    _,height=obj.wrap(width,H)
    obj.drawOn(c,x,top-height)
    return top-height

def base(c,n,audience):
    c.setFillColor(CREAM);c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(GREEN);c.rect(0,H-8,W,8,fill=1,stroke=0)
    c.setFillColor(black);c.setFont('Helvetica-Bold',13);c.drawString(38,H-36,'SmartSoko')
    c.setFont('Helvetica',8);c.drawRightString(W-38,H-34,audience)
    c.setFillColor(GREY);c.setFont('Helvetica',8)
    c.drawString(38,25,'English + Kiswahili    |    SmartSoko')
    c.drawRightString(W-38,25,f'{n:02d}')

def art(c,x,top,w,h):
    # Preserve the illustration aspect ratio inside a clipped banner frame.
    from PIL import Image
    with Image.open(ART) as im: iw,ih=im.size
    scale=max(w/iw,h/ih); dw,dh=iw*scale,ih*scale
    c.saveState();path=c.beginPath();path.rect(x,top-h,w,h);c.clipPath(path,stroke=0)
    image_y=top-dh if h<150 else top-h+(h-dh)/2
    c.drawImage(str(ART),x+(w-dw)/2,image_y,dw,dh,mask='auto');c.restoreState()

def process(c,labels,swlabels,y):
    span=(W-76)/len(labels)
    for i,(en,sw) in enumerate(zip(labels,swlabels)):
        x=38+i*span
        c.setFillColor(ORANGE);c.circle(x+11,y-11,11,fill=1,stroke=0)
        c.setFillColor(white);c.setFont('Helvetica-Bold',10);c.drawCentredString(x+11,y-14,str(i+1))
        p(c,en,x,y-31,span-10,'heading');p(c,sw,x,y-49,span-10,'body')

def cover(c,merchant_mode):
    base(c,1,'SUPERMARKETS AND SMEs' if merchant_mode else 'CUSTOMER GUIDE')
    y=p(c,'Your shop on SmartSoko' if merchant_mode else 'Your shopping with SmartSoko',38,H-80,W-76,'cover')
    y=p(c,'Duka lako kwenye SmartSoko' if merchant_mode else 'Ununuzi wako kupitia SmartSoko',38,y-16,W-76,'swtitle')
    art(c,0,y-28,W,285)
    top=y-340
    top=p(c,'A practical guide for owners and staff' if merchant_mode else 'Food and everyday essentials from local shops',38,top,W-76,'heading')
    top=p(c,'Mwongozo wa vitendo kwa wamiliki na wafanyakazi' if merchant_mode else 'Vyakula na bidhaa za kila siku kutoka maduka ya karibu',38,top-7,W-76,'intro')
    process(c,['List products','Pack orders','Check payments'] if merchant_mode else ['Choose','Order','Receive'],['Weka bidhaa','Fungasha oda','Kagua malipo'] if merchant_mode else ['Chagua','Agiza','Pokea'],top-38)
    c.showPage()

def content(c,page,n,audience,idx):
    title,sw,blocks=page
    base(c,n,audience)
    y=p(c,title,38,H-65,W-76,'title')
    y=p(c,sw,38,y-8,W-76,'swtitle')
    art(c,38,y-15,W-76,102)
    top=y-135
    c.setFillColor(GREEN);c.setFont('Helvetica-Bold',9)
    cw=(W-96)/2
    c.drawString(38,top,'ENGLISH');c.drawString(58+cw,top,'KISWAHILI')
    top-=17
    for eh,en,sh,swtxt in blocks:
        en=en.replace('Record the agreed details on the final page.','Record the agreed details on page 7.')
        swtxt=swtxt.replace('Andika makubaliano katika ukurasa wa mwisho.','Andika makubaliano katika ukurasa wa 7.')
        # Replace manuscript contents entries with the illustrated edition page numbers.
        if eh=='Inside this booklet':
            en='3 Prepare your shop\n4 Add products\n5 Fulfil orders\n6 Check money and solve problems\n7 Daily routines and launch record\n8 First day checklist'
            swtxt='3 Andaa duka\n4 Weka bidhaa\n5 Shughulikia oda\n6 Kagua fedha na tatua matatizo\n7 Ratiba za kila siku na taarifa za kuanza\n8 Orodha ya siku ya kwanza'
        ly=p(c,eh,38,top,cw,'heading');ly=p(c,en,38,ly-5,cw)
        ry=p(c,sh,58+cw,top,cw,'heading');ry=p(c,swtxt,58+cw,ry-5,cw)
        top=min(ly,ry)-16
    if top<50:raise RuntimeError(f'Page {n} overflows at {top}')
    c.showPage()

def back(c,n,is_merchant):
    base(c,n,'QUICK REFERENCE / KUMBUKUMBU YA HARAKA')
    title='Your first day checklist' if is_merchant else 'Ready for your next shop'
    sw='Orodha ya siku yako ya kwanza' if is_merchant else 'Jiandae kwa ununuzi wako ujao'
    y=p(c,title,38,H-72,W-76,'title');y=p(c,sw,38,y-10,W-76,'swtitle')
    art(c,38,y-20,W-76,180);y-=225
    rows=[('Check prices and stock','Kagua bei na idadi ya bidhaa'),('Confirm staff can see new orders','Hakikisha wafanyakazi wanaona oda mpya'),('Practise packing and handover','Fanya mazoezi ya kufungasha na kukabidhi'),('Confirm payment and support arrangements','Thibitisha utaratibu wa malipo na msaada')] if is_merchant else [('Check product sizes and quantities','Kagua ukubwa na idadi ya bidhaa'),('Check the address and phone number','Kagua anwani na namba ya simu'),('Review the final amount before confirming','Kagua kiasi cha mwisho kabla ya kuthibitisha'),('Keep your order and payment references','Hifadhi namba za oda na malipo')]
    for en,sw in rows:
        c.setStrokeColor(GREEN);c.setLineWidth(1);c.rect(39,y-12,11,11,fill=0,stroke=1)
        y=p(c,en,62,y,W-110,'heading');y=p(c,sw,62,y-4,W-110)-18
    p(c,'SmartSoko support / Msaada wa SmartSoko\n_________________________________________________',38,y-7,W-76,'body')
    c.showPage()

if __name__ == '__main__':
    for stem,pages,is_merchant in [('SmartSoko-SME-Manual-Illustrated',merchant,True),('SmartSoko-Customer-Guide-Illustrated',customer,False)]:
        path=DEST/(stem+'.pdf');c=canvas.Canvas(str(path),pagesize=A4)
        c.setTitle(pages[0][0]);c.setAuthor('SmartSoko')
        cover(c,is_merchant)
        for idx,page in enumerate(pages):content(c,page,idx+2,'MERCHANT MANUAL' if is_merchant else 'CUSTOMER GUIDE',idx)
        back(c,len(pages)+2,is_merchant);c.save()
        pdf=pdfium.PdfDocument(str(path));qa=OUT/('qa-'+stem);qa.mkdir(exist_ok=True)
        for i,page in enumerate(pdf):page.render(scale=1.3).to_pil().save(qa/f'page-{i+1}.png')
        print(path,len(pdf),'pages')
