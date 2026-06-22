const fs = require('fs');

const file_path = 'e:/ANTIGRAVITY/PROJECT Muangmor/Smart governance ขยะเหมืองหม้อ/waste-reports.html';
let content = fs.readFileSync(file_path, 'utf8');

const target = `<button class="btn btn-xs btn-outline-primary me-1" onclick="printReceiptA4(getWastePayments().find(function(x){return x.id===' + p.id + '}))" title="พิมพ์"><i class="fa-solid fa-print"></i></button>`;

const targetActual1 = `                    '<button class="btn btn-xs btn-outline-primary me-1" onclick="printReceiptA4(getWastePayments().find(function(x){return x.id===\\'' + p.id + '\\'}))" title="พิมพ์"><i class="fa-solid fa-print"></i></button>' +`;

const replacement = `                    '<button class="btn btn-xs btn-outline-primary me-1" onclick="printReceiptA4(getWastePayments().find(function(x){return x.id===\\'' + p.id + '\\'}))" title="พิมพ์ A4"><i class="fa-solid fa-print"></i></button>' +
                    '<button class="btn btn-xs btn-outline-warning me-1" onclick="printReceiptSlip(getWastePayments().find(function(x){return x.id===\\'' + p.id + '\\'}))" title="พิมพ์สลิป"><i class="fa-solid fa-receipt"></i></button>' +`;

if (content.includes(targetActual1)) {
    content = content.split(targetActual1).join(replacement);
    fs.writeFileSync(file_path, content, 'utf8');
    console.log('Replaced successfully.');
} else {
    console.log('Target not found.');
}
