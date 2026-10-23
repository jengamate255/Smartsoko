from create_booklets import merchant, customer, OUT
from pathlib import Path
from html import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
import pypdfium2 as pdfium

dest=OUT.parents[1]/'output'/'pdf'
dest.mkdir(parents=True,exist_ok=True)
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='BookTitle',fontName='Helvetica-Bold',fontSize=23,leading=26,spaceAfter=9,textColor=colors.black))
styles.add(ParagraphStyle(name='SwTitle',fontName='Helvetica',fontSize=13,leading=17,spaceAfter=17,textColor=colors.black))
styles.add(ParagraphStyle(name='Sub',fontName='Helvetica-Bold',fontSize=11,leading=14,spaceBefore=8,spaceAfter=5,textColor=colors.black))
styles.add(ParagraphStyle(name='Copy',fontName='Helvetica',fontSize=10,leading=13,spaceAfter=7))
def para(text,style):return Paragraph(escape(text).replace('\n','<br/>'),styles[style])
def footer(c,d):
    c.setFont('Helvetica',8);c.setFillColor(colors.HexColor('#555555'))
    c.drawString(42,26,'SmartSoko  |  English and Swahili  |  Kiingereza na Kiswahili')
    c.drawRightString(A4[0]-42,26,str(d.page))
for stem,pages in [('SmartSoko-SME-Manual-English-Swahili',merchant),('SmartSoko-Customer-Guide-English-Swahili',customer)]:
    story=[]
    for idx,(title,sw,blocks) in enumerate(pages):
        if idx:story.append(PageBreak())
        story += [para(title,'BookTitle'),para(sw,'SwTitle')]
        for eh,en,sh,swtxt in blocks:
            story += [para(eh,'Sub'),para(en,'Copy'),para(sh,'Sub'),para(swtxt,'Copy')]
    path=dest/(stem+'.pdf')
    SimpleDocTemplate(str(path),pagesize=A4,leftMargin=42,rightMargin=42,topMargin=39,bottomMargin=46,title=pages[0][0],author='SmartSoko').build(story,onFirstPage=footer,onLaterPages=footer)
    pdf=pdfium.PdfDocument(str(path))
    print(stem,len(pdf),'pages')
    qa=OUT/('qa-'+stem);qa.mkdir(exist_ok=True)
    for i,page in enumerate(pdf):
        page.render(scale=1.2).to_pil().save(qa/f'page-{i+1}.png')
        print(i+1,len(page.get_textpage().get_text_range()))
