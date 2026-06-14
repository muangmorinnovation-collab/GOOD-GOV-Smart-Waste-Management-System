// ============================================
// พิมพ์หนังสือทวงหนี้ (2 หน้า) — รูปแบบหนังสือราชการภายนอก
// Font: TH Sarabun New (Sarabun) ขนาด 12pt มาตรฐานราชการ
// กระดาษ: A4 (210mm x 297mm)
// ============================================
var DEBT_LETTER_CONFIG = {
    orgName: 'องค์การบริหารส่วนตำบลเหมืองหม้อ',
    orgAddr: 'ต.เหมืองหม้อ อ.เมืองแพร่ จ.แพร่',
    bylawYear: '2565',
    bylawDays: '15',
    signerName: 'นางสาวปิยวรรณ จิตตะมัย',
    signerTitle: 'นายกองค์การบริหารส่วนตำบลเหมืองหม้อ',
    tambon: 'ตำบลเหมืองหม้อ',
    amphoe: 'อำเภอเมือง',
    province: 'จังหวัดขอนแก่น',
    postCode: '40000',
    postOfficeName: 'ไปรษณีย์ขอนแก่น 40000',
    garudaUrl: (function(){ var b = window.location.href; return b.substring(0, b.lastIndexOf('/')+1) + 'assets/img/garuda.png'; })(),
    bylawName: 'ข้อบัญญัติองค์การบริหารส่วนตำบลเหมืองหม้อ',
    orgTel: ''
};

function buildDebtLetterCSS() {
    return [
        "@import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');",
        "@page { size: A4; margin: 0; }",
        "* { margin:0; padding:0; box-sizing:border-box; }",
        "body { font-family: 'Sarabun', 'TH Sarabun New', 'TH SarabunPSK', sans-serif; font-size: 12pt; color: #000; line-height: 1.15; background: #eee; }",

        // === PAGE 1: หนังสือราชการภายนอก ===
        ".page {",
        "  width: 210mm; height: 297mm;",
        "  padding: 0;",
        "  position: relative;",
        "  page-break-after: always;",
        "  background: #fff;",
        "  margin: 10px auto;",
        "  box-shadow: 0 2px 8px rgba(0,0,0,0.15);",
        "  overflow: hidden;",
        "}",
        ".garuda { position: absolute; top: 15mm; left: 50%; transform: translateX(-50%); }",
        ".garuda img { height: 35mm; }",
        ".content-wrapper { padding: 45mm 25mm 20mm 30mm; }",
        ".header-row { position: relative; margin-bottom: 8mm; min-height: 15mm; }",
        ".doc-no { position: absolute; left: 0; top: 0; font-size: 12pt; }",
        ".org-info { position: absolute; left: 55%; top: 0; right: 0; font-size: 12pt; line-height: 1.3; text-align: left; }",
        ".date-line { margin-left: 50%; font-size: 12pt; margin-bottom: 5mm; }",
        ".subject { font-size: 12pt; margin-bottom: 3mm; }",
        ".to-line { font-size: 12pt; margin-bottom: 5mm; }",
        ".body-text { text-indent: 25mm; text-align: justify; font-size: 12pt; line-height: 1.3; margin-bottom: 3mm; }",
        ".closing-block { margin-top: 5mm; margin-left: 50%; width: 60mm; text-align: center; }",
        ".closing-block .regards { font-size: 12pt; margin-bottom: 12mm; text-align: center; }",
        ".closing-block .sign-area { text-align: center; }",
        ".closing-block .sign-area .signer-name { font-size: 12pt; }",
        ".closing-block .sign-area .signer-title { font-size: 12pt; }",
        ".qr-section { position: absolute; bottom: 40mm; left: 30mm; display: flex; align-items: center; gap: 8mm; }",
        ".qr-code-img { width: 28mm; height: 28mm; border: 1px solid #ddd; }",
        ".qr-text { font-size: 11pt; display: flex; align-items: center; gap: 5px; color: #444; }",
        ".qr-text-icon { background: #8eb0c6; color: #fff; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 10pt; }",
        ".footer-section { position: absolute; bottom: 20mm; left: 30mm; font-size: 12pt; line-height: 1.3; }",
        ".footer-section .dept { font-weight: 400; }",
        ".footer-section .dept-tel { }",

        // === PAGE 2: ซองจดหมาย ===
        ".page2 {",
        "  width: 210mm; height: 297mm;",
        "  padding: 0;",
        "  position: relative;",
        "  page-break-after: always;",
        "  background: #fff;",
        "  margin: 10px auto;",
        "  box-shadow: 0 2px 8px rgba(0,0,0,0.15);",
        "  overflow: hidden;",
        "}",
        ".envelope-header { position: absolute; top: 25mm; left: 25mm; display: flex; align-items: flex-start; gap: 6mm; max-width: 100mm; }",
        ".envelope-header img { height: 25mm; flex-shrink: 0; }",
        ".envelope-org { font-size: 12pt; line-height: 1.4; margin-top: 3mm; word-wrap: break-word; }",
        ".stamp-box { position: absolute; top: 25mm; right: 25mm; width: 50mm; border: 1pt solid #000; padding: 3mm; text-align: center; line-height: 1.4; }",
        ".stamp-box .stamp-title { font-size: 11pt; }",
        ".stamp-box .stamp-no { font-size: 11pt; }",
        ".stamp-box .stamp-post { font-size: 11pt; }",
        ".send-to { position: absolute; top: 80mm; left: 75mm; font-size: 12pt; line-height: 1.5; }",
        ".send-to .label { font-size: 12pt; margin-bottom: 2mm; }",
        ".send-to .addr { margin-left: 10mm; }",

        // === PRINT ===
        "@media print {",
        "  body { background: #fff; }",
        "  .page, .page2 { margin: 0; box-shadow: none; }",
        "}"
    ].join('\n');
}

function buildDebtLetterPages(d, year) {
    var settings = JSON.parse(localStorage.getItem('waste_settings') || '{}');
    var cfg = DEBT_LETTER_CONFIG;
    var orgName = settings.org_name || cfg.orgName;
    var orgAddr = settings.org_address || cfg.orgAddr;
    var orgTel = settings.org_phone || cfg.orgTel || '';
    var signerName = settings.mayor_name || cfg.signerName;
    var signerTitle = settings.mayor_title || cfg.signerTitle;
    var postOfficeName = settings.env_post_office || cfg.postOfficeName;
    var garudaUrl = cfg.garudaUrl;
    var bylawName = 'เทศบัญญัติ' + orgName;

    // Extract address details from orgAddr
    var parsedTambon = cfg.tambon;
    var parsedAmphoe = cfg.amphoe;
    var parsedProvince = cfg.province;
    var parsedPostCode = cfg.postCode;

    if (orgAddr) {
        var mTambon = orgAddr.match(/ต\.\s*(.+?)(?=\s+อ\.|\s+จ\.|\s+\d|$)/);
        if(mTambon) parsedTambon = 'ตำบล' + mTambon[1].replace(/,/, '').trim();
        
        var mAmphoe = orgAddr.match(/อ\.\s*(.+?)(?=\s+จ\.|\s+\d|$)/);
        if(mAmphoe) parsedAmphoe = 'อำเภอ' + mAmphoe[1].replace(/,/, '').trim();
        
        var mProvince = orgAddr.match(/จ\.\s*(.+?)(?=\s+\d|$)/);
        if(mProvince) parsedProvince = 'จังหวัด' + mProvince[1].replace(/,/, '').trim();

        var mPostCode = orgAddr.match(/(\d{5})/);
        if(mPostCode) parsedPostCode = mPostCode[1];
    }

    var now = new Date();
    var thaiMonthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    var thaiDate = now.getDate() + ' ' + thaiMonthNames[now.getMonth()] + ' ' + (now.getFullYear() + 543);
    var docYear = String(now.getFullYear() + 543);
    var docNo = settings.doc_invoice_no || ('ทม.บป.' + String(Math.floor(Math.random()*9000)+1000) + '/' + docYear.substring(2));
    var unpaidList = d.unpaid_months.join(', ');
    var feeText = formatMoney(d.fee);
    var totalText = formatMoney(d.total_debt);
    var monthCount = d.unpaid_count;
    var stampNo = settings.env_license_no || (String(Math.floor(Math.random()*900)+100) + '/' + docYear.substring(2) + String(parseInt(docYear.substring(2))+1));

    // ลายเซ็น
    var signatureHTML = '';
    if (settings.mayor_signature) {
        signatureHTML = '<img src="' + settings.mayor_signature + '" style="height:15mm; display:block; margin:0 auto 2mm;">';
    } else {
        signatureHTML = '<div style="height:15mm;"></div>';
    }

        var qrCodeHTML = '';
        if (settings.qr_code) {
            qrCodeHTML = '<img src="' + settings.qr_code + '" class="qr-code-img" alt="QR Code">';
        } else {
            qrCodeHTML = '<div class="qr-code-img" style="display:flex;align-items:center;justify-content:center;font-size:8pt;color:#999;text-align:center;">ยังไม่ได้ตั้งค่า<br>QR Code</div>';
        }

        var bankAccountInfo = '';
        if (settings.bank_account || settings.bank_name || settings.bank_branch) {
            var acc = settings.bank_account ? settings.bank_account : '-';
            var bank = settings.bank_name ? settings.bank_name : '-';
            var branch = settings.bank_branch ? settings.bank_branch : '-';
            bankAccountInfo = '<div style="margin-top: 5px; font-size: 11pt;">' +
                'หรือโอนเข้าบัญชีเลขที่ <b>' + acc + '</b> ธนาคาร<b>' + bank + '</b> สาขา<b>' + branch + '</b>' +
                '</div>';
        }

    // ============ PAGE 1: หนังสือราชการภายนอก ============
    var page1 =
        '<div class="page">' +

        // ครุฑ (กลางหน้าบน)
        '<div class="garuda"><img src="' + garudaUrl + '" alt="ครุฑ"></div>' +

        '<div class="content-wrapper">' +

        // ที่ + ส่วนราชการ
        '<div class="header-row">' +
            '<div class="doc-no">ที่ ' + docNo + '</div>' +
            '<div class="org-info">' + orgName + '<br>' + orgAddr + '</div>' +
        '</div>' +

        // วันที่
        '<div class="date-line">วันที่ ' + thaiDate + '</div>' +

        // เรื่อง
        '<div class="subject">เรื่อง แจ้งเตือนให้ชำระค่าธรรมเนียมขยะมูลฝอยประจำปีงบประมาณ ' + year + ' ครั้งที่ ๑</div>' +

        // เรียน
        '<div class="to-line">เรียน ' + d.name + ' บ้านเลขที่ ' + d.house_no + ' หมู่ที่ ' + d.moo + '</div>' +

        // วรรคแรก
        '<div class="body-text">' +
            'ตามที่ ' + orgName + ' ได้ออก' + bylawName + 'ว่าด้วยการจัดการสิ่งปฏิกูลและขยะมูลฝอย พ.ศ.๒๕๖๔ โดยประกาศ ณ วันที่ ๒๕ พฤษภาคม ๒๕๖๕ ' +
            'เพื่อให้เป็นไปตามพระราชบัญญัติการสาธารณสุข พ.ศ.๒๕๓๕ ให้อำนาจองค์กรปกครองส่วนท้องถิ่นกำหนด' +
            'อัตราธรรมเนียมให้เป็นไปตามความเหมาะสมกับแหล่งกำเนิดขยะมูลฝอย และไม่เกินกว่าที่กฎหมายกำหนดไว้ นั้น' +
        '</div>' +

        // วรรคสอง
        '<div class="body-text">' +
            orgName + ' จึงขอแจ้งมายังท่านให้ดำเนินการชำระค่าธรรมเนียมการให้' +
            'บริการเก็บขนและกำจัดสิ่งปฏิกูลหรือมูลฝอย ตั้งแต่เดือน <b>' + unpaidList + '</b> ' +
            'จำนวน <b>' + monthCount + ' เดือน</b> เป็นจำนวนเงิน <b>' + totalText + ' บาท</b> ' +
            'อัตราค่าธรรมเนียมต่อเดือน <b>' + feeText + ' บาท</b> ชำระได้ที่' +
            'งานจัดเก็บรายได้ กองคลัง ' + orgName + ' หรือตรวจสอบยอดและชำระผ่านช่องทาง QR CODE ด้านล่างนี้' +
        '</div>' +

        // วรรคสาม
        '<div class="body-text">' +
            'จึงเรียนมาเพื่อโปรดทราบและขอความร่วมมือจากท่าน ไปชำระค่าธรรมเนียมดังกล่าวตามกำหนดเวลา' +
        '</div>' +

        // คำลงท้าย
        '<div class="closing-block">' +
            '<div class="regards">ขอแสดงความนับถือ</div>' +
            '<div class="sign-area">' +
                signatureHTML +
                '<div class="signer-name">(' + signerName + ')</div>' +
                '<div class="signer-title">' + signerTitle + '</div>' +
            '</div>' +
        '</div>' +

        '</div>' + // end content-wrapper

        // QR Code Section
        '<div class="qr-section">' +
            qrCodeHTML +
            '<div>' +
                '<div class="qr-text" style="margin-bottom: 2px;">' +
                    '<span class="qr-text-icon">&larr;</span> สแกน QR CODE เพื่อตรวจสอบยอด / ชำระเงิน' +
                '</div>' +
                bankAccountInfo +
            '</div>' +
        '</div>' +

        // ส่วนท้าย
        '<div class="footer-section">' +
            '<div class="dept">งานจัดเก็บรายได้ กองคลัง</div>' +
            '<div class="dept-tel">' + orgTel + '</div>' +
        '</div>' +

        '</div>'; // end page

    // ============ PAGE 2: หน้าซองจดหมาย ============
    var page2 =
        '<div class="page2">' +

        // ส่วนหัวซอง — ครุฑ + ข้อมูลหน่วยงาน (บนซ้าย)
        '<div class="envelope-header">' +
            '<img src="' + garudaUrl + '" alt="ครุฑ">' +
            '<div class="envelope-org">' +
                '<div>' + orgName + '</div>' +
                '<div>' + orgAddr + '</div>' +
                (orgTel ? '<div>' + orgTel + '</div>' : '') +
            '</div>' +
        '</div>' +

        // กล่องแสตมป์ (บนขวา)
        '<div class="stamp-box">' +
            '<div class="stamp-title">ชำระค่าฝากส่งเป็นรายเดือน</div>' +
            '<div class="stamp-no">ใบอนุญาตเลขที่<br>' + stampNo + '</div>' +
            '<div class="stamp-post">' + postOfficeName + '</div>' +
        '</div>' +

        // ที่อยู่ผู้รับ (ตรงกลางค่อนไปทางขวา)
        '<div class="send-to">' +
            '<div class="label">กรุณาส่ง</div>' +
            '<div class="addr">' +
                'เรียน ' + d.name + '<br>' +
                'ที่อยู่ ' + d.house_no + ' หมู่ที่ ' + d.moo + '<br>' +
                parsedTambon + ' ' + parsedAmphoe + '<br>' +
                parsedProvince + ' รหัสไปรษณีย์ ' + parsedPostCode +
            '</div>' +
        '</div>' +

        '</div>'; // end page2

    return page1 + page2;
}

// พิมพ์ทวงหนี้รายบุคคล
function printDebtLetter(customerId) {
    var year = (typeof debtorSelectedYear !== 'undefined' && debtorSelectedYear) ? debtorSelectedYear : getCurrentFiscalYear();
    var debtors = window.currentFilteredDebtors || calculateDebtors(year);
    var d = debtors.find(function(x){ return x.id === customerId; });
    if (!d) { showToast('ไม่พบข้อมูลลูกหนี้','error'); return; }

    var css = buildDebtLetterCSS();
    var pages = buildDebtLetterPages(d, year);
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' + pages + '</body></html>';

    var w = window.open('', '_blank', 'width=900,height=1200');
    w.document.write(html);
    w.document.close();
    setTimeout(function(){ w.print(); }, 600);
}

// พิมพ์ทวงหนี้ทั้งหมด
function printAllDebtLetters() {
    var year = (typeof debtorSelectedYear !== 'undefined' && debtorSelectedYear) ? debtorSelectedYear : getCurrentFiscalYear();
    var debtors = window.currentFilteredDebtors || calculateDebtors(year);

    if (debtors.length === 0) {
        showToast('ไม่มีลูกหนี้ค้างชำระในปีนี้','warning');
        return;
    }

    Swal.fire({
        title: 'พิมพ์หนังสือทวงหนี้ทั้งหมด?',
        html: '<b>' + debtors.length + ' ราย</b> (' + (debtors.length * 2) + ' หน้า)<br><span style="font-size:13px;color:#6b7280;">ปีงบประมาณ ' + year + '</span>',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'พิมพ์ทั้งหมด',
        cancelButtonText: 'ยกเลิก',
        confirmButtonColor: '#1a56db'
    }).then(function(r) {
        if (r.isConfirmed) {
            var css = buildDebtLetterCSS();
            var allPages = '';
            debtors.forEach(function(d) {
                allPages += buildDebtLetterPages(d, year);
            });
            var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' + allPages + '</body></html>';

            var w = window.open('', '_blank', 'width=900,height=1200');
            w.document.write(html);
            w.document.close();
            setTimeout(function(){ w.print(); }, 800);
        }
    });
}
