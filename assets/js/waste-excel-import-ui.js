/**
 * waste-excel-import-ui.js — UI Logic for Smart Excel Import
 */
let workbook = null, selectedSheet = '', parsedResults = [], currentFileName = '', currentFilter = 'ALL';

document.addEventListener('DOMContentLoaded', async function() {
    Swal.fire({title:'กำลังโหลด...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
    initWasteData();
    await fetchWasteFeeTypes();
    await fetchWasteCustomers();
    await fetchMonthlyStatus();
    populateConfig();
    renderHistory();
    setupDragDrop();
    Swal.close();
});

function populateConfig() {
    const cy = parseInt(getCurrentFiscalYear());
    let opts = '';
    for (let y = cy-3; y <= cy+1; y++) opts += `<option value="${y}" ${y===cy?'selected':''}>${y}</option>`;
    document.getElementById('cfgYear').innerHTML = opts;
    let mooOpts = '<option value="">อัตโนมัติ</option>';
    for (let i = 1; i <= 23; i++) mooOpts += `<option value="${i}">หมู่ ${i}</option>`;
    document.getElementById('cfgMoo').innerHTML = mooOpts;
}

function setupDragDrop() {
    const dz = document.getElementById('dropZone');
    ['dragenter','dragover'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.add('drag-over'); }));
    ['dragleave','drop'].forEach(e => dz.addEventListener(e, ev => { ev.preventDefault(); dz.classList.remove('drag-over'); }));
    dz.addEventListener('drop', ev => { if (ev.dataTransfer.files.length) processFile(ev.dataTransfer.files[0]); });
}

function handleFileSelect(e) { if (e.target.files.length) processFile(e.target.files[0]); }

function processFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx','xls','csv'].includes(ext)) { Swal.fire('ไฟล์ไม่รองรับ','กรุณาเลือกไฟล์ .xlsx, .xls หรือ .csv','error'); return; }
    if (file.size > 50*1024*1024) { Swal.fire('ไฟล์ใหญ่เกินไป','ขนาดไฟล์สูงสุด 50MB','error'); return; }
    currentFileName = file.name;
    document.getElementById('fileInfo').style.display = 'block';
    document.getElementById('fileInfo').innerHTML = `<div class="file-info-card">
        <div class="file-icon"><i class="fa-solid fa-file-excel"></i></div>
        <div><div class="fw-semibold">${file.name}</div><div class="text-xs text-muted">${(file.size/1024).toFixed(1)} KB</div></div>
        <button class="btn btn-sm btn-outline-danger ms-auto" onclick="clearFile()"><i class="fa-solid fa-xmark"></i></button>
    </div>`;

    Swal.fire({title:'กำลังอ่านไฟล์...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            workbook = XLSX.read(new Uint8Array(evt.target.result), {type:'array'});
            const sheets = workbook.SheetNames;
            document.getElementById('sheetSelector').innerHTML = sheets.map((s,i) =>
                `<button class="sheet-tab ${i===0?'active':''}" onclick="selectSheet('${s}',this)">${s}</button>`
            ).join('');
            selectedSheet = sheets[0];
            document.getElementById('btnAnalyze').disabled = false;
            Swal.close();
            showToast(`อ่านไฟล์สำเร็จ พบ ${sheets.length} sheet`,'success');
        } catch(err) {
            Swal.fire('อ่านไฟล์ไม่ได้','รูปแบบไฟล์ไม่ถูกต้อง: '+err.message,'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function selectSheet(name, btn) {
    selectedSheet = name;
    document.querySelectorAll('.sheet-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function clearFile() {
    workbook = null; selectedSheet = ''; parsedResults = []; currentFileName = ''; currentFilter = 'ALL';
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('sheetSelector').innerHTML = '<span class="text-muted text-xs">ยังไม่ได้เลือกไฟล์</span>';
    document.getElementById('btnAnalyze').disabled = true;
    document.getElementById('previewBody').innerHTML = '<tr><td colspan="21" class="text-center py-4 text-muted">ยังไม่มีข้อมูล</td></tr>';
    document.getElementById('filterStatus').value = 'ALL';
}

function analyzeFile() {
    if (!workbook || !selectedSheet) return;
    Swal.fire({title:'กำลังวิเคราะห์โครงสร้าง...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});

    setTimeout(() => {
        try {
            const ws = workbook.Sheets[selectedSheet];
            const customers = getWasteCustomers();
            const moo = document.getElementById('cfgMoo').value || null;
            const year = document.getElementById('cfgYear').value || null;
            const { results } = parseExcelSheet(ws, selectedSheet, customers, moo, year);
            parsedResults = results;

            // Validate against existing data
            const ms = getMonthlyStatus();
            const stats = validateImportBatch(parsedResults, ms);

            renderValidationSummary(stats);
            renderPreview();
            setStep(2);

            // Switch to preview tab
            new bootstrap.Tab(document.getElementById('tabPreviewLink')).show();
            Swal.close();
            showToast(`วิเคราะห์สำเร็จ: ${results.length} แถว`,'success');
        } catch(err) {
            Swal.fire('วิเคราะห์ไม่ได้','เกิดข้อผิดพลาด: '+err.message,'error');
            console.error(err);
        }
    }, 100);
}

function renderValidationSummary(stats) {
    const el = document.getElementById('validationSummary');
    el.innerHTML = `
        <div class="col-6 col-lg-3"><div class="validation-card" style="background:#f0f5ff">
            <div class="v-icon" style="background:#dbeafe;color:#1a56db"><i class="fa-solid fa-list"></i></div>
            <div><div class="v-value">${stats.total}</div><div class="v-label">ทั้งหมด</div></div>
        </div></div>
        <div class="col-6 col-lg-3"><div class="validation-card" style="background:#f0fdf4">
            <div class="v-icon" style="background:#dcfce7;color:#166534"><i class="fa-solid fa-check"></i></div>
            <div><div class="v-value text-success">${stats.successCount}</div><div class="v-label">พร้อมนำเข้า</div></div>
        </div></div>
        <div class="col-6 col-lg-3"><div class="validation-card" style="background:#fffbeb">
            <div class="v-icon" style="background:#fef9c3;color:#854d0e"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <div><div class="v-value" style="color:#854d0e">${stats.warningCount}</div><div class="v-label">ต้องตรวจสอบ</div></div>
        </div></div>
        <div class="col-6 col-lg-3"><div class="validation-card" style="background:#fef2f2">
            <div class="v-icon" style="background:#fecaca;color:#991b1b"><i class="fa-solid fa-xmark"></i></div>
            <div><div class="v-value text-danger">${stats.errorCount}</div><div class="v-label">ไม่สามารถนำเข้า</div></div>
        </div></div>`;
}

function applyFilter() {
    currentFilter = document.getElementById('filterStatus').value;
    renderPreview();
}

function renderPreview() {
    const tbody = document.getElementById('previewBody');
    if (!parsedResults.length) { tbody.innerHTML = '<tr><td colspan="21" class="text-center py-4 text-muted">ไม่พบข้อมูล</td></tr>'; return; }

    const filtered = currentFilter === 'ALL' ? parsedResults : parsedResults.filter(r => r.rowStatus === currentFilter);
    document.getElementById('filterCount').textContent = `แสดง ${filtered.length} จาก ${parsedResults.length} แถว`;

    // Show/hide approve buttons
    const warningCount = parsedResults.filter(r => r.rowStatus === 'WARNING').length;
    document.getElementById('btnApproveAll').style.display = warningCount > 0 ? '' : 'none';
    document.getElementById('warningCountBadge').textContent = warningCount;
    updateApprovalUI();

    if (!filtered.length) { tbody.innerHTML = '<tr><td colspan="21" class="text-center py-4 text-muted">ไม่มีข้อมูลที่ตรงกับตัวกรอง</td></tr>'; return; }

    tbody.innerHTML = filtered.map((r, idx) => {
        const rowCls = r.rowStatus === 'SUCCESS' ? 'import-row-success' : r.rowStatus === 'WARNING' ? 'import-row-warning' : 'import-row-error';
        const confCls = r.matchConfidence >= 90 ? 'confidence-high' : r.matchConfidence >= 70 ? 'confidence-medium' : r.matchConfidence >= 50 ? 'confidence-low' : 'confidence-none';
        const monthCells = FISCAL_MONTH_ORDER.map(mk => {
            const md = r.monthData[mk];
            if (!md) return '<td class="text-center text-muted">-</td>';
            const cls = md.status==='paid'?'paid':md.status==='pending'?'pending':md.status==='linked_payment'?'pending':'unpaid';
            const icon = md.status==='paid'?'✓':md.status==='pending'?'◷':md.status==='linked_payment'?'⇄':'✗';
            const title = md.mergeSource ? `[merge] ${md.mergeSource}` : (md.receipt ? `ใบเสร็จ: ${md.receipt}` : md.remark || md.status);
            return `<td class="text-center"><span class="month-mini ${cls}" title="${title}">${icon}</span></td>`;
        }).join('');
        const custName = r.matchedCustomer ? `<span class="text-success fw-semibold">${r.matchedCustomer.name}</span><br><span class="text-xs text-muted">${r.matchedCustomer.id}</span>` : '<span class="text-danger">ไม่พบ</span>';
        const statusIcon = r.rowStatus==='SUCCESS'?'<i class="fa-solid fa-check-circle text-success"></i>':r.rowStatus==='WARNING'?'<i class="fa-solid fa-exclamation-triangle text-warning"></i>':'<i class="fa-solid fa-times-circle text-danger"></i>';

        // Checkbox logic: SUCCESS=checked+disabled, WARNING=checkable, ERROR=unchecked+disabled
        let chkHtml = '';
        if (r.rowStatus === 'SUCCESS') {
            chkHtml = '<input type="checkbox" checked disabled class="form-check-input" style="opacity:0.6">';
        } else if (r.rowStatus === 'WARNING') {
            const checked = r._approved ? 'checked' : '';
            chkHtml = `<input type="checkbox" ${checked} class="form-check-input chk-warning" onchange="toggleRowCheck(${r.rowIndex}, this.checked)" title="ตรวจสอบแล้ว อนุมัตินำเข้า">`;
        } else {
            chkHtml = '<input type="checkbox" disabled class="form-check-input" style="opacity:0.3">';
        }

        return `<tr class="${rowCls}" data-status="${r.rowStatus}" data-rowidx="${r.rowIndex}">
            <td class="ps-2 text-center">${chkHtml}</td>
            <td class="text-muted text-xs">${r.rowIndex+1}</td>
            <td class="fw-semibold">${r.rawHouse||'-'}</td>
            <td>${r.rawName||'-'}</td>
            <td>${custName}</td>
            <td>${r.rawMoo||'-'}</td>
            ${monthCells}
            <td><span class="badge ${confCls}">${r.matchConfidence}%</span></td>
            <td class="text-center">${statusIcon}${r._approved?'<br><span class="text-xs text-success">อนุมัติ</span>':''}</td>
            <td class="text-xs">${r.issues.length?r.issues.join('<br>'):'<span class="text-success">OK</span>'}</td>
        </tr>`;
    }).join('');
}

function toggleRowCheck(rowIndex, checked) {
    const row = parsedResults.find(r => r.rowIndex === rowIndex);
    if (row) {
        row._approved = checked;
        if (checked) row.action = 'IMPORT';
        else row.action = 'SKIP';
    }
    updateApprovalUI();
}

function toggleAllChecks(checked) {
    const filtered = currentFilter === 'ALL' ? parsedResults : parsedResults.filter(r => r.rowStatus === currentFilter);
    filtered.forEach(r => {
        if (r.rowStatus === 'WARNING') {
            r._approved = checked;
            r.action = checked ? 'IMPORT' : 'SKIP';
        }
    });
    renderPreview();
}

function approveAllWarnings() {
    parsedResults.forEach(r => {
        if (r.rowStatus === 'WARNING') { r._approved = true; r.action = 'IMPORT'; }
    });
    renderPreview();
    showToast('อนุมัติรายการ "ต้องตรวจสอบ" ทั้งหมดแล้ว','success');
}

function unapproveAllWarnings() {
    parsedResults.forEach(r => {
        if (r.rowStatus === 'WARNING') { r._approved = false; r.action = 'SKIP'; }
    });
    renderPreview();
    showToast('ยกเลิกอนุมัติทั้งหมดแล้ว','info');
}

function updateApprovalUI() {
    const approved = parsedResults.filter(r => r.rowStatus === 'WARNING' && r._approved).length;
    const totalWarnings = parsedResults.filter(r => r.rowStatus === 'WARNING').length;
    const el = document.getElementById('approvedCount');
    const elNum = document.getElementById('approvedNum');
    const btnUnapprove = document.getElementById('btnUnapproveAll');
    if (approved > 0) {
        el.style.display = '';
        elNum.textContent = approved + '/' + totalWarnings;
        btnUnapprove.style.display = '';
    } else {
        el.style.display = 'none';
        btnUnapprove.style.display = 'none';
    }
}

function setStep(n) {
    for (let i = 1; i <= 4; i++) {
        const s = document.getElementById('step'+i);
        s.classList.remove('active','done');
        if (i < n) s.classList.add('done');
        else if (i === n) s.classList.add('active');
    }
    document.querySelectorAll('.import-step-line').forEach((l,i) => { l.classList.toggle('done', i < n-1); });
}

function updateImportProgress(current, total) {
    const pct = Math.round((current / total) * 100);
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progressPct').textContent = pct + '%';
    document.getElementById('progressLabel').textContent = `นำเข้า ${current}/${total} แถว`;
}

async function startImport() {
    const importable = parsedResults.filter(r => r.action !== 'SKIP');
    if (!importable.length) { Swal.fire('ไม่มีข้อมูล','ไม่มีแถวที่พร้อมนำเข้า<br><br>หากมีรายการ "ต้องตรวจสอบ" กรุณาติ๊กอนุมัติก่อน','warning'); return; }

    const successRows = parsedResults.filter(r => r.rowStatus === 'SUCCESS').length;
    const approvedRows = parsedResults.filter(r => r.rowStatus === 'WARNING' && r._approved).length;
    const skippedRows = parsedResults.filter(r => r.action === 'SKIP').length;
    const r = await Swal.fire({title:'ยืนยันนำเข้า?',html:`<div style="text-align:left;font-size:14px"><b class="text-success">พร้อมนำเข้า:</b> ${successRows} แถว<br><b class="text-warning">อนุมัติแล้ว:</b> ${approvedRows} แถว<br><b class="text-muted">ข้าม:</b> ${skippedRows} แถว<hr>รวมนำเข้า: <b>${importable.length}</b> แถว</div>`,icon:'question',showCancelButton:true,confirmButtonText:'นำเข้า',cancelButtonText:'ยกเลิก',confirmButtonColor:'#057a55'});
    if (!r.isConfirmed) return;

    document.getElementById('importProgressWrap').style.display = 'block';
    document.getElementById('btnImport').disabled = true;
    setStep(3);

    const user = getSessionUser();
    const batchId = 'IMP' + Date.now();
    const result = await executeImport(parsedResults, batchId, currentFileName, user ? user.name : 'System');

    document.getElementById('importProgressWrap').style.display = 'none';
    document.getElementById('btnImport').disabled = false;
    await fetchMonthlyStatus();
    renderHistory();

    Swal.fire({title:'นำเข้าสำเร็จ!',html:`สำเร็จ: <b class="text-success">${result.successCount}</b> | ผิดพลาด: <b class="text-danger">${result.errorCount}</b><br>Batch ID: <code>${batchId}</code>`,icon:'success',confirmButtonText:'ตกลง'});
}

function renderHistory() {
    const histories = getImportHistory();
    const tbody = document.getElementById('historyBody');
    if (!histories.length) { tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">ยังไม่มีประวัติการนำเข้า</td></tr>'; return; }

    tbody.innerHTML = histories.slice(0, 20).map(h => {
        const date = new Date(h.import_date).toLocaleString('th-TH',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
        const statusCls = h.status==='completed'?'history-status-completed':h.status==='rolled_back'?'history-status-rolled-back':'history-status-partial';
        const statusText = h.status==='completed'?'สำเร็จ':h.status==='rolled_back'?'ย้อนกลับแล้ว':'บางส่วน';
        return `<tr>
            <td class="ps-3 text-xs">${date}</td>
            <td class="fw-semibold text-xs">${h.filename||'-'}</td>
            <td class="text-xs">${h.user_name||'-'}</td>
            <td class="text-center">${h.total_rows}</td>
            <td class="text-center text-success fw-semibold">${h.success_count}</td>
            <td class="text-center text-danger fw-semibold">${h.error_count}</td>
            <td><span class="badge ${statusCls}">${statusText}</span></td>
            <td class="pe-3 text-center">
                ${h.status !== 'rolled_back' ? `<button class="btn btn-xs btn-outline-warning me-1" onclick="handleUndo('${h.batch_id}')" title="ย้อนกลับ"><i class="fa-solid fa-rotate-left"></i></button>` : ''}
                <button class="btn btn-xs btn-outline-info" onclick="viewImportDetail('${h.batch_id}')" title="ดูรายละเอียด"><i class="fa-solid fa-eye"></i></button>
            </td>
        </tr>`;
    }).join('');
}

async function handleUndo(batchId) {
    const r = await Swal.fire({title:'ยืนยันย้อนกลับ?',text:'ระบบจะคืนค่าสถานะทั้งหมดที่นำเข้าจาก batch นี้',icon:'warning',showCancelButton:true,confirmButtonText:'ย้อนกลับ',cancelButtonText:'ยกเลิก',confirmButtonColor:'#c81e1e'});
    if (!r.isConfirmed) return;
    Swal.fire({title:'กำลังย้อนกลับ...',allowOutsideClick:false,didOpen:()=>Swal.showLoading()});
    await undoImport(batchId);
    await fetchMonthlyStatus();
    renderHistory();
    Swal.close();
    showToast('ย้อนกลับสำเร็จ','success');
}

function viewImportDetail(batchId) {
    const histories = getImportHistory();
    const h = histories.find(x => x.batch_id === batchId);
    if (!h) return;
    const log = JSON.parse(h.import_data || '[]');
    const successRows = log.filter(l => l.status === 'success');
    const errorRows = log.filter(l => l.status !== 'success' && l.status !== 'skipped');
    const skippedRows = log.filter(l => l.status === 'skipped');
    Swal.fire({
        title: `รายละเอียด: ${h.filename}`,
        html: `<div style="text-align:left;font-size:13px;max-height:400px;overflow-y:auto">
            <p><b>Batch:</b> ${h.batch_id}<br><b>วันที่:</b> ${new Date(h.import_date).toLocaleString('th-TH')}<br><b>ผู้นำเข้า:</b> ${h.user_name||'-'}</p>
            <hr><p><b class="text-success">สำเร็จ ${successRows.length} รายการ</b> | <b class="text-danger">ผิดพลาด ${errorRows.length}</b> | <b class="text-muted">ข้าม ${skippedRows.length}</b></p>
            ${errorRows.length ? '<p class="fw-bold text-danger mt-2">รายการที่ผิดพลาด:</p><ul>' + errorRows.map(e => `<li>แถว ${e.row}: ${e.reason||'ไม่ทราบ'}</li>`).join('') + '</ul>' : ''}
        </div>`,
        width: 600,
        confirmButtonText: 'ปิด'
    });
}

function downloadErrorReport() {
    if (!parsedResults.length) { showToast('ไม่มีข้อมูล','warning'); return; }
    const errors = parsedResults.filter(r => r.issues.length > 0);
    const data = errors.map(r => ({'แถว':r.rowIndex+1,'บ้านเลขที่':r.rawHouse,'ชื่อ':r.rawName,'หมู่':r.rawMoo,'สถานะ':r.rowStatus,'ปัญหา':r.issues.join('; '),'ความมั่นใจ':r.matchConfidence+'%'}));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'errors');
    XLSX.writeFile(wb, 'error_report_' + Date.now() + '.xlsx');
    showToast('ดาวน์โหลด Error Report สำเร็จ','success');
}

async function exportImportTemplate() {
    Swal.fire({title:'กำลังสร้างไฟล์...', allowOutsideClick:false, didOpen:()=>Swal.showLoading()});
    
    // Ensure we have the latest customers
    let customers = getWasteCustomers();
    if (!customers || customers.length === 0) {
        customers = await fetchWasteCustomers();
    }
    
    // Sort customers by moo, then house_no
    customers.sort((a, b) => {
        const mooA = Number(a.moo) || 0;
        const mooB = Number(b.moo) || 0;
        if (mooA !== mooB) return mooA - mooB;
        return (a.house_no || '').localeCompare(b.house_no || '');
    });
    
    // Prepare data
    // Columns: รหัสลูกค้า, บ้านเลขที่, หมู่, ชื่อ-สกุล, ประเภท, ต.ค., พ.ย., ธ.ค., ม.ค., ก.พ., มี.ค., เม.ย., พ.ค., มิ.ย., ก.ค., ส.ค., ก.ย.
    const data = customers.map(c => {
        return {
            'รหัสลูกค้า': c.id,
            'บ้านเลขที่': c.house_no,
            'หมู่': c.moo,
            'ชื่อ-สกุล': c.name,
            'ประเภท': c.type || '-',
            'ต.ค.': '',
            'พ.ย.': '',
            'ธ.ค.': '',
            'ม.ค.': '',
            'ก.พ.': '',
            'มี.ค.': '',
            'เม.ย.': '',
            'พ.ค.': '',
            'มิ.ย.': '',
            'ก.ค.': '',
            'ส.ค.': '',
            'ก.ย.': ''
        };
    });
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Auto-size columns slightly
    const wscols = [
        {wch: 12}, // รหัสลูกค้า
        {wch: 10}, // บ้านเลขที่
        {wch: 8},  // หมู่
        {wch: 25}, // ชื่อ-สกุล
        {wch: 15}, // ประเภท
        {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, 
        {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}, {wch: 8}
    ];
    ws['!cols'] = wscols;
    
    // Create workbook and append sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "แบบฟอร์มนำเข้าชำระเงิน");
    
    // Save file
    const year = document.getElementById('cfgYear') ? document.getElementById('cfgYear').value : new Date().getFullYear() + 543;
    XLSX.writeFile(wb, `แบบฟอร์มนำเข้าชำระเงิน_ปี${year}.xlsx`);
    
    Swal.close();
    showToast('ดาวน์โหลดแบบฟอร์มสำเร็จ', 'success');
}
