/**
 * waste-payment.js — Payment Processing Module
 * Receipt Generation, Walk-in Payment, Print
 */

// ============================================
// RECEIPT PRINTING
// ============================================

function formatMonthsGroupedByYear(months_paid, isSlip = false) {
    let pm = months_paid;
    if (typeof pm === 'string') {
        try { pm = JSON.parse(pm); } catch(e) { pm = pm.split(','); }
    }
    if (!Array.isArray(pm)) pm = [];
    
    pm = pm.map(m => m ? m.trim() : '').filter(Boolean);
    if (pm.length === 0) return '-';
    
    const groups = {};
    pm.forEach(label => {
        const parts = label.split(' ');
        if (parts.length >= 2) {
            const mName = parts[0];
            const ySuffix = parts[1];
            const calYear = 2500 + parseInt(ySuffix, 10);
            let fy = calYear;
            if (['ต.ค.', 'พ.ย.', 'ธ.ค.'].includes(mName)) {
                fy += 1;
            }
            if (!groups[fy]) groups[fy] = [];
            groups[fy].push(label);
        } else {
            if (!groups['อื่น ๆ']) groups['อื่น ๆ'] = [];
            groups['อื่น ๆ'].push(label);
        }
    });
    
    const fyKeys = Object.keys(groups).sort();
    if (fyKeys.length === 0) return pm.join(', ');
    
    let html = '';
    fyKeys.forEach(fy => {
        const title = fy !== 'อื่น ๆ' ? `ปีงบประมาณ ${fy}` : fy;
        if (isSlip) {
            html += `<div style="margin-bottom:1px"><span style="font-weight:600;">${title}:</span><br>${groups[fy].join(', ')}</div>`;
        } else {
            html += `<div style="margin-bottom:3px;"><strong style="color:#1a56db;font-size:0.95em;">${title}</strong><br>${groups[fy].join(', ')}</div>`;
        }
    });
    return html;
}

async function printReceiptA4(payment) {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) {
        alert('กรุณาอนุญาต Pop-up เพื่อพิมพ์ใบเสร็จ');
        return;
    }
    
    const settings = JSON.parse(localStorage.getItem('waste_settings') || '{}');
    const logo = settings.org_logo || 'https://drive.google.com/thumbnail?id=1cPWRFVoN48eV6lJVS9E7nd2Mi7y5IQj8&sz=w200';
    const orgName = settings.org_name || 'เทศบาลตำบล GOOD GOV';
    const orgAddress = settings.org_address || '';
    const orgPhone = settings.org_phone || '';
    
    let staffSignatureHTML = '<div style="height:35px;"></div>';
    if (payment.staff && typeof supabaseClient !== 'undefined') {
        try {
            const { data, error } = await supabaseClient.from('waste_staff')
                .select('signature_image_url')
                .ilike('name', `%${payment.staff.trim()}%`)
                .limit(1);
            
            if (data && data.length > 0 && data[0].signature_image_url) {
                staffSignatureHTML = `<img src="${data[0].signature_image_url}" style="height:30px;display:block;margin:0 auto 2px;">`;
            }
        } catch (e) {
            console.error('Failed to load staff signature', e);
        }
    }

    const formatThaiDateFull = (dateStr) => {
        if (!dateStr) return '-';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const year = parseInt(parts[0], 10) + 543;
        const monthNum = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const thaiMonths = [
            '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
            'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
        ];
        return `${day} ${thaiMonths[monthNum]} ${year}`;
    };

    const createHalf = (title) => `
    <div class="receipt-half">
        <div class="header">
            <img src="${logo}" alt="Logo">
            <h2>${title}</h2>
            <p style="margin:0;font-size:12px;color:#6b7280">${orgName}</p>
            <p style="margin:0;font-size:11px;color:#9ca3af">${orgAddress} ${orgPhone}</p>
        </div>
        <div class="info-grid">
            <div class="info-item"><div class="info-label">เลขที่ใบเสร็จ</div><div class="info-value">${payment.receipt_no}</div></div>
            <div class="info-item"><div class="info-label">วันที่</div><div class="info-value">${formatThaiDateFull(payment.date)}</div></div>
            <div class="info-item"><div class="info-label">ชื่อผู้ชำระ</div><div class="info-value">${payment.customer_name}</div></div>
            <div class="info-item"><div class="info-label">บ้านเลขที่</div><div class="info-value">${payment.house_no}</div></div>
            <div class="info-item"><div class="info-label">เดือนที่ชำระ</div><div class="info-value" style="font-size:12px;">${formatMonthsGroupedByYear(payment.months_paid)}</div></div>
            <div class="info-item"><div class="info-label">ช่องทางชำระ</div><div class="info-value">${payment.method}</div></div>
        </div>
        <div class="total">ยอดชำระ: ฿${formatMoneyDecimal(payment.amount)}</div>
        <div class="info-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="info-item" style="text-align:center;">
                <div class="info-label" style="text-align:left;">เจ้าหน้าที่รับเงิน</div>
                ${staffSignatureHTML}
                <div class="info-value" style="font-size:11px;">( ${payment.staff || '-'} )<br><span style="font-weight:400;font-size:10px;">เจ้าหน้าที่ผู้รับเงิน</span></div>
            </div>
            <div></div>
        </div>
        <div class="footer"><p>เอกสารนี้ออกโดยระบบ GOOD GOV &mdash; ${orgName}</p></div>
    </div>
    `;

    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
    body{font-family:'Prompt',sans-serif;margin:0;padding:0;color:#333;background:#fff;line-height:1.3;}
    .page { width: 210mm; height: 296mm; padding: 10mm 15mm 5mm 15mm; box-sizing: border-box; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; }
    .receipt-half { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 0; }
    .cut-line { border-top: 1px dashed #999; margin: 2mm 0; position: relative; }
    .cut-line::after { content: "✂ รอยปรุสำหรับฉีก"; position: absolute; right: 0; top: -8px; background: #fff; padding: 0 10px; font-size: 10px; color: #999; }
    .header{text-align:center;margin-bottom:4px;border-bottom:1px solid #1a56db;padding-bottom:6px}
    .header img{height:45px;margin-bottom:2px}
    h2{margin:0 0 2px 0;color:#1a56db;font-size:16px;line-height:1.2;} 
    .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0}
    .info-item{padding:4px 10px;background:#f8fafc;border-radius:6px}
    .info-label{font-size:11px;color:#6b7280;font-weight:500;margin-bottom:1px;} 
    .info-value{font-size:14px;font-weight:600}
    .total{text-align:right;font-size:18px;font-weight:700;color:#057a55;margin:6px 0;padding:6px 12px;background:#f0fdf4;border-radius:6px}
    .footer{text-align:center;margin-top:auto;font-size:11px;color:#9ca3af;border-top:1px dashed #d1d5db;padding-top:6px}
    @media print{
        body { background: none; }
        @page { size: A4; margin: 0; }
        .page { padding: 10mm 15mm 5mm 15mm; width: 210mm; height: 296mm; page-break-after: avoid; }
    }
    </style></head><body>
    <div class="page">
        ${createHalf('ใบเสร็จรับเงินค่าธรรมเนียมขยะมูลฝอย')}
        <div class="cut-line"></div>
        ${createHalf('สำเนาใบเสร็จรับเงินค่าธรรมเนียมขยะมูลฝอย')}
    </div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 800);
}

function printReceiptSlip(payment) {
    const settings = JSON.parse(localStorage.getItem('waste_settings') || '{}');
    const orgName = settings.org_name || 'เทศบาลตำบล GOOD GOV';
    const w = window.open('', '_blank', 'width=350,height=500');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>@import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600&display=swap');
    body{font-family:'Prompt',sans-serif;padding:15px;font-size:12px;width:280px;margin:0 auto}
    .center{text-align:center} h3{margin:5px 0;font-size:14px} hr{border:none;border-top:1px dashed #ccc;margin:8px 0}
    .row{display:flex;justify-content:space-between;margin:3px 0} .total{font-size:18px;font-weight:700;color:#057a55;text-align:center;margin:10px 0}
    </style></head><body>
    <div class="center"><h3>ใบเสร็จค่าขยะมูลฝอย</h3><p style="margin:2px 0;font-size:11px">${orgName}</p></div><hr>
    <div class="row"><span>เลขที่:</span><span>${payment.receipt_no}</span></div>
    <div class="row"><span>วันที่:</span><span>${payment.date}</span></div><hr>
    <div class="row"><span>ชื่อ:</span><span>${payment.customer_name}</span></div>
    <div class="row"><span>บ้านเลขที่:</span><span>${payment.house_no}</span></div>
    <div class="row" style="align-items:flex-start;"><span>เดือน:</span><span style="text-align:right;">${formatMonthsGroupedByYear(payment.months_paid, true)}</span></div>
    <div class="row"><span>ช่องทาง:</span><span>${payment.method}</span></div><hr>
    <div class="total">฿${formatMoneyDecimal(payment.amount)}</div><hr>
    <div class="row"><span>เจ้าหน้าที่:</span><span>${payment.staff||'-'}</span></div>
    <div class="center" style="margin-top:10px;font-size:10px;color:#999">GOOD GOV System</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
}

// ============================================
// WALK-IN PAYMENT PROCESSING (Async + Supabase)
// ============================================
async function processWalkInPayment(customerId, selectedMonths, method, staffName, customReceiptNo, payDate = null) {
    const customers = getWasteCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return null;

    const amount = selectedMonths.reduce((sum, m) => sum + m.fee, 0);
    const selectedLabels = selectedMonths.map(m => m.label);
    const primaryYear = selectedMonths[0]?.year || new Date().getFullYear().toString();
    const now = new Date();
    const receiptNo = customReceiptNo || generateReceiptNumber();
    
    // If payDate is provided, use it, otherwise fallback to today's date
    const actualPayDate = payDate ? payDate : now.toISOString().split('T')[0];
    
    const payment = {
        id: 'PAY' + Date.now().toString().slice(-6),
        receipt_no: receiptNo,
        customer_id: customerId,
        customer_name: customer.name,
        house_no: customer.house_no + ' ม.' + customer.moo,
        amount: amount,
        months_paid: selectedLabels, // e.g. ["ต.ค. 68"]
        fiscal_year: primaryYear,
        method: method,
        date: actualPayDate,
        time: now.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}),
        status: 'completed',
        staff: staffName,
        source: 'walk-in'
    };

    // Save payment to Supabase + localStorage
    await saveWastePaymentDB(payment);

    // Update monthly status to 'exempted' in Supabase + localStorage
    for (const m of selectedMonths) {
        await saveMonthlyStatusDB(customerId, m.year, m.key, 'paid', payment.id);
    }

    // Auto-save receipt to Google Drive
    if (typeof autoSaveReceiptToDrive === 'function') {
        autoSaveReceiptToDrive(payment).catch(function(e) {
            console.warn('Auto save receipt failed:', e);
        });
    }

    return payment;
}

// ============================================
// EXEMPT PAYMENT PROCESSING (Async + Supabase)
// ============================================
async function processExemptPayment(customerId, selectedMonths, reason, staffName) {
    const customers = getWasteCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return null;

    const now = new Date();
    const primaryYear = selectedMonths[0]?.year || new Date().getFullYear().toString();
    const selectedLabels = selectedMonths.map(m => m.label);
    const selectedKeys = selectedMonths.map(m => m.key);
    
    const exemption = {
        id: 'EX' + Date.now().toString().slice(-6),
        customer_id: customerId,
        customer_name: customer.name,
        house_no: customer.house_no + ' ม.' + customer.moo,
        months_exempted: selectedLabels,
        month_keys: selectedKeys,
        fiscal_year: primaryYear,
        reject_reason: reason,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}),
        status: 'exempted',
        staff: staffName
    };

    await saveWasteExemptionDB(exemption);

    for (const key of selectedKeys) {
        // Attempt to save to monthly status DB, though we now also rely on local merging.
        await saveMonthlyStatusDB(customerId, selectedYear, key, 'exempted', exemption.id);
    }

    return exemption;
}

async function exemptPayment() {
    if (!selectedCustomer) return;
    let selectedVals = [];
    if (typeof selectedWalkInMonths !== 'undefined' && Object.keys(selectedWalkInMonths).length > 0) {
        selectedVals = Object.values(selectedWalkInMonths);
    } else {
        const checkboxes = Array.from(document.querySelectorAll('#monthCheckboxes input:checked'));
        selectedVals = checkboxes.map(cb => ({
            key: cb.getAttribute('data-key'),
            year: cb.getAttribute('data-year') || selectedYear,
            fee: parseFloat(cb.getAttribute('data-fee')),
            label: cb.value
        }));
    }
    
    if (!selectedVals.length) { Swal.fire('กรุณาเลือกเดือน','เลือกอย่างน้อย 1 เดือน','warning'); return; }
    
    selectedVals.sort((a, b) => {
        if (a.year !== b.year) return parseInt(a.year) - parseInt(b.year);
        return WASTE_MONTH_KEYS.indexOf(a.key) - WASTE_MONTH_KEYS.indexOf(b.key);
    });
    
    const checkedLabels = selectedVals.map(m => m.label);
    
    const staffName = document.getElementById('payStaff').value;
    if (!staffName) { Swal.fire('กรุณาเลือกเจ้าหน้าที่','เลือกเจ้าหน้าที่รับชำระก่อนดำเนินการ','warning'); return; }

    const r = await Swal.fire({
        title:'ยืนยันการยกเว้นชำระ?',
        html:`<b>${selectedCustomer.name}</b><br>เดือนที่ยกเว้น: ${checkedLabels.join(', ')}`,
        input: 'text',
        inputPlaceholder: 'ใส่หมายเหตุ การยกเว้น',
        icon:'warning',
        showCancelButton:true,
        confirmButtonText:'บันทึกยกเว้น',
        cancelButtonText:'ยกเลิก',
        confirmButtonColor:'#d33',
        preConfirm: (value) => {
            if (!value) {
                Swal.showValidationMessage('กรุณาใส่หมายเหตุ');
            }
            return value;
        }
    });

    if (r.isConfirmed) {
        Swal.fire({title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading()});
        const payment = await processExemptPayment(selectedCustomer.id, selectedVals, r.value, staffName);
        
        Swal.close();
        if (payment) {
            Swal.fire({title:'บันทึกสำเร็จ!',text:'ทำรายการยกเว้นชำระเรียบร้อยแล้ว',icon:'success'});
            selectCustomer(selectedCustomer.id, selectedYear);
            if (typeof refreshOnlinePayments === 'function') refreshOnlinePayments();
        }
    }
}


// ============================================
// CITIZEN PORTAL PAYMENT VERIFICATION (Async + Supabase)
// ============================================
async function approveCitizenPayment(paymentId) {
    const payments = getWastePayments();
    const p = payments.find(x => x.id === paymentId);
    if (!p) return null;
    p.status = 'completed';
    p.receipt_no = p.receipt_no || generateReceiptNumber();

    // Save updated payment to Supabase
    await saveWastePaymentDB(p);

    // Update monthly status
    const months = Array.isArray(p.months_paid) ? p.months_paid : [p.months_paid];
    const fiscalYear = p.fiscal_year || getCurrentFiscalYear();
    for (const ml of months) {
        const idx = WASTE_MONTHS.indexOf(ml);
        if (idx >= 0) {
            await saveMonthlyStatusDB(p.customer_id, fiscalYear, WASTE_MONTH_KEYS[idx], 'paid', p.id);
        }
    }
    return p;
}

async function rejectCitizenPayment(paymentId, reason) {
    const payments = getWastePayments();
    const p = payments.find(x => x.id === paymentId);
    if (!p) return null;
    p.status = 'rejected';
    p.reject_reason = reason || 'ไม่ผ่านการตรวจสอบ';

    // Save updated payment to Supabase
    await saveWastePaymentDB(p);
    return p;
}

// ============================================
// ONLINE TRANSACTION APPROVAL (Async + Supabase)
// ============================================
async function processOnlineApproval(transaction) {
    const now = new Date();
    const receiptNo = generateReceiptNumber();
    
    let pm = transaction.paid_months;
    if (typeof pm === 'string') {
        try { pm = JSON.parse(pm); } catch(e) { pm = pm.split(','); }
    }
    if (!Array.isArray(pm)) pm = [];
    pm = pm.map(k => k ? k.trim() : '').filter(Boolean);

    pm.sort((a, b) => {
        return WASTE_MONTH_KEYS.indexOf(a) - WASTE_MONTH_KEYS.indexOf(b);
    });

    // 1. Create main payment record
    const payment = {
        id: 'PAY' + Date.now().toString().slice(-6),
        receipt_no: receiptNo,
        customer_id: transaction.citizen_id,
        customer_name: transaction.payer_name,
        house_no: transaction.house_no,
        amount: transaction.amount,
        // Convert keys to labels for display
        months_paid: pm.map(k => {
            const idx = WASTE_MONTH_KEYS.indexOf(k);
            return idx >= 0 ? `${WASTE_MONTHS[idx]} ${String(transaction.fiscal_year).substring(2)}` : k;
        }),
        fiscal_year: transaction.fiscal_year,
        method: transaction.payment_method,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'}),
        status: 'completed',
        staff: 'System Approval', // or pass current logged in admin
        source: 'citizen-portal'
    };

    // Save main payment
    await saveWastePaymentDB(payment);

    // 2. Update monthly status
    for (const key of transaction.paid_months) {
        await saveMonthlyStatusDB(transaction.citizen_id, transaction.fiscal_year, key, 'paid', payment.id);
    }

    // 3. Update transaction status
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        await supabaseClient
            .from('garbage_payment_transactions')
            .update({ status: 'approved' })
            .eq('id', transaction.id);
    } else {
        const local = JSON.parse(localStorage.getItem('garbage_payment_transactions') || '[]');
        const idx = local.findIndex(x => x.id === transaction.id);
        if (idx >= 0) {
            local[idx].status = 'approved';
            localStorage.setItem('garbage_payment_transactions', JSON.stringify(local));
        }
    }

    return true;
}

async function processOnlineRejection(transactionId, reason) {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        await supabaseClient
            .from('garbage_payment_transactions')
            .update({ 
                status: 'rejected',
                reject_reason: reason 
            })
            .eq('id', transactionId);
    } else {
        const local = JSON.parse(localStorage.getItem('garbage_payment_transactions') || '[]');
        const idx = local.findIndex(x => x.id === transactionId);
        if (idx >= 0) {
            local[idx].status = 'rejected';
            local[idx].reject_reason = reason;
            localStorage.setItem('garbage_payment_transactions', JSON.stringify(local));
        }
    }
    return true;
}

// ============================================
// CANCEL AND DELETE PAYMENTS (Async + Supabase)
// ============================================
async function cancelWastePayment(paymentId, reason) {
    const payments = getWastePayments();
    const p = payments.find(x => x.id === paymentId);
    if (!p) return null;

    // 1. Update payment status
    p.status = 'cancelled';
    p.reject_reason = reason;
    await saveWastePaymentDB(p);

    // 2. Revert monthly status
    const months = Array.isArray(p.months_paid) ? p.months_paid : [p.months_paid];
    for (const ml of months) {
        if (!ml) continue;
        const parts = ml.split(' ');
        const mName = parts[0];
        
        let idx = WASTE_MONTHS.indexOf(mName);
        if (idx === -1) idx = WASTE_MONTHS.findIndex(m => mName.startsWith(m));
        if (idx === -1) continue;

        let monthFiscalYear = p.fiscal_year || getCurrentFiscalYear();
        if (parts.length >= 2) {
            const calYear = 2500 + parseInt(parts[1], 10);
            monthFiscalYear = (idx < 3) ? (calYear + 1).toString() : calYear.toString();
        }
        await saveMonthlyStatusDB(p.customer_id, monthFiscalYear, WASTE_MONTH_KEYS[idx], 'unpaid', null);
    }
    return p;
}

async function deleteWastePayment(paymentId) {
    const payments = getWastePayments();
    const p = payments.find(x => x.id === paymentId);
    if (!p) return false;

    // 1. Revert monthly status in Supabase first (to fix foreign key constraint)
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const { error: updErr } = await supabaseClient
            .from('waste_monthly_status')
            .update({ payment_id: null, status: 'unpaid' })
            .eq('payment_id', paymentId);
        if (updErr) {
            console.error('Error updating monthly status in Supabase:', updErr);
            return false;
        }
    }

    // 2. Delete payment from Supabase
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const { error } = await supabaseClient
            .from('waste_payments')
            .delete()
            .eq('id', paymentId);
        if (error) {
            console.error('Error deleting payment from Supabase:', error);
            return false;
        }
    }

    // 3. Revert monthly status in local cache
    const months = Array.isArray(p.months_paid) ? p.months_paid : [p.months_paid];
    for (const ml of months) {
        if (!ml) continue;
        const parts = ml.split(' ');
        const mName = parts[0];
        
        let idx = WASTE_MONTHS.indexOf(mName);
        if (idx === -1) idx = WASTE_MONTHS.findIndex(m => mName.startsWith(m));
        if (idx === -1) continue;

        let monthFiscalYear = p.fiscal_year || getCurrentFiscalYear();
        if (parts.length >= 2) {
            const calYear = 2500 + parseInt(parts[1], 10);
            monthFiscalYear = (idx < 3) ? (calYear + 1).toString() : calYear.toString();
        }

        // Just update local cache directly since Supabase is already updated
        const ms = getMonthlyStatus();
        if (!ms[p.customer_id]) ms[p.customer_id] = {};
        if (!ms[p.customer_id][monthFiscalYear]) ms[p.customer_id][monthFiscalYear] = {};
        ms[p.customer_id][monthFiscalYear][WASTE_MONTH_KEYS[idx]] = 'unpaid';
        saveMonthlyStatus(ms);
    }

    // 4. Delete from local cache
    const updatedPayments = payments.filter(x => x.id !== paymentId);
    saveWastePayments(updatedPayments);

    return true;
}

// ============================================
// CHAT SYSTEM (ADMIN)
// ============================================
let adminChatSubscription = null;
let activeAdminChatRoomId = null;
let allChatRooms = {}; 

async function initAdminChat() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

    try {
        const { data, error } = await supabaseClient
            .from('waste_chats')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
            
        if (!error && data) {
            allChatRooms = {};
            [...data].reverse().forEach(msg => {
                if (!allChatRooms[msg.room_id]) {
                    allChatRooms[msg.room_id] = { messages: [], unreadCount: 0, latestMsg: null, senderName: msg.sender_name };
                }
                allChatRooms[msg.room_id].messages.push(msg);
                allChatRooms[msg.room_id].latestMsg = msg;
                if (msg.sender_type === 'citizen' && !msg.is_read) {
                    allChatRooms[msg.room_id].unreadCount++;
                }
            });
            renderAdminChatRooms();
        }
        
        // Subscribe to all incoming chat messages
        if (!adminChatSubscription) {
            adminChatSubscription = supabaseClient
                .channel('admin_global_chat')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'waste_chats'
                }, payload => {
                    const newMsg = payload.new;
                    handleNewAdminMessage(newMsg);
                })
                .subscribe();
        }
    } catch(err) {
        console.error("Admin chat init error:", err);
    }
}

function handleNewAdminMessage(msg) {
    if (!allChatRooms[msg.room_id]) {
        allChatRooms[msg.room_id] = { messages: [], unreadCount: 0, latestMsg: null, senderName: msg.sender_name };
    }
    
    // Avoid duplicate if sent by admin
    const isDuplicate = allChatRooms[msg.room_id].messages.some(m => m.id === msg.id);
    if (!isDuplicate) {
        allChatRooms[msg.room_id].messages.push(msg);
    }
    
    allChatRooms[msg.room_id].latestMsg = msg;
    
    // Update unread count if it's from citizen and not the currently active room
    if (msg.sender_type === 'citizen' && msg.room_id !== activeAdminChatRoomId) {
        allChatRooms[msg.room_id].unreadCount++;
    } else if (msg.sender_type === 'citizen' && msg.room_id === activeAdminChatRoomId) {
        // Auto mark as read if room is open
        markRoomAsRead(msg.room_id);
    }

    renderAdminChatRooms();
    
    if (activeAdminChatRoomId === msg.room_id) {
        renderAdminChatMessages();
    }
}

function renderAdminChatRooms() {
    const listEl = document.getElementById('adminChatList');
    if (!listEl) return;
    
    const rooms = Object.keys(allChatRooms).map(roomId => {
        return { roomId, ...allChatRooms[roomId] };
    });
    
    rooms.sort((a, b) => {
        const dateA = a.latestMsg ? new Date(a.latestMsg.created_at) : new Date(0);
        const dateB = b.latestMsg ? new Date(b.latestMsg.created_at) : new Date(0);
        return dateB - dateA;
    });
    
    const totalEl = document.getElementById('totalActiveChats');
    if (totalEl) totalEl.innerText = rooms.length;
    
    let totalUnread = 0;
    
    if (rooms.length === 0) {
        listEl.innerHTML = '<div class="text-center py-5 text-muted">ยังไม่มีรายการสนทนา</div>';
    } else {
        listEl.innerHTML = rooms.map(r => {
            totalUnread += r.unreadCount;
            const msgPreview = r.latestMsg ? r.latestMsg.message.substring(0, 30) + (r.latestMsg.message.length > 30 ? '...' : '') : '';
            const isActive = r.roomId === activeAdminChatRoomId ? 'bg-primary-subtle' : 'bg-white';
            return `
            <div class="p-3 border-bottom ${isActive}" style="cursor:pointer; transition:0.2s;" onclick="selectAdminChatRoom('${r.roomId}')">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong class="text-dark">${r.senderName}</strong>
                    ${r.unreadCount > 0 ? `<span class="badge bg-danger rounded-pill">${r.unreadCount}</span>` : ''}
                </div>
                <div class="text-muted text-sm text-truncate">${r.latestMsg && r.latestMsg.sender_type==='official'? '<i class="fa-solid fa-reply me-1"></i>':''}${msgPreview}</div>
            </div>`;
        }).join('');
    }
    
    // Update global badge
    const badge = document.getElementById('adminGlobalUnreadBadge');
    const fabBadge = document.getElementById('adminFabUnreadBadge');
    
    if (totalUnread > 0) {
        if (badge) { badge.style.display = 'inline-block'; badge.innerText = totalUnread; }
        if (fabBadge) { fabBadge.style.display = 'inline-block'; fabBadge.innerText = totalUnread; }
    } else {
        if (badge) badge.style.display = 'none';
        if (fabBadge) fabBadge.style.display = 'none';
    }
}

function selectAdminChatRoom(roomId) {
    activeAdminChatRoomId = roomId;
    const room = allChatRooms[roomId];
    if (room) {
        const header = document.getElementById('adminChatHeader');
        if (header) {
            header.innerHTML = `
                <h6 class="mb-0 fw-bold"><i class="fa-regular fa-user-circle me-2 text-primary"></i>${room.senderName}</h6>
                <span class="ms-auto text-xs text-muted">Room: ${roomId}</span>
            `;
        }
        const inputArea = document.getElementById('adminChatInputArea');
        if (inputArea) inputArea.style.setProperty('display', 'flex', 'important');
        
        markRoomAsRead(roomId);
        renderAdminChatRooms();
        renderAdminChatMessages();
    }
}

function renderAdminChatMessages() {
    const area = document.getElementById('adminChatMessagesArea');
    if (!area || !activeAdminChatRoomId) return;
    
    const messages = allChatRooms[activeAdminChatRoomId].messages;
    
    area.innerHTML = messages.map(msg => {
        const timeStr = new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        const isOfficial = msg.sender_type === 'official';
        
        const bg = isOfficial ? '#06C755' : '#f1f5f9';
        const color = isOfficial ? 'white' : '#334155';
        const align = isOfficial ? 'flex-end' : 'flex-start';
        const borderRadius = isOfficial ? '16px 16px 4px 16px' : '16px 16px 16px 4px';
        
        return `
        <div style="display:flex; flex-direction:column; align-self: ${align}; max-width:75%;">
            <div style="background:${bg}; color:${color}; padding:10px 14px; border-radius:${borderRadius}; font-size:0.9rem; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                ${msg.message}
            </div>
            <div style="font-size:0.65rem; color:#94a3b8; margin-top:4px; text-align:${isOfficial?'right':'left'}">${timeStr}</div>
        </div>`;
    }).join('');
    
    area.scrollTop = area.scrollHeight;
}

function handleAdminChatKeypress(event) {
    if (event.key === 'Enter') {
        sendAdminMessage();
    }
}

async function sendAdminMessage() {
    const input = document.getElementById('adminChatInput');
    if (!input) return;
    const msgText = input.value.trim();
    
    if (!msgText || !activeAdminChatRoomId) return;
    
    input.value = '';
    
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('waste_chats')
                .insert([{
                    room_id: activeAdminChatRoomId,
                    sender_type: 'official',
                    sender_name: 'เจ้าหน้าที่กองคลัง',
                    message: msgText,
                    is_read: true // Read by sender natively
                }])
                .select();
                
            if (!error && data && data.length > 0) {
                const newMsg = data[0];
                const isDuplicate = allChatRooms[activeAdminChatRoomId].messages.some(m => m.id === newMsg.id);
                if (!isDuplicate) {
                    allChatRooms[activeAdminChatRoomId].messages.push(newMsg);
                    allChatRooms[activeAdminChatRoomId].latestMsg = newMsg;
                    renderAdminChatRooms();
                    renderAdminChatMessages();
                }
            }
        } catch(err) {
            console.error("Send admin message error:", err);
            if (typeof showToast !== 'undefined') showToast('ไม่สามารถส่งข้อความได้', 'danger');
        }
    }
}

async function markRoomAsRead(roomId) {
    if (allChatRooms[roomId] && allChatRooms[roomId].unreadCount > 0) {
        allChatRooms[roomId].unreadCount = 0;
        
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                await supabaseClient
                    .from('waste_chats')
                    .update({ is_read: true })
                    .eq('room_id', roomId)
                    .eq('sender_type', 'citizen')
                    .eq('is_read', false);
            } catch(e) {
                console.error("Mark read error", e);
            }
        }
    }
}

// Ensure chat init when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Supabase to be ready
    setTimeout(() => {
        initAdminChat();
    }, 1500);
});
