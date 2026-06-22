import sys

file_path = r'e:/ANTIGRAVITY/PROJECT Muangmor/Smart governance ขยะเหมืองหม้อ/waste-reports.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '<button class="btn btn-xs btn-outline-primary me-1" onclick="printReceiptA4(getWastePayments().find(function(x){return x.id===\\'' + p.id + '\\'}))" title="พิมพ์"><i class="fa-solid fa-print"></i></button>'

replacement = '''<button class="btn btn-xs btn-outline-primary me-1" onclick="printReceiptA4(getWastePayments().find(function(x){return x.id===\\'' + p.id + '\\'}))" title="พิมพ์ A4"><i class="fa-solid fa-print"></i></button>' +
                    '<button class="btn btn-xs btn-outline-warning me-1" onclick="printReceiptSlip(getWastePayments().find(function(x){return x.id===\\'' + p.id + '\\'}))" title="พิมพ์สลิป"><i class="fa-solid fa-receipt"></i></button>'''

new_content = content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Replaced:', content != new_content)
