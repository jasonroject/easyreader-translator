from pathlib import Path
import pymupdf
root=Path('tests')
source=pymupdf.open()
p=source.new_page(width=500,height=350)
p.insert_text((40,65),'Local document translation',fontsize=22)
p.insert_text((40,110),'The reader preserves the page layout.',fontsize=16)
p.insert_text((40,145),'This scanned page is used to test automatic OCR.',fontsize=16)
p.insert_text((40,180),'Fonts and models are stored locally after setup.',fontsize=16)
scan=pymupdf.open()
p=scan.new_page(width=500,height=350)
p.insert_image(p.rect,stream=source[0].get_pixmap(matrix=pymupdf.Matrix(2,2)).tobytes('png'))
scan.save(root/'scanned-demo.pdf')
