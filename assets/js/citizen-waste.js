/**
 * citizen-waste.js — Citizen Garbage Fee Payment Logic
 * Fully integrated with waste.js + Supabase
 */

// ============================================
// STATE
// ============================================
let currentStep = 'search'; // search | details | payment
let selectedCustomer = null;
let selectedMonthKeys = [];
let slipBase64 = null;
let currentPendingMonths = [];

const CW_MONTH_NAMES = ['ตุลาคม','พฤศจิกายน','ธันวาคม','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน'];
const CW_MONTH_KEYS  = ['oct','nov','dec','jan','feb','mar','apr','may','jun','jul','aug','sep'];

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Init data layer from waste.js
    if (typeof initWasteData === 'function') initWasteData();
    
    // Build fiscal year dropdown immediately so it doesn't load slowly
    buildFiscalYearOptions();

    // 1. Auto-search immediately using LocalStorage data for speed
    const session = typeof LineAuth !== 'undefined' ? LineAuth.getSession() : null;
    let didAutoSearch = false;
    if (session) {
        if (session.houseNo) document.getElementById('searchInput').value = session.houseNo;
        if (session.moo) {
            const mooEl = document.getElementById('searchMoo');
            if (mooEl) {
                let mooVal = String(session.moo).replace(/\D/g, '');
                if (mooVal) mooEl.value = mooVal;
            }
        }
        if (session.houseNo || session.fullName || (session.firstName && session.lastName)) {
            searchCustomer(true);
            didAutoSearch = true;
        }
    }

    // 2. Fetch fresh data in background
    const fetchTasks = [];
    if (typeof fetchWasteSettings === 'function') fetchTasks.push(fetchWasteSettings());
    if (typeof fetchWasteFeeHistory === 'function') fetchTasks.push(fetchWasteFeeHistory());
    if (typeof fetchWasteCustomers === 'function') fetchTasks.push(fetchWasteCustomers());
    if (typeof fetchMonthlyStatus === 'function') fetchTasks.push(fetchMonthlyStatus());

    Promise.all(fetchTasks).then(() => {
        // 3. Re-render UI when fresh data arrives
        if (didAutoSearch) {
            if (selectedCustomer) {
                // Refresh months data without animation
                loadMonthlyStatus(true); 
            } else {
                // Try searching again with fresh data from Supabase!
                searchCustomer(true);
            }
        } else if (!didAutoSearch && session && (session.houseNo || session.fullName || (session.firstName && session.lastName))) {
            searchCustomer(true);
        }
    });

    // Fetch latest settings from Supabase and store in localStorage for the citizen portal
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            const { data, error } = await supabaseClient.from('waste_settings').select('*').limit(1).single();
            if (data && !error) {
                localStorage.setItem('waste_settings', JSON.stringify(data));
            }
        } catch (e) {
            console.error('Failed to load settings from Supabase', e);
        }
    }
});

function buildFiscalYearOptions() {
    const sel = document.getElementById('fiscalYearSelect');
    if (!sel) return;
    const now = new Date();
    const currentFY = now.getMonth() >= 9 ? now.getFullYear() + 544 : now.getFullYear() + 543;
    
    // ดึง customYears จากระบบ (ถ้ามี) แบบเดียวกับหลังบ้าน
    const customYears = typeof getWasteData === 'function' ? getWasteData('customYears') : [];
    const yearSet = new Set([String(currentFY - 1), String(currentFY), String(currentFY + 1)]);
    if (Array.isArray(customYears)) {
        customYears.forEach(y => yearSet.add(String(y)));
    }
    
    // เรียงจากมากไปน้อย
    const years = Array.from(yearSet).sort((a, b) => Number(b) - Number(a));

    sel.innerHTML = '';
    years.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        if (y === String(currentFY)) opt.selected = true;
        sel.appendChild(opt);
    });
}

function onFiscalYearChange() {
    selectedMonthKeys = [];
    loadMonthlyStatus();
}

// ============================================
// STEP NAVIGATION
// ============================================
function updateStepUI() {
    const steps = ['search','details','payment'];
    const idx = steps.indexOf(currentStep);
    for (let i = 1; i <= 3; i++) {
        const circle = document.getElementById('step' + i);
        const lbl = document.getElementById('lbl' + i);
        circle.classList.remove('active','done');
        lbl.classList.remove('active');
        if (i - 1 < idx) { circle.classList.add('done'); circle.innerHTML = '<i class="fa-solid fa-check" style="font-size:0.7rem"></i>'; }
        else if (i - 1 === idx) { circle.classList.add('active'); circle.textContent = i; lbl.classList.add('active'); }
        else { circle.textContent = i; }
    }
    for (let i = 1; i <= 2; i++) {
        const line = document.getElementById('line' + i);
        line.classList.toggle('done', i <= idx);
    }
}

function showSection(name) {
    ['sectionSearch','sectionDetails','sectionPayment'].forEach(id => {
        const el = document.getElementById(id);
        el.style.display = 'none';
    });
    const target = document.getElementById('section' + name.charAt(0).toUpperCase() + name.slice(1));
    if (target) { target.style.display = 'block'; target.classList.add('fade-in'); }
}

function goBack() {
    if (currentStep === 'payment') {
        currentStep = 'details';
        showSection('details');
        updateStepUI();
        updateActionButton();
    } else if (currentStep === 'details') {
        currentStep = 'search';
        selectedCustomer = null;
        selectedMonthKeys = [];
        showSection('search');
        document.getElementById('stickyAction').style.display = 'none';
        updateStepUI();
    } else {
        window.location.href = 'waste-payment-portal.html';
    }
}

// ============================================
// STEP 1: SEARCH
// ============================================

let cwSearchTimeout = null;
function handleSearchInput(e) {
    if (e.key === 'Enter') {
        document.getElementById('searchAutocomplete').style.display = 'none';
        searchCustomer();
        return;
    }
    
    clearTimeout(cwSearchTimeout);
    cwSearchTimeout = setTimeout(() => {
        const q = document.getElementById('searchInput').value.trim().toLowerCase();
        const mooEl = document.getElementById('searchMoo');
        const moo = mooEl ? mooEl.value : '';
        const ac = document.getElementById('searchAutocomplete');
        
        if (!ac) return;

        if (q.length < 1) {
            ac.style.display = 'none';
            return;
        }
        
        const customers = typeof getWasteCustomers === 'function' ? getWasteCustomers() : [];
        const matches = customers.filter(c => {
            if (moo && String(c.moo) !== String(moo)) return false;
            return (c.name && c.name.toLowerCase().includes(q)) || 
                   (c.house_no && String(c.house_no).includes(q));
        }).slice(0, 8); // Show top 8
        
        if (matches.length > 0) {
            ac.innerHTML = matches.map(c => `
                <li><a class="dropdown-item d-flex justify-content-between align-items-center py-2 border-bottom" href="javascript:void(0)" onclick="selectAutocomplete('${c.name}', '${c.house_no}', '${c.moo||''}')" style="white-space: normal;">
                    <div>
                        <div class="fw-semibold text-dark" style="font-size:0.9rem;">${c.name}</div>
                        <div class="text-muted" style="font-size:0.75rem;"><i class="fa-solid fa-house me-1"></i>บ้านเลขที่ ${c.house_no} ม.${c.moo||'-'}</div>
                    </div>
                    <span class="badge bg-light text-dark border">เลือก</span>
                </a></li>
            `).join('');
            ac.style.display = 'block';
        } else {
            ac.innerHTML = `<li><div class="dropdown-item text-muted small py-3 text-center">ไม่พบข้อมูล "${q}"</div></li>`;
            ac.style.display = 'block';
        }
    }, 300);
}

function selectAutocomplete(name, houseNo, moo) {
    document.getElementById('searchInput').value = name;
    if (moo && document.getElementById('searchMoo')) {
        document.getElementById('searchMoo').value = moo;
    }
    document.getElementById('searchAutocomplete').style.display = 'none';
    searchCustomer();
}

// Hide autocomplete when clicking outside
document.addEventListener('click', function(e) {
    const ac = document.getElementById('searchAutocomplete');
    const input = document.getElementById('searchInput');
    if (ac && input && !input.contains(e.target) && !ac.contains(e.target)) {
        ac.style.display = 'none';
    }
});

async function searchCustomer(isAuto = false) {
    const q = document.getElementById('searchInput').value.trim();
    const mooEl = document.getElementById('searchMoo');
    const moo = mooEl ? mooEl.value : '';
    const resultsDiv = document.getElementById('searchResults');

    if (!q && !moo && !isAuto) {
        cwToast('กรุณากรอกข้อมูลหรือเลือกหมู่เพื่อค้นหา', 'warning');
        return;
    }

    // Show skeleton
    resultsDiv.innerHTML = Array(3).fill('<div class="skeleton mb-2" style="height:62px;"></div>').join('');

    // Small delay for UX
    await new Promise(r => setTimeout(r, 300));

    // Force wait for real data if not loaded yet
    if (typeof stateCustomers !== 'undefined' && stateCustomers === null && typeof fetchWasteCustomers === 'function') {
        await fetchWasteCustomers();
    }

    const allCustomers = typeof getWasteCustomers === 'function' ? getWasteCustomers() : [];
    let matches = [];

    if (isAuto && typeof LineAuth !== 'undefined') {
        const session = LineAuth.getSession();
        if (session) {
            const sHouseNo = session.houseNo ? session.houseNo.trim() : '';
            const sMoo = session.moo ? String(session.moo).replace(/\D/g, '') : '';
            const sSubdistrict = session.subdistrictName ? session.subdistrictName.trim() : '';
            
            // 1. Try Address Match
            if (sHouseNo && sMoo && sSubdistrict) {
                matches = allCustomers.filter(c => c.status === 'active' && c.house_no === sHouseNo && String(c.moo) === sMoo && c.subdistrict === sSubdistrict);
            }
            
            // 2. Try Name Match (fallback)
            if (matches.length === 0 && session.firstName && session.lastName) {
                matches = allCustomers.filter(c => c.status === 'active' && c.name && c.name.includes(session.firstName) && c.name.includes(session.lastName));
            }
        }
    }

    // Manual search or auto-search didn't find specific matches
    if (matches.length === 0 && (q || moo)) {
        matches = allCustomers.filter(c => c.status === 'active');
        
        if (q) {
            matches = matches.filter(c => 
                (c.name && c.name.includes(q)) ||
                (c.house_no && c.house_no.includes(q)) ||
                (c.id_card && c.id_card.includes(q))
            );
        }
        
        if (moo) {
            matches = matches.filter(c => String(c.moo) === moo);
        }
    }

    if (matches.length === 0) {
        resultsDiv.innerHTML = `
            <div class="text-center py-4">
                <i class="fa-solid fa-face-sad-tear fa-2x text-muted mb-2" style="opacity:0.3;"></i>
                <p class="small text-muted mb-0">ไม่พบข้อมูลที่ตรงกัน</p>
            </div>`;
        return;
    }

    resultsDiv.innerHTML = matches.slice(0, 10).map((c, i) => {
        // Compute outstanding months for this customer
        const ms = typeof getMonthlyStatus === 'function' ? getMonthlyStatus() : {};
        const now = new Date();
        const fy = String(now.getMonth() >= 9 ? now.getFullYear() + 544 : now.getFullYear() + 543);
        const cstatus = (ms[c.id] || {})[fy] || {};
        let unpaidCount = 0;
        CW_MONTH_KEYS.forEach(k => { if (cstatus[k] !== 'paid') unpaidCount++; });

        return `
        <div class="sr-card mb-2" onclick="selectCustomer('${c.id}')" style="animation:fadeInUp 0.3s ${i * 0.06}s both;">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="fw-bold">${c.name}</div>
                    <div class="text-muted small">บ้านเลขที่ ${c.house_no} ม.${c.moo} · ${c.type}</div>
                </div>
                <div class="text-end">
                    <div class="fw-bold text-success">฿${cwFmt(c.fee)}</div>
                    ${unpaidCount > 0 ? `<span class="badge bg-danger rounded-pill" style="font-size:0.6rem;">ค้าง ${unpaidCount}</span>` : '<span class="badge bg-success rounded-pill" style="font-size:0.6rem;">ชำระครบ</span>'}
                </div>
            </div>
        </div>`;
    }).join('');
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    const mooEl = document.getElementById('searchMoo');
    if (mooEl) mooEl.value = '';
    
    document.getElementById('searchResults').innerHTML = `
        <div class="text-center text-muted py-4">
            <i class="fa-solid fa-file-invoice fa-2x mb-2" style="opacity:0.2;"></i>
            <p class="small mb-0">กรอกข้อมูลเพื่อค้นหาประวัติการชำระ</p>
        </div>`;
}

// ============================================
// STEP 2: DETAILS
// ============================================
async function selectCustomer(id) {
    selectedCustomer = (typeof getWasteCustomers === 'function' ? getWasteCustomers() : []).find(c => c.id === id);
    if (!selectedCustomer) return;

    selectedMonthKeys = [];
    currentStep = 'details';
    showSection('details');
    updateStepUI();

    document.getElementById('dispName').textContent = selectedCustomer.name;
    document.getElementById('dispAddress').textContent = `บ้านเลขที่ ${selectedCustomer.house_no} ม.${selectedCustomer.moo}`;
    document.getElementById('dispType').textContent = selectedCustomer.type;
    document.getElementById('dispFeePerMonth').textContent = `฿${cwFmt(selectedCustomer.fee)}`;

    document.getElementById('stickyAction').style.display = 'block';
    updateActionButton();
    
    // Auto-select oldest unpaid year
    try {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data } = await supabaseClient
                .from('garbage_payment_transactions')
                .select('fiscal_year, paid_months')
                .eq('citizen_id', selectedCustomer.id)
                .eq('status', 'pending');
            window.pendingTxMap = {};
            if (data) {
                data.forEach(r => {
                    if (!window.pendingTxMap[r.fiscal_year]) window.pendingTxMap[r.fiscal_year] = [];
                    window.pendingTxMap[r.fiscal_year] = window.pendingTxMap[r.fiscal_year].concat(r.paid_months);
                });
            }
        }
    } catch (e) { console.warn('Pending check failed', e); }

    const allStatus = typeof getMonthlyStatus === 'function' ? getMonthlyStatus() : {};
    const cStatus = allStatus[selectedCustomer.id] || {};
    let oldestUnpaidYear = null;
    const availableYears = Object.keys(cStatus).map(Number).sort((a,b)=>a-b);
    
    for (let y of availableYears) {
        let hasUnpaid = false;
        const yPending = (window.pendingTxMap || {})[y] || [];
        for (let k of CW_MONTH_KEYS) {
            let s = cStatus[y][k] || 'unpaid';
            if (yPending.includes(k)) s = 'pending';
            if (s !== 'paid' && s !== 'exempted' && s !== 'pending') {
                hasUnpaid = true;
                break;
            }
        }
        if (hasUnpaid) {
            oldestUnpaidYear = y;
            break;
        }
    }
    
    const sel = document.getElementById('fiscalYearSelect');
    if (sel) {
        if (oldestUnpaidYear) {
            for(let i=0; i<sel.options.length; i++) {
                if(sel.options[i].value == oldestUnpaidYear) {
                    sel.value = oldestUnpaidYear;
                    break;
                }
            }
        } else {
            const now = new Date();
            const currentFY = String(now.getMonth() >= 9 ? now.getFullYear() + 544 : now.getFullYear() + 543);
            for(let i=0; i<sel.options.length; i++) {
                if(sel.options[i].value == currentFY) {
                    sel.value = currentFY;
                    break;
                }
            }
        }
    }

    await loadMonthlyStatus();
}

async function loadMonthlyStatus(noAnimate = false) {
    const year = document.getElementById('fiscalYearSelect').value;
    const listDiv = document.getElementById('monthlyStatusList');
    const debtBadge = document.getElementById('dispDebtBadge');

    // Skeleton only on initial load
    if (!noAnimate) {
        listDiv.innerHTML = Array(4).fill('<div class="skeleton mb-2" style="height:58px;"></div>').join('');
        await new Promise(r => setTimeout(r, 200));
    }

    const allStatus = typeof getMonthlyStatus === 'function' ? getMonthlyStatus() : {};
    const customerStatus = (allStatus[selectedCustomer.id] || {})[year] || {};

    // Use cached pending map from selectCustomer
    let pendingMonths = (window.pendingTxMap || {})[year] || [];
    currentPendingMonths = pendingMonths;

    let html = '';
    let totalDebt = 0;
    let unpaidCount = 0;
    let firstUnpaidIdx = -1;
    
    // Check if there are unpaid months in PRIOR fiscal years
    let blockingYear = null;
    const availableYears = Object.keys(allStatus[selectedCustomer.id] || {}).map(Number).sort((a,b)=>a-b);
    const selectedYearNum = Number(year);
    
    for (let y of availableYears) {
        if (y >= selectedYearNum) continue;
        const yStatus = allStatus[selectedCustomer.id][y];
        const yPending = (window.pendingTxMap || {})[y] || [];
        let hasUnpaid = false;
        for (let k of CW_MONTH_KEYS) {
            let s = yStatus[k] || 'unpaid';
            if (yPending.includes(k)) s = 'pending';
            if (s !== 'paid' && s !== 'exempted' && s !== 'pending') {
                hasUnpaid = true;
                break;
            }
        }
        if (hasUnpaid) {
            blockingYear = y;
            break;
        }
    }
    
    window.currentBlockingYear = blockingYear;

    CW_MONTH_KEYS.forEach((key, i) => {
        let status = customerStatus[key] || 'unpaid';
        if (pendingMonths.includes(key)) status = 'pending';

        const isPaid = status === 'paid';
        const isPending = status === 'pending';
        const isExempted = status === 'exempted';
        const isUnpaid = !isPaid && !isPending && !isExempted;

        if (isUnpaid && firstUnpaidIdx === -1) firstUnpaidIdx = i;

        // A month is selectable if: unpaid AND (it IS the first unpaid OR all months before it up to firstUnpaid are selected)
        let isLocked = isUnpaid && firstUnpaidIdx !== -1 && i > firstUnpaidIdx && !allPreviousSelected(i, firstUnpaidIdx, customerStatus, pendingMonths);
        let lockedReason = 'รอชำระเดือนก่อนหน้า';
        
        if (isUnpaid && blockingYear) {
            isLocked = true;
            lockedReason = `กรุณาชำระปีงบฯ ${blockingYear} ให้ครบก่อน`;
        }
        
        const isSelectable = isUnpaid && !isLocked;
        const isSelected = selectedMonthKeys.includes(key);

        let mFee = getFeeForMonth(selectedCustomer.id, key, year);
        if (isExempted) mFee = 0;

        if (isUnpaid) { totalDebt += mFee; unpaidCount++; }

        let rowClass = '';
        let iconClass = '';
        let label = '';

        if (isPaid) { rowClass = 'paid'; iconClass = 'fa-circle-check'; label = 'ชำระแล้ว'; }
        else if (isExempted) { rowClass = 'locked'; iconClass = 'fa-minus'; label = 'ยกเว้นชำระ'; }
        else if (isPending) { rowClass = 'pending'; iconClass = 'fa-clock'; label = 'รอตรวจสอบ'; }
        else if (isSelected) { rowClass = 'selected selectable'; iconClass = 'fa-check'; label = 'เลือกแล้ว'; }
        else if (isLocked) { rowClass = 'locked'; iconClass = 'fa-lock'; label = lockedReason; }
        else { rowClass = 'unpaid selectable'; iconClass = 'fa-circle-xmark'; label = 'ค้างชำระ'; }

        const clickHandler = isSelectable || isSelected ? `onclick="toggleMonth('${key}')"` : '';
        const animationStyle = noAnimate ? '' : `style="animation:fadeInUp 0.25s ${i * 0.04}s both;"`;

        html += `
        <div class="mt-row ${rowClass}" ${clickHandler} ${animationStyle}>
            <div class="mt-icon"><i class="fa-solid ${iconClass}"></i></div>
            <div class="flex-grow-1">
                <div class="fw-semibold">${CW_MONTH_NAMES[i]}</div>
                <div class="small ${isUnpaid && !isLocked ? 'text-danger' : 'text-muted'}">${label}</div>
            </div>
            <div class="text-end">
                <div class="fw-bold ${isUnpaid ? '' : 'text-muted'}" style="font-size:0.95rem;">฿${cwFmt(mFee)}</div>
                ${isSelectable && !isSelected ? '<div class="text-success small fw-bold">แตะเพื่อเลือก</div>' : ''}
            </div>
        </div>`;
    });

    listDiv.innerHTML = html;

    // Update display fee per month in the header based on actual fees for this year
    const yearFees = CW_MONTH_KEYS.map(k => getFeeForMonth(selectedCustomer.id, k, year));
    const uniqueFees = [...new Set(yearFees)];
    const feeDisplayEl = document.getElementById('dispFeePerMonth');
    if (feeDisplayEl) {
        if (uniqueFees.length > 1) {
            feeDisplayEl.innerHTML = `<span title="ค่าธรรมเนียมเปลี่ยนระหว่างปี">฿${uniqueFees.map(f => cwFmt(f)).join(' → ')}</span>`;
        } else {
            feeDisplayEl.textContent = `฿${cwFmt(uniqueFees[0])}`;
        }
    }

    if (unpaidCount > 0) {
        debtBadge.style.display = '';
        debtBadge.textContent = `ค้าง ${unpaidCount} เดือน`;
    } else {
        debtBadge.style.display = 'none';
    }

    const btnToggleAll = document.getElementById('btnToggleAllMonths');
    if (btnToggleAll) {
        if (unpaidCount > 0) {
            btnToggleAll.style.display = '';
            btnToggleAll.textContent = selectedMonthKeys.length === unpaidCount ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด';
            btnToggleAll.className = selectedMonthKeys.length === unpaidCount ? 'btn btn-sm btn-outline-danger rounded-pill px-2 py-0 text-xs fw-semibold' : 'btn btn-sm btn-outline-success rounded-pill px-2 py-0 text-xs fw-semibold';
        } else {
            btnToggleAll.style.display = 'none';
        }
    }

    updateActionButton();
}

function allPreviousSelected(targetIdx, firstUnpaidIdx, customerStatus, pendingMonths) {
    for (let j = firstUnpaidIdx; j < targetIdx; j++) {
        const k = CW_MONTH_KEYS[j];
        const s = customerStatus[k] || 'unpaid';
        if (pendingMonths.includes(k)) continue; // pending counts as handled
        if (s === 'paid' || s === 'exempted') continue;
        if (!selectedMonthKeys.includes(k)) return false;
    }
    return true;
}

function toggleAllMonths() {
    const year = document.getElementById('fiscalYearSelect').value;
    const allStatus = typeof getMonthlyStatus === 'function' ? getMonthlyStatus() : {};
    const customerStatus = (allStatus[selectedCustomer.id] || {})[year] || {};
    
    const pendingMonths = currentPendingMonths;
    const allSelectable = [];
    
    if (window.currentBlockingYear) {
        cwToast(`กรุณาชำระปีงบฯ ${window.currentBlockingYear} ให้ครบก่อน`, 'warning');
        return;
    }
    
    let firstUnpaidIdx = -1;
    for (let i = 0; i < CW_MONTH_KEYS.length; i++) {
        const k = CW_MONTH_KEYS[i];
        const s = customerStatus[k] || 'unpaid';
        const isPending = pendingMonths.includes(k);
        const isExempted = s === 'exempted';
        if (s !== 'paid' && !isPending && !isExempted) {
            if (firstUnpaidIdx === -1) firstUnpaidIdx = i;
        }
    }
    
    if (firstUnpaidIdx !== -1) {
        for (let i = firstUnpaidIdx; i < CW_MONTH_KEYS.length; i++) {
            const k = CW_MONTH_KEYS[i];
            const s = customerStatus[k] || 'unpaid';
            const isPending = pendingMonths.includes(k);
            const isExempted = s === 'exempted';
            if (s !== 'paid' && !isPending && !isExempted) {
                allSelectable.push(k);
            }
        }
    }
    
    if (allSelectable.length === 0) return;
    
    if (selectedMonthKeys.length === allSelectable.length) {
        selectedMonthKeys = [];
    } else {
        selectedMonthKeys = [...allSelectable];
    }
    
    loadMonthlyStatus(true);
}

function toggleMonth(key) {
    const idx = selectedMonthKeys.indexOf(key);
    if (idx === -1) {
        selectedMonthKeys.push(key);
    } else {
        // Deselect this and all months AFTER it to keep sequence valid
        const monthIdx = CW_MONTH_KEYS.indexOf(key);
        selectedMonthKeys = selectedMonthKeys.filter(k => CW_MONTH_KEYS.indexOf(k) < monthIdx);
    }
    selectedMonthKeys.sort((a, b) => CW_MONTH_KEYS.indexOf(a) - CW_MONTH_KEYS.indexOf(b));
    loadMonthlyStatus(true); // re-render without animation
}

// ============================================
// ACTION BUTTON
// ============================================
function updateActionButton() {
    const btn = document.getElementById('btnAction');
    if (!btn) return;

    if (currentStep === 'details') {
        if (selectedMonthKeys.length > 0) {
            btn.disabled = false;
            const year = document.getElementById('fiscalYearSelect').value;
            let total = 0;
            selectedMonthKeys.forEach(k => total += getFeeForMonth(selectedCustomer.id, k, year));
            btn.innerHTML = `ชำระเงิน ฿${cwFmt(total)} (${selectedMonthKeys.length} เดือน) <i class="fa-solid fa-arrow-right ms-1"></i>`;
        } else {
            btn.disabled = true;
            btn.innerHTML = 'กรุณาเลือกเดือนที่ต้องการชำระ';
        }
    } else if (currentStep === 'payment') {
        if (slipBase64) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane me-2"></i>ยืนยันส่งข้อมูลการชำระ';
        } else {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-image me-2"></i>กรุณาแนบหลักฐานการโอนเงิน';
        }
    }
}

function handleAction() {
    if (currentStep === 'details') {
        goToPayment();
    } else if (currentStep === 'payment') {
        submitTransaction();
    }
}

// ============================================
// STEP 3: PAYMENT
// ============================================
function goToPayment() {
    currentStep = 'payment';
    showSection('payment');
    updateStepUI();

    // Render summary
    const year = document.getElementById('fiscalYearSelect').value;
    const itemsDiv = document.getElementById('payItemsList');
    itemsDiv.innerHTML = selectedMonthKeys.map(k => {
        const mFee = getFeeForMonth(selectedCustomer.id, k, year);
        const name = CW_MONTH_NAMES[CW_MONTH_KEYS.indexOf(k)];
        return `<div class="summary-item"><span>${name}</span><span>฿${cwFmt(mFee)}</span></div>`;
    }).join('');

    document.getElementById('payCountBadge').textContent = `${selectedMonthKeys.length} เดือน`;
    let total = 0;
    selectedMonthKeys.forEach(k => total += getFeeForMonth(selectedCustomer.id, k, year));
    document.getElementById('payTotalAmount').textContent = `฿${cwFmt(total)}`;
    const saveQrTotalEl = document.getElementById('saveQrTotal');
    if (saveQrTotalEl) saveQrTotalEl.textContent = `฿${cwFmt(total)}`;

    // Load Settings
    const settings = JSON.parse(localStorage.getItem('waste_settings') || '{}');

    // QR
    const qr = document.getElementById('qrImage');
    if (settings.qr_code_payment) {
        qr.src = settings.qr_code_payment;
    } else {
        qr.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=PromptPay_Amount_${total}`;
    }

    // Bank
    if (settings.bank_name) document.getElementById('bankNameDisplay').textContent = settings.bank_name;
    if (settings.bank_account_name) document.getElementById('bankAccNameDisplay').textContent = settings.bank_account_name;
    if (settings.bank_account) document.getElementById('bankAccNoDisplay').textContent = settings.bank_account;

    slipBase64 = null;
    document.getElementById('slipPreview').style.display = 'none';
    document.getElementById('uploadZone').style.display = '';

    updateActionButton();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function togglePayMethod() {
    const val = document.querySelector('input[name="payMethod"]:checked').value;
    document.getElementById('qrArea').style.display = val === 'QR PromptPay' ? '' : 'none';
    document.getElementById('bankArea').style.display = val === 'Bank Transfer' ? '' : 'none';
}

function copyAccount() {
    const settings = JSON.parse(localStorage.getItem('waste_settings') || '{}');
    const accNo = settings.bank_account_no || '1234567890';
    // Remove dashes for easier copying if preferred, or keep them.
    navigator.clipboard.writeText(accNo).then(() => cwToast('คัดลอกเลขบัญชีแล้ว', 'success'));
}

// ============================================
// SAVE QR CODE IMAGE
// ============================================
function saveQRCodeImage() {
    const container = document.getElementById('qrContainerToSave');
    if (!container) return;
    
    if (typeof html2canvas === 'undefined') {
        cwToast('ระบบกำลังเตรียมความพร้อม กรุณาลองใหม่อีกครั้งในสักครู่', 'warning');
        return;
    }

    cwToast('กำลังสร้างรูปภาพ...', 'info');

    html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
    }).then(async canvas => {
        const dataUrl = canvas.toDataURL('image/png');
        const filename = `QR_Payment_Waste_${new Date().getTime()}.png`;
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isLineApp = /Line/i.test(navigator.userAgent);

        try {
            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], filename, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'QR Code ชำระเงิน'
                });
                return; // Completed share
            }
        } catch (e) {
            console.log('Web Share skipped:', e);
        }

        if (isIOS || isLineApp) {
            // Show image for long-press
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    title: 'บันทึกรูป QR Code',
                    html: `
                        <p class="text-muted small mb-3">ระบบ iOS ไม่รองรับการดาวน์โหลดอัตโนมัติ<br>กรุณา <b>แตะค้างที่รูปภาพด้านล่าง</b><br>แล้วเลือก <b>"บันทึกรูปภาพ"</b> หรือ "Save Image"</p>
                        <img src="${dataUrl}" class="img-fluid rounded shadow-sm border" style="max-height: 55vh; object-fit: contain;">
                    `,
                    confirmButtonText: 'ปิดหน้าต่าง',
                    confirmButtonColor: '#198754'
                });
            }
        } else {
            // PC / Standard Android
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataUrl;
            link.click();
            cwToast('บันทึกรูปลงในเครื่องสำเร็จ!', 'success');
        }
    }).catch(err => {
        console.error('Error saving QR code:', err);
        cwToast('ไม่สามารถสร้างรูปภาพได้', 'danger');
    });
}

// ============================================
// SLIP UPLOAD
// ============================================
function previewSlip(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    // Validate type
    if (!['image/jpeg','image/png'].includes(file.type)) {
        cwToast('รองรับเฉพาะไฟล์ JPG หรือ PNG เท่านั้น', 'danger');
        input.value = '';
        return;
    }
    // Validate size
    if (file.size > 5 * 1024 * 1024) {
        cwToast('ขนาดไฟล์ต้องไม่เกิน 5 MB', 'danger');
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = e => {
        slipBase64 = e.target.result;
        document.getElementById('slipPreview').src = slipBase64;
        document.getElementById('slipPreview').style.display = 'block';
        document.getElementById('uploadZone').style.display = 'none';
        updateActionButton();
        cwToast('อัปโหลดสลิปสำเร็จ', 'success');
    };
    reader.readAsDataURL(file);
}

// ============================================
// SUBMIT
// ============================================
async function submitTransaction() {
    if (!selectedCustomer || selectedMonthKeys.length === 0) {
        cwToast('กรุณาเลือกเดือนที่ต้องการชำระ', 'warning');
        return;
    }
    if (!slipBase64) {
        cwToast('กรุณาแนบหลักฐานการโอนเงิน', 'warning');
        return;
    }

    const btn = document.getElementById('btnAction');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังส่งข้อมูล...';

    const year = document.getElementById('fiscalYearSelect').value;
    const method = document.querySelector('input[name="payMethod"]:checked').value;
    
    let amount = 0;
    selectedMonthKeys.forEach(k => amount += getFeeForMonth(selectedCustomer.id, k, year));

    // --- Upload Slip to Google Drive ---
    let finalSlipImage = slipBase64;
    // TODO: นำ URL ที่ได้จากการ Deploy Google Apps Script มาใส่ในตัวแปรนี้
    // ดูวิธีการในไฟล์ database/upload_waste_slip.js
    const GAS_SLIP_URL = 'https://script.google.com/macros/s/AKfycbx_BewWHVyR4Ambc6BK1FVFsoWe6Vb5h-pOo9Ek6fsSY9ZGNeMdOWofS2CdB-s7zGfqeg/exec'; 

    if (GAS_SLIP_URL && GAS_SLIP_URL !== '') {
        try {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังอัปโหลดสลิป...';
            const response = await fetch(GAS_SLIP_URL, {
                method: 'POST',
                body: JSON.stringify({
                    base64: slipBase64,
                    filename: `slip_${selectedCustomer.id}_${Date.now()}.jpg`
                })
            });
            const result = await response.json();
            if (result.success) {
                finalSlipImage = result.imageUrl;
            } else {
                console.warn('Google Drive Upload Failed:', result.error);
            }
        } catch (e) {
            console.error('Upload Error:', e);
        }
    }

    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังบันทึกข้อมูล...';

    const session = typeof LineAuth !== 'undefined' ? LineAuth.getSession() : null;

    const payload = {
        fiscal_year: year,
        citizen_id: selectedCustomer.id,
        house_no: selectedCustomer.house_no,
        payer_name: selectedCustomer.name,
        paid_months: selectedMonthKeys,
        amount: amount,
        payment_method: method,
        slip_image: finalSlipImage,
        payment_datetime: new Date().toISOString(),
        status: 'pending'
    };

    try {
        let insertedId = 'TX' + Date.now();
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const fullPayload = { ...payload, line_user_id: session ? session.userId : null };
            let { data, error } = await supabaseClient.from('garbage_payment_transactions').insert([fullPayload]).select();
            
            if (error && error.message.includes('line_user_id')) {
                // Fallback: column doesn't exist in Supabase yet, insert without it
                const { data: d2, error: fallbackError } = await supabaseClient.from('garbage_payment_transactions').insert([payload]).select();
                if (fallbackError) throw fallbackError;
                if (d2 && d2.length > 0) insertedId = d2[0].id;
            } else if (error) {
                throw error;
            } else if (data && data.length > 0) {
                insertedId = data[0].id;
            }
        } else {
            const arr = JSON.parse(localStorage.getItem('garbage_payment_transactions') || '[]');
            insertedId = 'TX' + Date.now();
            arr.push({ ...payload, line_user_id: session ? session.userId : null, id: insertedId });
            localStorage.setItem('garbage_payment_transactions', JSON.stringify(arr));
        }

        const myTx = JSON.parse(localStorage.getItem('my_waste_tx_ids') || '[]');
        if (!myTx.includes(insertedId)) {
            myTx.push(insertedId);
            localStorage.setItem('my_waste_tx_ids', JSON.stringify(myTx));
        }

        new bootstrap.Modal(document.getElementById('successModal')).show();
        
        setTimeout(() => {
            window.location.href = 'waste-payment-portal.html';
        }, 3000);

    } catch (err) {
        console.error('Submit failed', err);
        cwToast('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถส่งข้อมูลได้'), 'danger');
        btn.disabled = false;
        updateActionButton();
    }
}

// ============================================
// TOAST
// ============================================
function cwToast(msg, type) {
    type = type || 'info';
    const colors = { success:'#059669', danger:'#dc2626', warning:'#d97706', info:'#0284c7' };
    const icons  = { success:'fa-circle-check', danger:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:1060;
        background:#fff;border-left:4px solid ${colors[type]};border-radius:12px;padding:12px 18px;
        box-shadow:0 6px 24px rgba(0,0,0,.12);display:flex;align-items:center;gap:10px;
        font-size:0.88rem;width:92%;max-width:380px;animation:slideUp 0.3s ease;`;
    el.innerHTML = `<i class="fa-solid ${icons[type]}" style="color:${colors[type]};font-size:1.1rem;flex-shrink:0;"></i><span>${msg}</span>`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.animation = 'slideDown 0.3s ease forwards'; setTimeout(() => el.remove(), 300); }, 3000);
}

// ============================================
// FORMAT HELPER
// ============================================
// ============================================
// FORMAT HELPER
// ============================================
function cwFmt(n) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(n);
}

// ============================================
// CHAT SYSTEM (CITIZEN)
// ============================================
let chatSubscription = null;
let currentChatRoomId = null;

function getCitizenChatRoomId() {
    const session = LineAuth.getSession();
    if (session && session.lineId) {
        return session.lineId; // Use LINE ID if available
    } else if (session && session.houseNo && session.firstName) {
        return `${session.houseNo}_${session.firstName}`; // Fallback to house+name
    }
    return 'anonymous_' + Math.random().toString(36).substring(7);
}

function getCitizenChatName() {
    const session = LineAuth.getSession();
    if (session) {
        return session.firstName ? `${session.firstName} ${session.lastName || ''}` : (session.fullName || session.lineName || 'ประชาชน (ไม่ระบุตัวตน)');
    }
    return 'ประชาชน (ไม่ระบุตัวตน)';
}

function toggleCitizenChat() {
    const chatWindow = document.getElementById('citizenChatWindow');
    if (!chatWindow) return;
    const badge = document.getElementById('chatUnreadBadge');
    
    if (chatWindow.classList.contains('show')) {
        chatWindow.classList.remove('show');
    } else {
        chatWindow.classList.add('show');
        if(badge) {
            badge.style.display = 'none';
            badge.innerText = '0';
        }
        initCitizenChat();
    }
}

async function initCitizenChat() {
    if (!currentChatRoomId) {
        currentChatRoomId = getCitizenChatRoomId();
    }
    
    // Load existing messages
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('waste_chats')
                .select('*')
                .eq('room_id', currentChatRoomId)
                .order('created_at', { ascending: true });
                
            if (!error && data) {
                const chatArea = document.getElementById('chatMessagesArea');
                if(chatArea) {
                    chatArea.innerHTML = '<div class="text-center text-muted text-xs my-2">-- เริ่มการสนทนา --</div>';
                    data.forEach(msg => renderChatMessage(msg));
                    scrollToBottom();
                }
            }
            
            // Subscribe to real-time changes if not already subscribed
            if (!chatSubscription) {
                chatSubscription = supabaseClient
                    .channel(`chat_citizen_${currentChatRoomId}`)
                    .on('postgres_changes', { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'waste_chats',
                        filter: `room_id=eq.${currentChatRoomId}`
                    }, payload => {
                        const newMsg = payload.new;
                        // Avoid duplicating message if we just sent it
                        if (!document.getElementById('msg_' + newMsg.id)) {
                            renderChatMessage(newMsg);
                            scrollToBottom();
                            
                            // If chat is not open and it's from official, show badge
                            const chatWindow = document.getElementById('citizenChatWindow');
                            if (chatWindow && !chatWindow.classList.contains('show') && newMsg.sender_type === 'official') {
                                const badge = document.getElementById('chatUnreadBadge');
                                if(badge) {
                                    badge.style.display = 'block';
                                    badge.innerText = parseInt(badge.innerText || '0') + 1;
                                }
                            }
                        }
                    })
                    .subscribe();
            }
        } catch (err) {
            console.error("Chat init error:", err);
        }
    }
}

function renderChatMessage(msg) {
    const chatArea = document.getElementById('chatMessagesArea');
    if (!chatArea) return;
    const timeStr = new Date(msg.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const isCitizen = msg.sender_type === 'citizen';
    
    const html = `
        <div class="chat-msg ${isCitizen ? 'citizen' : 'official'}" id="msg_${msg.id}">
            <div>${msg.message}</div>
            <span class="time">${timeStr}</span>
        </div>
    `;
    chatArea.insertAdjacentHTML('beforeend', html);
}

function scrollToBottom() {
    const chatArea = document.getElementById('chatMessagesArea');
    if (chatArea) {
        chatArea.scrollTop = chatArea.scrollHeight;
    }
}

function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendCitizenMessage();
    }
}

async function sendCitizenMessage() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const msgText = input.value.trim();
    
    if (!msgText) return;
    
    if (!currentChatRoomId) currentChatRoomId = getCitizenChatRoomId();
    
    input.value = '';
    
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        try {
            const { data, error } = await supabaseClient
                .from('waste_chats')
                .insert([{
                    room_id: currentChatRoomId,
                    sender_type: 'citizen',
                    sender_name: getCitizenChatName(),
                    message: msgText
                }])
                .select();
                
            if (!error && data && data.length > 0) {
                // message will be rendered via realtime subscription, 
                // but we can optimistic render it here to feel faster
                if (!document.getElementById('msg_' + data[0].id)) {
                    renderChatMessage(data[0]);
                    scrollToBottom();
                }
            }
        } catch(err) {
            console.error("Send message error:", err);
            cwToast('ไม่สามารถส่งข้อความได้', 'danger');
        }
    } else {
        cwToast('ระบบแชทไม่พร้อมใช้งานขณะนี้', 'warning');
    }
}
