document.addEventListener('DOMContentLoaded', async function() {
    Swal.fire({title: 'กำลังโหลดข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
    try {
        initWasteData();
        
        // Fetch all required data
        await Promise.all([
            fetchWastePayments(),
            fetchWasteCustomers() // If customer names are needed from ID, but usually payments have customer_name
        ]);
        
        toggleTimeFilterInputs(); // Init dynamic inputs
        renderReceiptReport();
        
        Swal.close();
    } catch (e) {
        console.error(e);
        Swal.close();
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลได้', 'error');
    }
});

let currentPage = 1;
const itemsPerPage = 20;
let filteredReceipts = [];

function toggleTimeFilterInputs() {
    const mode = document.getElementById('filterTimeMode').value;
    const container = document.getElementById('timeInputContainer');
    container.innerHTML = '';
    
    if (mode === 'daily') {
        container.innerHTML = `
            <label class="form-label mb-1 text-muted small">เลือกวันที่</label>
            <input type="date" id="filterDate" class="form-control form-control-sm" onchange="renderReceiptReport()">
        `;
        document.getElementById('filterDate').value = new Date().toISOString().split('T')[0];
    } else if (mode === 'monthly') {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        container.innerHTML = `
            <div class="d-flex gap-2">
                <div class="flex-grow-1">
                    <label class="form-label mb-1 text-muted small">เดือน</label>
                    <select id="filterMonth" class="form-select form-select-sm" onchange="renderReceiptReport()">
                        ${Array.from({length: 12}, (_, i) => `<option value="${String(i+1).padStart(2, '0')}" ${currentMonth === i+1 ? 'selected' : ''}>เดือนที่ ${i+1}</option>`).join('')}
                    </select>
                </div>
                <div class="flex-grow-1">
                    <label class="form-label mb-1 text-muted small">ปี (ค.ศ.)</label>
                    <input type="number" id="filterYear" class="form-control form-control-sm" value="${currentYear}" onchange="renderReceiptReport()">
                </div>
            </div>
        `;
    } else if (mode === 'yearly') {
        const currentYear = new Date().getFullYear();
        container.innerHTML = `
            <label class="form-label mb-1 text-muted small">ปี (ค.ศ.)</label>
            <input type="number" id="filterYear" class="form-control form-control-sm" value="${currentYear}" onchange="renderReceiptReport()">
        `;
    }
    renderReceiptReport();
}

function resetFilters() {
    document.getElementById('searchReceiptNo').value = '';
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterTimeMode').value = 'all';
    toggleTimeFilterInputs();
}

function renderReceiptReport(action) {
    if (action !== 'pageChange') {
        currentPage = 1;
    }

    const payments = getWastePayments() || [];
    const searchNo = document.getElementById('searchReceiptNo').value.trim().toLowerCase();
    const status = document.getElementById('filterStatus').value;
    const timeMode = document.getElementById('filterTimeMode').value;
    
    // Filter
    filteredReceipts = payments.filter(p => {
        // Search text
        if (searchNo && (!p.receipt_no || !p.receipt_no.toLowerCase().includes(searchNo))) {
            return false;
        }
        
        // Status
        if (status === 'active' && p.status === 'cancelled') return false;
        if (status === 'cancelled' && p.status !== 'cancelled') return false;
        
        // Time
        if (!p.date) return false;
        
        if (timeMode === 'daily') {
            const fDate = document.getElementById('filterDate')?.value;
            if (fDate && p.date !== fDate) return false;
        } else if (timeMode === 'monthly') {
            const fMonth = document.getElementById('filterMonth')?.value;
            const fYear = document.getElementById('filterYear')?.value;
            if (fMonth && fYear) {
                const pMonth = p.date.substring(5, 7);
                const pYear = p.date.substring(0, 4);
                if (pMonth !== fMonth || pYear !== fYear) return false;
            }
        } else if (timeMode === 'yearly') {
            const fYear = document.getElementById('filterYear')?.value;
            if (fYear) {
                const pYear = p.date.substring(0, 4);
                if (pYear !== fYear) return false;
            }
        }
        
        return true;
    });

    // Sort by date desc
    filteredReceipts.sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00:00')) - new Date(a.date + 'T' + (a.time || '00:00:00')));

    // Update summaries
    document.getElementById('summaryCount').innerText = filteredReceipts.length.toLocaleString();
    
    const totalAmount = filteredReceipts
        .filter(p => p.status !== 'cancelled')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    document.getElementById('summaryTotal').innerText = '฿' + totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2});

    // Pagination
    const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredReceipts.slice(startIndex, startIndex + itemsPerPage);

    // Render Table
    const tbody = document.getElementById('receiptTableBody');
    tbody.innerHTML = '';
    
    if (paginatedItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">ไม่พบข้อมูลใบเสร็จ</td></tr>';
    } else {
        paginatedItems.forEach(p => {
            const isCancelled = p.status === 'cancelled';
            const trClass = isCancelled ? 'text-decoration-line-through text-muted bg-light' : '';
            const statusBadge = isCancelled 
                ? '<span class="badge bg-danger">ยกเลิก</span>'
                : '<span class="badge bg-success">ใช้งาน</span>';
            
            const remark = isCancelled && p.cancel_reason ? p.cancel_reason : (p.note || '-');

            tbody.innerHTML += `
                <tr class="${trClass}">
                    <td class="ps-3">${formatDateThai(p.date)}</td>
                    <td>${p.receipt_no || '-'}</td>
                    <td>${p.customer_name || '-'}</td>
                    <td class="text-end text-success fw-bold">฿${(parseFloat(p.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="pe-3 small text-muted">${remark}</td>
                </tr>
            `;
        });
    }

    // Render Pagination Controls
    const pgInfo = document.getElementById('paginationInfo');
    const pgControls = document.getElementById('paginationControls');
    
    if (filteredReceipts.length > 0) {
        pgInfo.innerText = `แสดง ${startIndex + 1} ถึง ${Math.min(startIndex + itemsPerPage, filteredReceipts.length)} จากทั้งหมด ${filteredReceipts.length} รายการ`;
        
        let pgHtml = '';
        pgHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" onclick="event.preventDefault(); setPage(${currentPage - 1})">ก่อนหน้า</a></li>`;
        
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            pgHtml += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" onclick="event.preventDefault(); setPage(${i})">${i}</a></li>`;
        }
        
        pgHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" onclick="event.preventDefault(); setPage(${currentPage + 1})">ถัดไป</a></li>`;
        pgControls.innerHTML = pgHtml;
    } else {
        pgInfo.innerText = '';
        pgControls.innerHTML = '';
    }
}

function setPage(page) {
    currentPage = page;
    renderReceiptReport('pageChange');
}

function formatDateThai(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parseInt(parts[0]) + 543}`;
}

// ---------------- EXPORT FUNCTIONS ----------------

function exportReceiptReportExcel() {
    if (filteredReceipts.length === 0) {
        Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลสำหรับ Export', 'warning');
        return;
    }

    const dataToExport = filteredReceipts.map(p => ({
        'วันที่ออกใบเสร็จ': formatDateThai(p.date),
        'เลขที่ใบเสร็จ': p.receipt_no || '-',
        'ชื่อลูกค้า': p.customer_name || '-',
        'ยอดเงิน': p.status === 'cancelled' ? 0 : (parseFloat(p.amount) || 0),
        'สถานะ': p.status === 'cancelled' ? 'ยกเลิก' : 'ใช้งาน',
        'หมายเหตุ': p.status === 'cancelled' ? (p.cancel_reason || '') : (p.note || '')
    }));

    const totalAmount = filteredReceipts
        .filter(p => p.status !== 'cancelled')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    dataToExport.push({
        'วันที่ออกใบเสร็จ': 'สรุป',
        'เลขที่ใบเสร็จ': `จำนวนใบเสร็จ: ${filteredReceipts.length} ใบ`,
        'ชื่อลูกค้า': '',
        'ยอดเงิน': totalAmount,
        'สถานะ': '',
        'หมายเหตุ': ''
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "รายงานใบเสร็จ");

    const timeMode = document.getElementById('filterTimeMode').value;
    let filename = 'Receipt_Report';
    if (timeMode === 'daily') filename += '_' + document.getElementById('filterDate').value;
    else if (timeMode === 'monthly') filename += '_' + document.getElementById('filterYear').value + '-' + document.getElementById('filterMonth').value;
    else if (timeMode === 'yearly') filename += '_' + document.getElementById('filterYear').value;

    XLSX.writeFile(workbook, `${filename}.xlsx`);
}

function exportReceiptReportPDF() {
    if (filteredReceipts.length === 0) {
        Swal.fire('แจ้งเตือน', 'ไม่มีข้อมูลสำหรับ Export', 'warning');
        return;
    }

    let totalAmount = 0;
    let rowsHtml = '';
    
    filteredReceipts.forEach(p => {
        const isCancelled = p.status === 'cancelled';
        if (!isCancelled) totalAmount += (parseFloat(p.amount) || 0);
        
        const style = isCancelled ? 'color:#9ca3af; text-decoration:line-through;' : '';
        const statusText = isCancelled ? '<span style="color:#dc2626">ยกเลิก</span>' : '<span style="color:#16a34a">ใช้งาน</span>';
        
        rowsHtml += `
            <tr style="${style}">
                <td class="text-center" style="white-space: nowrap;">${formatDateThai(p.date)}</td>
                <td class="text-center" style="white-space: nowrap;">${p.receipt_no || '-'}</td>
                <td class="text-left">${p.customer_name || '-'}</td>
                <td class="text-right">${isCancelled ? '0.00' : (parseFloat(p.amount) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td class="text-center">${statusText}</td>
                <td class="text-left">${isCancelled ? (p.cancel_reason || '') : (p.note || '')}</td>
            </tr>
        `;
    });

    // Summary row
    rowsHtml += `
        <tr class="summary-row">
            <td colspan="3" class="text-center">รวมจำนวนใบเสร็จ: ${filteredReceipts.length} ใบ</td>
            <td class="text-right">${totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            <td colspan="2"></td>
        </tr>
    `;

    const html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <title>รายงานใบเสร็จรับเงิน</title>
        <style>
            @import url("https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap");
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: "Sarabun", sans-serif; color: #1a1a1a; padding: 30px 40px; font-size: 14px; }
            @media print { 
                body { padding: 15px 20px; } 
                @page { size: A4 portrait; margin: 10mm; } 
                .print-actions { display: none !important; }
            }
            .report-header { text-align: center; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 3px solid #1a56db; }
            .report-header h1 { font-size: 20px; font-weight: 700; color: #1a56db; margin-bottom: 4px; }
            .report-header p { font-size: 13px; color: #555; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            thead th { background: #1a56db; color: #fff; padding: 10px 8px; text-align: center; font-weight: 600; font-size: 13px; border: 1px solid #1a56db; }
            tbody td { padding: 8px; border: 1px solid #d1d5db; vertical-align: middle; }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .summary-row { background: #eef2ff !important; font-weight: 700; font-size: 14px; }
            .summary-row td { border-top: 2px solid #1a56db; }
            .print-actions { text-align: center; margin: 20px 0; }
            .print-actions button { padding: 10px 28px; margin: 0 8px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: "Sarabun", sans-serif; }
            .btn-print { background: #1a56db; color: #fff; }
            .btn-close-win { background: #dc2626; color: #fff; }
        </style>
    </head>
    <body>
        <div class="print-actions">
            <button class="btn-print" onclick="window.print()">🖨️ สั่งพิมพ์ / บันทึก PDF</button>
            <button class="btn-close-win" onclick="window.close()">❌ ปิดหน้าต่าง</button>
        </div>
        <div class="report-header">
            <h1>รายงานใบเสร็จรับเงิน</h1>
            <p>พิมพ์เมื่อ: ${new Date().toLocaleString('th-TH')}</p>
        </div>
        <table>
            <thead>
                <tr>
                    <th style="width: 15%; white-space: nowrap;">วันที่ออกใบเสร็จ</th>
                    <th style="width: 20%; white-space: nowrap;">เลขที่ใบเสร็จ</th>
                    <th style="width: 25%">ชื่อลูกค้า</th>
                    <th style="width: 15%">ยอดเงิน</th>
                    <th style="width: 10%">สถานะ</th>
                    <th style="width: 15%">หมายเหตุ</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>
        <script>
            setTimeout(() => { window.print(); }, 500);
        </script>
    </body>
    </html>
    `;

    const w = window.open('', '_blank', 'width=1000,height=700');
    w.document.open();
    w.document.write(html);
    w.document.close();
}
