// ============================================
// Waste Receipt — บันทึก & เรียกดูใบเสร็จ
// ============================================

// === CONFIG ===
var RECEIPT_DRIVE_FOLDER = 'https://drive.google.com/drive/folders/1Gqxt-1GiC5cxUcbeyV8CoXASKV20lyOs';

// >>> หลัง Deploy Apps Script แล้ว ให้วาง URL ที่นี่ <<<
var GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbztSUMz-9CpiPA9aGaGeU5HjvjrRfX4PH65x6HaOjqK0fe2gSk8TwVqKK4pZTAD5Ro_5A/exec';

// We will dynamically fetch these from waste_settings in buildReceiptHTML
var RECEIPT_ORG = null;

function getGarudaAbsUrl() {
    var b = window.location.href;
    return b.substring(0, b.lastIndexOf('/') + 1) + 'assets/img/garuda.png';
}

// === สร้าง HTML ใบเสร็จ ===
function buildReceiptHTML(p) {
    var settings = JSON.parse(localStorage.getItem('waste_settings') || '{}');
    var cfg = {
        orgName: settings.org_name || 'เทศบาลตำบล GOOD GOV',
        orgAddr: settings.org_address || '',
        orgTel: settings.org_phone || ''
    };
    var garudaUrl = settings.org_logo || getGarudaAbsUrl();
    var monthsPaid = Array.isArray(p.months_paid) ? p.months_paid.join(', ') : (p.months_paid || '-');
    var now = new Date();
    var thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    var thaiDate = now.getDate() + ' ' + thaiMonths[now.getMonth()] + ' ' + (now.getFullYear() + 543);

    return '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
        '<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">' +
        '<style>body{font-family:Sarabun,sans-serif;margin:0;padding:0;color:#1a1a1a;} .receipt{max-width:700px;margin:30px auto;padding:40px;} ' +
        '.header{text-align:center;border-bottom:2px solid #1a56db;padding-bottom:15px;margin-bottom:20px;} ' +
        '.header img{height:70px;margin-bottom:8px;} h2{margin:5px 0;color:#1a56db;font-size:20px;} ' +
        '.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:15px 0;} ' +
        '.info-box{padding:10px 14px;background:#f8fafc;border-radius:8px;} ' +
        '.info-label{font-size:12px;color:#6b7280;} .info-value{font-size:14px;font-weight:600;margin-top:2px;} ' +
        '.total-box{text-align:right;font-size:24px;font-weight:700;color:#057a55;margin:20px 0;padding:15px;background:#f0fdf4;border-radius:10px;} ' +
        '.footer{text-align:center;margin-top:30px;font-size:12px;color:#9ca3af;border-top:1px dashed #d1d5db;padding-top:15px;} ' +
        '@media print{body{padding:0;} .receipt{margin:0;padding:20px;}}</style></head><body>' +
        '<div class="receipt">' +
        '<div class="header">' +
        '<img src="' + garudaUrl + '" alt="ครุฑ"><br>' +
        '<h2>ใบเสร็จรับเงินค่าธรรมเนียมขยะมูลฝอย</h2>' +
        '<p style="margin:2px 0;font-size:13px;color:#6b7280;">' + cfg.orgName + '</p>' +
        '<p style="margin:0;font-size:12px;color:#9ca3af;">' + cfg.orgAddr + ' ' + cfg.orgTel + '</p>' +
        '</div>' +
        '<div class="info-grid">' +
        '<div class="info-box"><div class="info-label">เลขที่ใบเสร็จ</div><div class="info-value">' + (p.receipt_no || '-') + '</div></div>' +
        '<div class="info-box"><div class="info-label">วันที่</div><div class="info-value">' + thaiDate + '</div></div>' +
        '<div class="info-box"><div class="info-label">ชื่อผู้ชำระ</div><div class="info-value">' + p.customer_name + '</div></div>' +
        '<div class="info-box"><div class="info-label">บ้านเลขที่</div><div class="info-value">' + (p.house_no || '-') + '</div></div>' +
        '<div class="info-box"><div class="info-label">เดือนที่ชำระ</div><div class="info-value">' + monthsPaid + '</div></div>' +
        '<div class="info-box"><div class="info-label">ช่องทาง</div><div class="info-value">' + (p.method || '-') + '</div></div>' +
        '</div>' +
        '<div class="total-box">ยอดชำระ: ฿' + formatMoneyDecimal(p.amount) + '</div>' +
        '<div class="info-grid">' +
        '<div class="info-box"><div class="info-label">เจ้าหน้าที่</div><div class="info-value">' + (p.staff || '-') + '</div></div>' +
        '<div class="info-box"><div class="info-label">เวลา</div><div class="info-value">' + (p.time || '-') + '</div></div>' +
        '</div>' +
        '<div class="footer">เอกสารนี้ออกโดยระบบ GOOD GOV &mdash; ' + cfg.orgName + '</div>' +
        '</div></body></html>';
}

// === อัปโหลดใบเสร็จไป Google Drive อัตโนมัติ ===
async function autoSaveReceiptToDrive(payment) {
    if (!GOOGLE_APPS_SCRIPT_URL) {
        console.warn('GOOGLE_APPS_SCRIPT_URL ยังไม่ได้ตั้งค่า — ข้ามการอัปโหลด');
        return null;
    }

    var html = buildReceiptHTML(payment);
    var fileName = (payment.receipt_no || payment.id).replace(/[\/\\]/g, '-') + '.html';

    try {
        var response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                fileName: fileName,
                htmlContent: html,
                receiptNo: payment.receipt_no || ''
            })
        });

        var result = await response.json();

        if (result.success) {
            console.log('✅ ใบเสร็จอัปโหลดไป Drive สำเร็จ:', result.fileUrl);

            // บันทึก URL ลง Supabase
            if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                await supabaseClient.from('waste_payments').update({
                    receipt_url: result.fileUrl
                }).eq('id', payment.id);
            }

            // บันทึก URL ลง localStorage ด้วย
            var payments = JSON.parse(localStorage.getItem('waste_payments') || '[]');
            var idx = payments.findIndex(function (x) { return x.id === payment.id; });
            if (idx >= 0) {
                payments[idx].receipt_url = result.fileUrl;
                localStorage.setItem('waste_payments', JSON.stringify(payments));
            }

            return result.fileUrl;
        } else {
            console.warn('❌ อัปโหลด Drive ล้มเหลว:', result.error);
            return null;
        }
    } catch (err) {
        console.warn('❌ อัปโหลด Drive error:', err.message);
        return null;
    }
}

// === ดาวน์โหลดใบเสร็จ + เปิด Drive folder (manual) ===
function saveReceiptToDrive(paymentId) {
    var payments = getWastePayments();
    var p = payments.find(function (x) { return x.id === paymentId; });
    if (!p) { showToast('ไม่พบข้อมูลใบเสร็จ', 'error'); return; }

    // ถ้ามี Apps Script URL → อัปโหลดอัตโนมัติ
    if (GOOGLE_APPS_SCRIPT_URL) {
        Swal.fire({ title: 'กำลังอัปโหลดไป Drive...', allowOutsideClick: false, didOpen: function () { Swal.showLoading(); } });
        autoSaveReceiptToDrive(p).then(function (url) {
            Swal.fire({
                title: url ? 'อัปโหลดสำเร็จ!' : 'อัปโหลดล้มเหลว',
                html: url ? '<p>ใบเสร็จ <b>' + p.receipt_no + '</b> ถูกบันทึกลง Google Drive แล้ว</p><a href="' + url + '" target="_blank" class="btn btn-sm btn-primary mt-2"><i class="fa-brands fa-google-drive me-1"></i> เปิดใบเสร็จ</a>'
                    : '<p>ไม่สามารถอัปโหลดได้ กรุณาลองใหม่</p>',
                icon: url ? 'success' : 'error'
            });
        });
        return;
    }

    // Fallback: ดาวน์โหลดไฟล์ + เปิด Drive folder
    var html = buildReceiptHTML(p);
    var blob = new Blob([html], { type: 'text/html' });
    var fileName = 'receipt_' + (p.receipt_no || p.id).replace(/[\/\\]/g, '-') + '.html';

    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);

    Swal.fire({
        title: 'ดาวน์โหลดใบเสร็จสำเร็จ!',
        html: '<p><i class="fa-solid fa-check-circle text-success me-1"></i> ไฟล์ <b>' + fileName + '</b></p>' +
            '<p class="text-muted" style="font-size:13px;">คลิกเพื่อเปิดโฟลเดอร์ Drive แล้วลากไฟล์วาง</p>',
        icon: 'success',
        showCancelButton: true,
        confirmButtonText: '<i class="fa-brands fa-google-drive me-1"></i> เปิด Drive',
        cancelButtonText: 'ปิด',
        confirmButtonColor: '#1a56db'
    }).then(function (r) {
        if (r.isConfirmed) window.open(RECEIPT_DRIVE_FOLDER, '_blank');
    });
}

// === ดูใบเสร็จย้อนหลัง ===
function viewReceipt(paymentId) {
    var payments = getWastePayments();
    var p = payments.find(function (x) { return x.id === paymentId; });
    if (!p) { showToast('ไม่พบข้อมูลใบเสร็จ', 'error'); return; }

    // ถ้ามี receipt_url (จาก Drive) ให้เปิด URL นั้น
    if (p.receipt_url && p.receipt_url.startsWith('http')) {
        window.open(p.receipt_url, '_blank');
        return;
    }

    // สร้างใหม่แล้วแสดง
    var html = buildReceiptHTML(p);
    var w = window.open('', '_blank', 'width=800,height=700');
    w.document.write(html);
    w.document.close();
}
