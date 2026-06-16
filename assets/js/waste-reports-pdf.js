/**
 * waste-reports-pdf.js — PDF Report Generator for Waste Fee Collection
 * Uses browser window.print() with styled HTML — reliable Thai text support
 */

// ============================================
// THAI HELPERS
// ============================================
var THAI_MONTHS_FULL_PDF = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
    'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

function formatThaiDatePDF(dateStr) {
    var d = new Date(dateStr);
    return d.getDate() + ' ' + THAI_MONTHS_FULL_PDF[d.getMonth()] + ' พ.ศ.' + (d.getFullYear() + 543);
}

function fmtMoneyPDF(n) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0 }).format(n);
}

// ============================================
// SHARED STYLES FOR PDF PRINT
// ============================================
function getOrgNamePDF() {
    try {
        const settings = getWasteData('settings') || {};
        return settings.org_name || 'องค์การบริหารส่วนตำบลเหมืองหม้อ';
    } catch(e) {
        return 'องค์การบริหารส่วนตำบลเหมืองหม้อ';
    }
}

function getPrintStyles() {
    return '<style>' +
        '@import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap");' +
        '* { margin: 0; padding: 0; box-sizing: border-box; }' +
        'body { font-family: "Sarabun", "Prompt", sans-serif; color: #1a1a1a; padding: 30px 40px; font-size: 14px; }' +
        '@media print { body { padding: 15px 20px; } @page { size: A4 landscape; margin: 10mm; } }' +
        '.report-header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #1a56db; }' +
        '.report-header h1 { font-size: 20px; font-weight: 700; color: #1a56db; margin-bottom: 4px; }' +
        '.report-header p { font-size: 13px; color: #555; margin: 2px 0; }' +
        '.report-header .total-highlight { font-size: 14px; font-weight: 700; color: #059669; }' +
        'table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }' +
        'thead th { background: #1a56db; color: #fff; padding: 10px 8px; text-align: center; font-weight: 600; font-size: 12px; border: 1px solid #1a56db; }' +
        'tbody td { padding: 8px; border: 1px solid #d1d5db; vertical-align: middle; }' +
        'tbody tr:nth-child(even) { background: #f8fafc; }' +
        'tbody tr:hover { background: #eff6ff; }' +
        '.text-center { text-align: center; }' +
        '.text-right { text-align: right; }' +
        '.text-left { text-align: left; }' +
        '.fw-bold { font-weight: 700; }' +
        '.summary-row { background: #eef2ff !important; font-weight: 700; font-size: 14px; }' +
        '.summary-row td { border-top: 2px solid #1a56db; }' +
        '.report-footer { text-align: center; margin-top: 20px; padding-top: 12px; border-top: 1px dashed #ccc; font-size: 11px; color: #999; }' +
        '.print-actions { text-align: center; margin: 20px 0; }' +
        '.print-actions button { padding: 10px 28px; margin: 0 8px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: "Sarabun", sans-serif; }' +
        '.btn-print { background: #1a56db; color: #fff; }' +
        '.btn-print:hover { background: #1544a8; }' +
        '.btn-close-win { background: #e5e7eb; color: #333; }' +
        '.btn-close-win:hover { background: #d1d5db; }' +
        '@media print { .print-actions { display: none; } }' +
        '</style>';
}

// ============================================
// DAILY PDF REPORT
// ============================================
function exportDailyPDF() {
    const orgName = getOrgNamePDF();
    var filterDate = document.getElementById('filterDate').value;
    if (!filterDate) { Swal.fire('กรุณาเลือกวันที่', '', 'warning'); return; }

    var payments = getWastePayments();
    var customers = getWasteCustomers();
    var todayPayments = payments.filter(function(p) { return p.date === filterDate && p.status === 'completed'; });

    var totalAmount = todayPayments.reduce(function(s,p){ return s + p.amount; }, 0);

    // Build table rows
    var rowsHtml = '';
    var sumDebt = 0, sumRegular = 0, sumAdvance = 0, sumTotal = 0;

    if (todayPayments.length === 0) {
        rowsHtml = '<tr><td colspan="9" class="text-center" style="padding:30px;color:#999;">ไม่มีรายการชำระสำหรับวันที่เลือก</td></tr>';
    } else {
        todayPayments.forEach(function(p, idx) {
            var cust = customers.find(function(c){ return c.id === p.customer_id; });
            var houseNo = p.house_no || (cust ? cust.house_no : '-');
            var moo = cust ? cust.moo : '-';
            var monthsPaid = Array.isArray(p.months_paid) ? p.months_paid : [p.months_paid || '-'];
            var feePerMonth = cust ? cust.fee : (monthsPaid.length > 0 ? Math.round(p.amount / monthsPaid.length) : p.amount);

            var debtAmt = 0;
            var regularAmt = feePerMonth * monthsPaid.length;
            var advanceAmt = 0;
            var rowTotal = p.amount;

            sumDebt += debtAmt;
            sumRegular += regularAmt;
            sumAdvance += advanceAmt;
            sumTotal += rowTotal;

            rowsHtml += '<tr>' +
                '<td class="text-center">' + (idx + 1) + '</td>' +
                '<td>' + (p.receipt_no || '-') + '</td>' +
                '<td>' + (p.customer_name || '-') + '</td>' +
                '<td class="text-center">' + houseNo + '</td>' +
                '<td class="text-center">' + moo + '</td>' +
                '<td class="text-right">' + fmtMoneyPDF(debtAmt) + '</td>' +
                '<td class="text-right">' + fmtMoneyPDF(regularAmt) + '</td>' +
                '<td class="text-right">' + fmtMoneyPDF(advanceAmt) + '</td>' +
                '<td class="text-right fw-bold">' + fmtMoneyPDF(rowTotal) + '</td>' +
                '</tr>';
        });

        // Summary row
        rowsHtml += '<tr class="summary-row">' +
            '<td colspan="5" class="text-center fw-bold">รวม</td>' +
            '<td class="text-right">' + fmtMoneyPDF(sumDebt) + '</td>' +
            '<td class="text-right">' + fmtMoneyPDF(sumRegular) + '</td>' +
            '<td class="text-right">' + fmtMoneyPDF(sumAdvance) + '</td>' +
            '<td class="text-right fw-bold">' + fmtMoneyPDF(sumTotal) + '</td>' +
            '</tr>';
    }

    var html = '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายงานค่าขยะรายวัน</title>' +
        getPrintStyles() + '</head><body>' +
        '<div class="report-header">' +
        '<h1>ข้อมูลการชำระค่าขยะรายวัน</h1>' +
        '<p>วันที่ชำระ ' + formatThaiDatePDF(filterDate) + '</p>' +
        '<p class="total-highlight">จำนวนเงินที่ชำระ ' + fmtMoneyPDF(totalAmount) + ' บาท</p>' +
        '</div>' +
        '<div class="print-actions">' +
        '<button class="btn-print" onclick="window.print()"><i class="fa-solid fa-print"></i> พิมพ์ / บันทึก PDF</button>' +
        '<button class="btn-close-win" onclick="window.close()">ปิด</button>' +
        '</div>' +
        '<table>' +
        '<thead><tr>' +
        '<th>ลำดับ</th><th>เลขที่ใบเสร็จ</th><th>ชื่อลูกค้า</th><th>บ้านเลขที่</th><th>หมู่ที่</th>' +
        '<th>รับชำระลูก<br>หนี้</th><th>รับปกติ</th><th>รับล่วงหน้า</th><th>รวม</th>' +
        '</tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
        `</table>` +
        `<div class="report-footer">เอกสารนี้สร้างโดยระบบ GOOD GOV &mdash; ${orgName}</div>` +
        `</body></html>`;

    var w = window.open('', '_blank', 'width=1000,height=700');
    w.document.write(html);
    w.document.close();
    // Auto-trigger print dialog after fonts load
    w.onload = function() {
        setTimeout(function() { w.print(); }, 600);
    };
}

// ============================================
// MONTHLY PDF REPORT
// ============================================
function exportMonthlyPDF() {
    const orgName = getOrgNamePDF();
    var filterYear = document.getElementById('filterYear').value;
    if (!filterYear) { Swal.fire('กรุณาเลือกปีงบประมาณ', '', 'warning'); return; }

    var msData = typeof getMonthlyStatus === 'function' ? getMonthlyStatus() : {};
    var customers = typeof getWasteCustomers === 'function' ? getWasteCustomers() : [];

    // Build monthly rows
    var rowsHtml = '';
    var totalCount = 0, totalSum = 0;

    WASTE_MONTHS.forEach(function(m, i) {
        var mk = WASTE_MONTH_KEYS[i];
        var monthTotal = 0;
        var monthPayers = 0;

        Object.keys(msData).forEach(function(cid) {
            if (msData[cid][filterYear] && msData[cid][filterYear][mk] === 'paid') {
                var cust = customers.find(function(c){ return c.id === cid; });
                monthTotal += cust ? (Number(cust.fee) || 0) : 0;
                monthPayers++;
            }
        });

        totalCount += monthPayers;
        totalSum += monthTotal;

        var fyNum = parseInt(filterYear);
        var calYear = i < 3 ? fyNum - 1 : fyNum;
        var fullMonthName = THAI_MONTHS_FULL_PDF[i < 3 ? i + 9 : i - 3] + ' ' + calYear;

        rowsHtml += '<tr>' +
            '<td class="text-center">' + (i + 1) + '</td>' +
            '<td>' + fullMonthName + '</td>' +
            '<td class="text-center">' + monthPayers + '</td>' +
            '<td class="text-right fw-bold">' + fmtMoneyPDF(monthTotal) + '</td>' +
            '</tr>';
    });

    // Summary row
    rowsHtml += '<tr class="summary-row">' +
        '<td></td>' +
        '<td class="fw-bold">รวมทั้งปี</td>' +
        '<td class="text-center fw-bold">' + totalCount + '</td>' +
        '<td class="text-right fw-bold">' + fmtMoneyPDF(totalSum) + '</td>' +
        '</tr>';

    var html = '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายงานค่าขยะรายเดือน</title>' +
        getPrintStyles() +
        '<style>@media print { @page { size: A4 portrait; margin: 15mm; } }</style>' +
        '</head><body>' +
        '<div class="report-header">' +
        '<h1>รายงานสรุปการรับชำระค่าขยะรายเดือน</h1>' +
        '<p>ปีงบประมาณ พ.ศ. ' + filterYear + '</p>' +
        '<p class="total-highlight">ยอดรวมทั้งปี ' + fmtMoneyPDF(totalSum) + ' บาท</p>' +
        '</div>' +
        '<div class="print-actions">' +
        '<button class="btn-print" onclick="window.print()"><i class="fa-solid fa-print"></i> พิมพ์ / บันทึก PDF</button>' +
        '<button class="btn-close-win" onclick="window.close()">ปิด</button>' +
        '</div>' +
        '<table>' +
        '<thead><tr>' +
        '<th>ลำดับ</th><th>เดือน</th><th>จำนวนผู้ชำระ</th>' +
        '<th>ยอดรวม (บาท)</th>' +
        '</tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
        `</table>` +
        `<div class="report-footer">เอกสารนี้สร้างโดยระบบ GOOD GOV &mdash; ${orgName}</div>` +
        `</body></html>`;

    var w = window.open('', '_blank', 'width=900,height=700');
    w.document.write(html);
    w.document.close();
    w.onload = function() {
        setTimeout(function() { w.print(); }, 600);
    };
}

// ============================================
// ALL REVENUE PDF REPORT
// ============================================
function exportAllPDF() {
    const orgName = getOrgNamePDF();
    var payments = getWastePayments();
    var customers = getWasteCustomers();
    var allPayments = window.currentFilteredAllPayments || payments.filter(function(p) { return p.status === 'completed'; });

    var totalAmount = allPayments.reduce(function(s,p){ return s + p.amount; }, 0);

    // Build table rows
    var rowsHtml = '';
    var sumDebt = 0, sumRegular = 0, sumAdvance = 0, sumTotal = 0;

    if (allPayments.length === 0) {
        rowsHtml = '<tr><td colspan="10" class="text-center" style="padding:30px;color:#999;">ไม่มีรายการชำระในระบบ</td></tr>';
    } else {
        allPayments.forEach(function(p, idx) {
            var cust = customers.find(function(c){ return c.id === p.customer_id; });
            var houseNo = p.house_no || (cust ? cust.house_no : '-');
            var moo = cust ? cust.moo : '-';
            var monthsPaid = Array.isArray(p.months_paid) ? p.months_paid : [p.months_paid || '-'];
            var feePerMonth = cust ? cust.fee : (monthsPaid.length > 0 ? Math.round(p.amount / monthsPaid.length) : p.amount);

            var debtAmt = 0;
            var regularAmt = feePerMonth * monthsPaid.length;
            var advanceAmt = 0;
            var rowTotal = p.amount;

            sumDebt += debtAmt;
            sumRegular += regularAmt;
            sumAdvance += advanceAmt;
            sumTotal += rowTotal;

            rowsHtml += '<tr>' +
                '<td class="text-center">' + (idx + 1) + '</td>' +
                '<td>' + p.date + '</td>' +
                '<td>' + (p.receipt_no || '-') + '</td>' +
                '<td>' + (p.customer_name || '-') + '</td>' +
                '<td class="text-center">' + houseNo + '</td>' +
                '<td class="text-center">' + moo + '</td>' +
                '<td class="text-right">' + fmtMoneyPDF(debtAmt) + '</td>' +
                '<td class="text-right">' + fmtMoneyPDF(regularAmt) + '</td>' +
                '<td class="text-right">' + fmtMoneyPDF(advanceAmt) + '</td>' +
                '<td class="text-right fw-bold">' + fmtMoneyPDF(rowTotal) + '</td>' +
                '</tr>';
        });

        // Summary row
        rowsHtml += '<tr class="summary-row">' +
            '<td colspan="6" class="text-center fw-bold">รวม</td>' +
            '<td class="text-right">' + fmtMoneyPDF(sumDebt) + '</td>' +
            '<td class="text-right">' + fmtMoneyPDF(sumRegular) + '</td>' +
            '<td class="text-right">' + fmtMoneyPDF(sumAdvance) + '</td>' +
            '<td class="text-right fw-bold">' + fmtMoneyPDF(sumTotal) + '</td>' +
            '</tr>';
    }

    var html = '<!DOCTYPE html><html lang="th"><head><meta charset="UTF-8"><title>รายงานค่าขยะทั้งหมด</title>' +
        getPrintStyles() + '</head><body>' +
        '<div class="report-header">' +
        '<h1>ข้อมูลการชำระค่าขยะทั้งหมดในระบบ</h1>' +
        '<p class="total-highlight">จำนวนเงินที่ชำระทั้งหมด ' + fmtMoneyPDF(totalAmount) + ' บาท</p>' +
        '</div>' +
        '<div class="print-actions">' +
        '<button class="btn-print" onclick="window.print()"><i class="fa-solid fa-print"></i> พิมพ์ / บันทึก PDF</button>' +
        '<button class="btn-close-win" onclick="window.close()">ปิด</button>' +
        '</div>' +
        '<table>' +
        '<thead><tr>' +
        '<th>ลำดับ</th><th>วันที่</th><th>เลขที่ใบเสร็จ</th><th>ชื่อลูกค้า</th><th>บ้านเลขที่</th><th>หมู่ที่</th>' +
        '<th>รับชำระลูก<br>หนี้</th><th>รับปกติ</th><th>รับล่วงหน้า</th><th>รวม</th>' +
        '</tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
        `</table>` +
        `<div class="report-footer">เอกสารนี้สร้างโดยระบบ GOOD GOV &mdash; ${orgName}</div>` +
        `</body></html>`;

    var w = window.open('', '_blank', 'width=1000,height=700');
    w.document.write(html);
    w.document.close();
    w.onload = function() {
        setTimeout(function() { w.print(); }, 600);
    };
}

// ============================================
// SMART EXPORT — detect active tab
// ============================================
function exportCurrentTabPDF() {
    var allTab = document.querySelector('#tabAll');
    var dailyTab = document.querySelector('#tabDaily');
    var monthlyTab = document.querySelector('#tabMonthly');

    if (allTab && allTab.classList.contains('active')) {
        exportAllPDF();
    } else if (dailyTab && dailyTab.classList.contains('active')) {
        exportDailyPDF();
    } else if (monthlyTab && monthlyTab.classList.contains('active')) {
        exportMonthlyPDF();
    } else {
        Swal.fire({
            title: 'เลือกรายงานที่ต้องการ',
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: 'รายงานทั้งหมด',
            denyButtonText: 'รายงานรายเดือน',
            cancelButtonText: 'ยกเลิก',
            confirmButtonColor: '#1a56db',
            denyButtonColor: '#059669'
        }).then(function(result) {
            if (result.isConfirmed) exportAllPDF();
            else if (result.isDenied) exportMonthlyPDF();
        });
    }
}
