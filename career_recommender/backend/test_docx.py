from htmldocx import HtmlToDocx
from docx import Document

document = Document()
new_parser = HtmlToDocx()
new_parser.add_html_to_document('<h1>Hello</h1><p style="color:red">World</p>', document)
document.save('test.docx')
