/**
 * waste-excel-engine.js — AI Excel Import & Smart Payment Mapping Engine
 * GOOD GOV Municipality Platform
 */

// ============================================
// THAI MONTH MAPPER
// ============================================
const THAI_MONTH_MAP = {
    'ต.ค.':'oct','ตค':'oct','ตุลาคม':'oct','ตุลา':'oct','oct':'oct','october':'oct','10':'oct',
    'พ.ย.':'nov','พย':'nov','พฤศจิกายน':'nov','พฤศจิกา':'nov','nov':'nov','november':'nov','11':'nov',
    'ธ.ค.':'dec','ธค':'dec','ธันวาคม':'dec','ธันวา':'dec','dec':'dec','december':'dec','12':'dec',
    'ม.ค.':'jan','มค':'jan','มกราคม':'jan','มกรา':'jan','jan':'jan','january':'jan','1':'jan','01':'jan',
    'ก.พ.':'feb','กพ':'feb','กุมภาพันธ์':'feb','กุมภา':'feb','feb':'feb','february':'feb','2':'feb','02':'feb',
    'มี.ค.':'mar','มีค':'mar','มีนาคม':'mar','มีนา':'mar','mar':'mar','march':'mar','3':'mar','03':'mar',
    'เม.ย.':'apr','เมย':'apr','เมษายน':'apr','เมษา':'apr','apr':'apr','april':'apr','4':'apr','04':'apr',
    'พ.ค.':'may','พค':'may','พฤษภาคม':'may','พฤษภา':'may','may':'may','5':'may','05':'may',
    'มิ.ย.':'jun','มิย':'jun','มิถุนายน':'jun','มิถุนา':'jun','jun':'jun','june':'jun','6':'jun','06':'jun',
    'ก.ค.':'jul','กค':'jul','กรกฎาคม':'jul','กรกฎา':'jul','jul':'jul','july':'jul','7':'jul','07':'jul',
    'ส.ค.':'aug','สค':'aug','สิงหาคม':'aug','สิงหา':'aug','aug':'aug','august':'aug','8':'aug','08':'aug',
    'ก.ย.':'sep','กย':'sep','กันยายน':'sep','กันยา':'sep','sep':'sep','september':'sep','9':'sep','09':'sep'
};

const FISCAL_MONTH_ORDER = ['oct','nov','dec','jan','feb','mar','apr','may','jun','jul','aug','sep'];
const FISCAL_MONTH_LABELS = ['ต.ค.','พ.ย.','ธ.ค.','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.'];

function resolveMonthKey(text) {
    if (!text) return null;
    const clean = String(text).trim().toLowerCase().replace(/\s+/g,'').replace(/\./g,'.');
    
    // Prevent common false positives like "รหัสลูกค้า", "ชื่อลูกค้า"
    if (clean.includes('ลูกค้า') || clean.includes('customer')) return null;

    // Try direct match
    if (THAI_MONTH_MAP[clean]) return THAI_MONTH_MAP[clean];
    
    // Try removing year suffix like "ต.ค.68" or "ต.ค.2568"
    const noYear = clean.replace(/\d{2,4}$/,'').trim();
    if (THAI_MONTH_MAP[noYear]) return THAI_MONTH_MAP[noYear];
    
    // Try removing prefix like "เดือน" or "ประจำเดือน"
    const noPrefix = clean.replace(/^(ประจำเดือน|เดือน)/, '');
    if (THAI_MONTH_MAP[noPrefix]) return THAI_MONTH_MAP[noPrefix];
    
    const noPrefixNoYear = noPrefix.replace(/\d{2,4}$/,'').trim();
    if (THAI_MONTH_MAP[noPrefixNoYear]) return THAI_MONTH_MAP[noPrefixNoYear];

    // Try partial match cautiously
    for (const [k,v] of Object.entries(THAI_MONTH_MAP)) {
        // Skip dangerous short keys for partial matching to prevent collisions
        if (k.length <= 2 && !k.includes('.')) continue; 
        if (k.match(/^\d+$/)) continue; // skip numeric keys like "1", "10"
        if (clean.includes(k)) return v;
    }
    return null;
}

function extractYearFromHeader(text) {
    if (!text) return null;
    const s = String(text).trim();
    const m4 = s.match(/(\d{4})/);
    if (m4) { const y = parseInt(m4[1]); return y > 2500 ? String(y) : String(y + 543); }
    const m2 = s.match(/(\d{2})$/);
    if (m2) { const y = parseInt(m2[1]); return String(y + 2500); }
    return null;
}

function toFiscalYear(monthKey, calendarYear) {
    if (!calendarYear) return calendarYear;
    const yr = parseInt(calendarYear);
    if (isNaN(yr)) return calendarYear;
    // Oct, Nov, Dec belong to the NEXT fiscal year
    if (monthKey === 'oct' || monthKey === 'nov' || monthKey === 'dec') {
        return String(yr + 1);
    }
    return String(yr);
}

// ============================================
// MERGED CELL DETECTION & PARSING
// ============================================
function extractMergeMap(worksheet) {
    const merges = worksheet['!merges'] || [];
    const mergeMap = {};
    const mergeRanges = [];
    for (const m of merges) {
        const startAddr = XLSX.utils.encode_cell({r: m.s.r, c: m.s.c});
        const cell = worksheet[startAddr];
        const val = cell ? (cell.v !== undefined ? cell.v : '') : '';
        const range = {sr: m.s.r, sc: m.s.c, er: m.e.r, ec: m.e.c, value: val, addr: startAddr};
        mergeRanges.push(range);
        for (let r = m.s.r; r <= m.e.r; r++) {
            for (let c = m.s.c; c <= m.e.c; c++) {
                const key = r + ',' + c;
                mergeMap[key] = {value: val, isStart: (r === m.s.r && c === m.s.c), range: range,
                    rowspan: m.e.r - m.s.r + 1, colspan: m.e.c - m.s.c + 1};
            }
        }
    }
    return {mergeMap, mergeRanges};
}

function getMergedValue(mergeMap, r, c) {
    const info = mergeMap[r + ',' + c];
    if (!info) return null;
    return info;
}

// ============================================
// MONTH RANGE DETECTION
// ============================================
const THAI_MONTH_NAMES_FULL = [
    {name:'ตุลาคม',key:'oct'},{name:'พฤศจิกายน',key:'nov'},{name:'ธันวาคม',key:'dec'},
    {name:'มกราคม',key:'jan'},{name:'กุมภาพันธ์',key:'feb'},{name:'มีนาคม',key:'mar'},
    {name:'เมษายน',key:'apr'},{name:'พฤษภาคม',key:'may'},{name:'มิถุนายน',key:'jun'},
    {name:'กรกฎาคม',key:'jul'},{name:'สิงหาคม',key:'aug'},{name:'กันยายน',key:'sep'}
];

function parseMonthRange(text) {
    if (!text) return null;
    const s = String(text);
    // Pattern: (เดือนYY-เดือนYY) or เดือนYY-เดือนYY
    const rangeMatch = s.match(/([ก-๙]+)(\d{2,4})?\s*[-–—]\s*([ก-๙]+)(\d{2,4})?/);
    if (!rangeMatch) return null;
    const startMonth = resolveMonthKey(rangeMatch[1]);
    const endMonth = resolveMonthKey(rangeMatch[3]);
    if (!startMonth || !endMonth) return null;
    const startYr = rangeMatch[2] || null;
    const endYr = rangeMatch[4] || startYr;
    const si = FISCAL_MONTH_ORDER.indexOf(startMonth);
    const ei = FISCAL_MONTH_ORDER.indexOf(endMonth);
    if (si < 0 || ei < 0) return null;
    const months = [];
    if (ei >= si) {
        for (let i = si; i <= ei; i++) months.push({key: FISCAL_MONTH_ORDER[i], year: i < 3 ? startYr : endYr});
    } else {
        for (let i = si; i < 12; i++) months.push({key: FISCAL_MONTH_ORDER[i], year: startYr});
        for (let i = 0; i <= ei; i++) months.push({key: FISCAL_MONTH_ORDER[i], year: endYr});
    }
    return months;
}

// ============================================
// MERGED CELL METADATA EXTRACTION
// ============================================
function parseMergedPaymentText(text) {
    const result = {receipt: null, monthRange: null, date: null, time: null, amount: null, remark: '', rawText: String(text), isSharedPayment: false, referenceHouse: null};
    if (!text) return result;
    const s = String(text).trim();
    // Shared payment detection
    const sharedMatch = s.match(/ชำระร่วม(?:กับ)?(?:บ้าน(?:เลขที่)?)?\s*(\d+[/\-]?\d*)/);
    if (sharedMatch) {result.isSharedPayment = true; result.referenceHouse = sharedMatch[1]; return result;}
    const sharedMatch2 = s.match(/จ่ายร่วม|รวมกับบ้าน\s*(\d+)/);
    if (sharedMatch2) {result.isSharedPayment = true; result.referenceHouse = sharedMatch2[1] || ''; return result;}
    if (/ชำระร่วม|จ่ายร่วม|รวมกับบ้าน/.test(s)) {result.isSharedPayment = true; const hm = s.match(/(\d+[/\-]?\d*)/); if(hm) result.referenceHouse = hm[1]; return result;}
    // Receipt
    const rcpt = s.match(/(\d{2,5})[/\\](\d{1,2})/);
    if (rcpt) result.receipt = rcpt[0];
    // Month range
    result.monthRange = parseMonthRange(s);
    // Date: d/m/yy or d/m/yyyy
    const dm = s.match(/(\d{1,2})[/](\d{1,2})[/](\d{2,4})/);
    if (dm) result.date = dm[0];
    // Time: HH:MM
    const tm = s.match(/(\d{1,2}):(\d{2})/);
    if (tm) result.time = tm[0];
    // Amount: (100.-) or (100)
    const am = s.match(/\((\d+(?:\.\d+)?)\.?-?\)/);
    if (am) result.amount = parseFloat(am[1]);
    else { const am2 = s.match(/(\d+(?:\.\d+)?)\s*บาท/); if(am2) result.amount = parseFloat(am2[1]); }
    result.remark = s;
    return result;
}

// ============================================
// PAYMENT CELL INTERPRETER
// ============================================
function interpretPaymentCell(rawValue) {
    const result = { status: 'unpaid', receipt: null, amount: null, remark: '', rawValue: rawValue };
    if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '') {
        return result;
    }
    const val = String(rawValue).trim();
    // Check marks
    if (/^[✓✔√\/]$/.test(val)) { result.status = 'paid'; return result; }
    // Unpaid marks
    if (/^[xX×✗✘\-]$/.test(val)) { result.status = 'unpaid'; return result; }
    // Pending marks
    if (/^[wWรอ]$/.test(val)) { result.status = 'pending'; result.remark = val; return result; }
    // Receipt pattern: ###/## or ####/##
    const receiptMatch = val.match(/^(\d{2,5})[\/\\](\d{1,2})/);
    if (receiptMatch) {
        result.status = 'paid';
        result.receipt = receiptMatch[0];
        // Check for additional info after receipt
        const rest = val.substring(receiptMatch[0].length).trim();
        if (rest) result.remark = rest;
        return result;
    }
    // Pure number = amount paid
    const num = parseFloat(val.replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
        result.status = 'paid';
        result.amount = num;
        return result;
    }
    // Contains receipt pattern within mixed text
    const embeddedReceipt = val.match(/(\d{2,5})[\/\\](\d{1,2})/);
    if (embeddedReceipt) {
        result.status = 'paid';
        result.receipt = embeddedReceipt[0];
        result.remark = val.replace(embeddedReceipt[0], '').trim();
        return result;
    }
    // Any other text = remark, status unknown but likely has info
    if (val.length > 0) {
        result.remark = val;
        // If text contains paid-like keywords
        if (/ชำระ|จ่าย|paid|โอน/.test(val)) result.status = 'paid';
        else if (/ค้าง|ไม่|unpaid/.test(val)) result.status = 'unpaid';
        else result.status = 'pending';
    }
    return result;
}

// ============================================
// CUSTOMER MATCHING ENGINE
// ============================================
function normalizeHouseNo(h) {
    if (!h) return '';
    return String(h).trim().replace(/บ้านเลขที่/g,'').replace(/เลขที่/g,'').replace(/\s+/g,'').trim();
}

function normalizeName(n) {
    if (!n) return '';
    return String(n).trim()
        .replace(/^(นาย|นาง|น\.ส\.|นางสาว|mr\.?|mrs\.?|ms\.?|ด\.ช\.|ด\.ญ\.)\s*/gi, '')
        .replace(/\s+/g, ' ').trim();
}

function extractMooFromText(text) {
    if (!text) return null;
    const s = String(text);
    const m = s.match(/(?:ม\.|หมู่|moo|ม)\s*(\d{1,2})/i);
    return m ? m[1] : null;
}

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m+1}, () => Array(n+1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[m][n];
}

function matchCustomer(importedRow, customers) {
    const hno = normalizeHouseNo(importedRow.house_no);
    const moo = importedRow.moo ? String(importedRow.moo).trim() : null;
    const name = normalizeName(importedRow.name);
    let best = { customer: null, confidence: 0, level: 0, status: 'NOT_FOUND' };

    for (const c of customers) {
        const cHno = normalizeHouseNo(c.house_no);
        const cMoo = String(c.moo).trim();
        const cName = normalizeName(c.name);

        // Level 1: house_no + moo exact
        if (hno && moo && cHno === hno && cMoo === moo) {
            return { customer: c, confidence: 99, level: 1, status: 'MATCHED' };
        }
        // Level 2: house_no + name
        if (hno && cHno === hno && name && cName.includes(name.split(' ')[0])) {
            if (best.confidence < 90) best = { customer: c, confidence: 90, level: 2, status: 'MATCHED' };
        }
        // Level 3: normalized name exact
        if (name && cName === name) {
            if (best.confidence < 75) best = { customer: c, confidence: 75, level: 3, status: 'LOW_CONFIDENCE' };
        }
        // Level 4: fuzzy
        if (name && cName) {
            const dist = levenshtein(name, cName);
            const maxLen = Math.max(name.length, cName.length);
            const similarity = maxLen > 0 ? ((maxLen - dist) / maxLen) * 100 : 0;
            if (similarity > 70 && similarity > best.confidence) {
                best = { customer: c, confidence: Math.round(similarity), level: 4, status: similarity > 80 ? 'LOW_CONFIDENCE' : 'AMBIGUOUS' };
            }
        }
    }
    return best;
}

// ============================================
// EXCEL STRUCTURE DETECTOR
// ============================================
function detectSheetStructure(worksheet) {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const {mergeMap, mergeRanges} = extractMergeMap(worksheet);
    const rows = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
        const row = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({r, c});
            const cell = worksheet[addr];
            let val = cell ? (cell.v !== undefined ? cell.v : '') : '';
            // Inherit merged cell value
            if (val === '' || val === undefined || val === null) {
                const mi = getMergedValue(mergeMap, r, c);
                if (mi && !mi.isStart) val = mi.value;
            }
            row.push(val);
        }
        rows.push(row);
    }

    // Find header row using scoring
    let headerIdx = -1, headerScore = -1;
    const monthKeywords = Object.keys(THAI_MONTH_MAP);
    const structKeywords = ['ชื่อ','สกุล','บ้านเลขที่','ค่า','ธรรมเนียม','ลำดับ','เลขที่','ค่าขยะ','name','house'];

    for (let r = 0; r < Math.min(rows.length, 15); r++) {
        let score = 0;
        const rowText = rows[r].map(c => String(c).toLowerCase().trim()).join(' ');
        // Month keywords
        let monthHits = 0;
        for (const kw of monthKeywords) {
            if (rowText.includes(kw)) monthHits++;
        }
        if (monthHits >= 3) score += 20;
        else if (monthHits >= 1) score += 5;
        // Structure keywords
        for (const kw of structKeywords) {
            if (rowText.includes(kw)) score += 8;
        }
        // Mostly text cells (not empty)
        const nonEmpty = rows[r].filter(c => String(c).trim() !== '').length;
        if (nonEmpty >= 5) score += 3;
        if (score > headerScore) { headerScore = score; headerIdx = r; }
    }
    if (headerIdx < 0) headerIdx = 0;

    // Map columns
    const header = rows[headerIdx];
    const colMap = { seq: -1, name: -1, house_no: -1, moo: -1, fee: -1, months: {} };

    for (let c = 0; c < header.length; c++) {
        const h = String(header[c]).trim().toLowerCase();
        if (!h) continue;
        // Sequence
        if (/ลำดับ|ที่|no|#|seq/.test(h) && colMap.seq < 0) { colMap.seq = c; continue; }
        // Name
        if (/ชื่อ|สกุล|name/.test(h) && colMap.name < 0) { colMap.name = c; continue; }
        // House number
        if (/บ้าน|เลขที่|house|address/.test(h) && colMap.house_no < 0) { colMap.house_no = c; continue; }
        // Moo
        if (/หมู่|moo/.test(h) && colMap.moo < 0) { colMap.moo = c; continue; }
        // Fee
        if (/ค่า|ธรรมเนียม|ขยะ|fee|amount|ราคา/.test(h) && colMap.fee < 0) { colMap.fee = c; continue; }
        // Month columns
        const mk = resolveMonthKey(h);
        if (mk && !colMap.months[mk]) {
            const rawYr = extractYearFromHeader(header[c]);
            const fiscalYr = toFiscalYear(mk, rawYr);
            colMap.months[mk] = { col: c, year: fiscalYr, rawYear: rawYr };
        }
    }

    // Auto-detect if name/house columns not found by keyword - use heuristic on first data row
    if (colMap.name < 0 || colMap.house_no < 0) {
        const firstData = rows[headerIdx + 1];
        if (firstData) {
            for (let c = 0; c < firstData.length; c++) {
                const v = String(firstData[c]).trim();
                if (!v) continue;
                if (colMap.house_no < 0 && /^\d{1,4}(\/\d{1,3})?$/.test(v)) { colMap.house_no = c; continue; }
                if (colMap.name < 0 && /[ก-๙]{2,}/.test(v) && v.length > 4) { colMap.name = c; continue; }
            }
        }
    }

    // Detect data region
    let dataStart = headerIdx + 1;
    let dataEnd = rows.length - 1;
    // Trim footer/summary rows
    for (let r = rows.length - 1; r > dataStart; r--) {
        const rowText = rows[r].join(' ').toLowerCase();
        if (/รวม|total|summary|สรุป|ทั้งหมด/.test(rowText)) { dataEnd = r - 1; continue; }
        const nonEmpty = rows[r].filter(c => String(c).trim() !== '').length;
        if (nonEmpty < 2) { dataEnd = r - 1; continue; }
        break;
    }

    // Detect moo from sheet title or header rows
    let detectedMoo = null;
    for (let r = 0; r < headerIdx; r++) {
        const rowText = rows[r].join(' ');
        const mooMatch = extractMooFromText(rowText);
        if (mooMatch) { detectedMoo = mooMatch; break; }
    }

    // Detect fiscal year from title rows
    let detectedYear = null;
    for (let r = 0; r < headerIdx; r++) {
        const rowText = rows[r].join(' ');
        const yrMatch = rowText.match(/ประจำปี\s*(?:งบประมาณ)?\s*(\d{4})/);
        if (yrMatch) { detectedYear = String(parseInt(yrMatch[1])); break; }
        const yrMatch2 = rowText.match(/(\d{4})/);
        if (yrMatch2 && parseInt(yrMatch2[1]) > 2500) { detectedYear = yrMatch2[1]; break; }
    }

    // Fill month years from detected year if missing
    if (detectedYear) {
        for (const mk of Object.keys(colMap.months)) {
            if (!colMap.months[mk].year) colMap.months[mk].year = detectedYear;
        }
    }

    return { rows, headerIdx, colMap, dataStart, dataEnd, detectedMoo, detectedYear, totalCols: header.length, mergeMap, mergeRanges };
}

// ============================================
// MAIN PARSE FUNCTION
// ============================================
function parseExcelSheet(worksheet, sheetName, customers, overrideMoo, overrideYear) {
    const structure = detectSheetStructure(worksheet);
    const { rows, colMap, dataStart, dataEnd, detectedMoo, detectedYear, mergeMap, mergeRanges } = structure;
    const moo = overrideMoo || detectedMoo;
    const fiscalYear = overrideYear || detectedYear || getCurrentFiscalYear();
    const results = [];
    const rangeOffset = rows.length > 0 ? 0 : 0; // base row offset

    for (let r = dataStart; r <= dataEnd; r++) {
        const row = rows[r];
        if (!row) continue;
        const nonEmpty = row.filter(c => String(c).trim() !== '').length;
        if (nonEmpty < 2) continue;

        const rawName = colMap.name >= 0 ? String(row[colMap.name] || '').trim() : '';
        const rawHouse = colMap.house_no >= 0 ? String(row[colMap.house_no] || '').trim() : '';
        if (!rawName && !rawHouse) continue;

        const rawMoo = colMap.moo >= 0 ? String(row[colMap.moo] || '').trim() : moo;
        const rawFee = colMap.fee >= 0 ? parseFloat(String(row[colMap.fee] || '0').replace(/,/g,'')) : null;

        // Parse month cells with merge awareness
        const monthData = {};
        let mergeInfo = [];
        let hasSharedPayment = false;
        let sharedRef = null;

        for (const [mk, info] of Object.entries(colMap.months)) {
            const cellVal = row[info.col];
            const mi = getMergedValue(mergeMap, r, info.col);

            // Check if this cell is part of a horizontal merge spanning multiple month columns
            if (mi && mi.range.colspan > 1 && mi.range.sr === r) {
                const mergedText = String(mi.value).trim();
                const parsed = parseMergedPaymentText(mergedText);

                // Shared payment
                if (parsed.isSharedPayment) {
                    hasSharedPayment = true;
                    sharedRef = parsed.referenceHouse;
                    // Mark all months in merge range
                    for (const [mk2, info2] of Object.entries(colMap.months)) {
                        if (info2.col >= mi.range.sc && info2.col <= mi.range.ec) {
                            monthData[mk2] = {status:'linked_payment', receipt:null, amount:null, remark:'ชำระร่วม บ้าน '+parsed.referenceHouse, rawValue:mergedText, year:info2.year||fiscalYear, mergeSource:mergedText, mergeType:'SHARED_PAYMENT'};
                        }
                    }
                    mergeInfo.push({type:'SHARED_PAYMENT', text:mergedText, ref:parsed.referenceHouse, cols:mi.range.sc+'-'+mi.range.ec});
                    break; // Don't process individual months
                }

                // Month range in merged cell
                if (parsed.monthRange && parsed.monthRange.length > 0) {
                    for (const pm of parsed.monthRange) {
                        let calYr = pm.year ? (pm.year.length===2 ? String(parseInt(pm.year)+2500) : pm.year) : (info.rawYear);
                        // If info.rawYear is missing, we use fiscalYear but must subtract 1 for oct/nov/dec to get their calendar year back
                        if (!calYr) {
                            if (pm.key === 'oct' || pm.key === 'nov' || pm.key === 'dec') calYr = String(parseInt(fiscalYear) - 1);
                            else calYr = String(fiscalYear);
                        }
                        const fy = toFiscalYear(pm.key, calYr);
                        monthData[pm.key] = {status:'paid', receipt:parsed.receipt, amount:parsed.amount, remark:parsed.date||'', rawValue:mergedText, year:fy, mergeSource:mergedText, mergeType:'MERGE_EXPANDED'};
                    }
                    mergeInfo.push({type:'MERGE_EXPANDED', text:mergedText, months:parsed.monthRange.map(m=>m.key), receipt:parsed.receipt});
                    continue; // Skip normal processing for this cell
                }

                // Generic horizontal merge: apply same value to all months in range
                if (mergedText) {
                    const interp = interpretPaymentCell(mergedText);
                    for (const [mk2, info2] of Object.entries(colMap.months)) {
                        if (info2.col >= mi.range.sc && info2.col <= mi.range.ec) {
                            monthData[mk2] = {...interp, year:info2.year||fiscalYear, mergeSource:mergedText, mergeType:'MERGE_DETECTED'};
                        }
                    }
                    mergeInfo.push({type:'MERGE_DETECTED', text:mergedText, cols:mi.range.sc+'-'+mi.range.ec});
                    continue;
                }
            }

            // Normal cell (not part of merge or already processed)
            if (!monthData[mk]) {
                monthData[mk] = interpretPaymentCell(cellVal);
                monthData[mk].year = info.year || fiscalYear;
                if (mi) { monthData[mk].mergeSource = String(mi.value); monthData[mk].mergeType = mi.isStart ? 'MERGE_START' : 'MERGE_CHILD'; }
            }
        }

        // Match customer
        const importedRow = { house_no: rawHouse, moo: rawMoo, name: rawName };
        const match = matchCustomer(importedRow, customers);

        // Validate
        const issues = [];
        let rowStatus = 'SUCCESS';
        if (match.status === 'NOT_FOUND') { issues.push('ไม่พบลูกค้าในระบบ'); rowStatus = 'ERROR'; }
        else if (match.status === 'AMBIGUOUS') { issues.push('พบลูกค้าที่คล้ายกัน (ไม่แน่ใจ)'); rowStatus = 'WARNING'; }
        else if (match.status === 'LOW_CONFIDENCE') { issues.push('ความมั่นใจต่ำ'); rowStatus = 'WARNING'; }

        if (rawFee && match.customer && Math.abs(rawFee - match.customer.fee) > 1) {
            issues.push(`ค่าธรรมเนียมไม่ตรง (Excel: ${rawFee}, ระบบ: ${match.customer.fee})`);
            if (rowStatus === 'SUCCESS') rowStatus = 'WARNING';
        }

        // Merge-specific validation
        if (mergeInfo.length > 0) {
            for (const mi of mergeInfo) {
                if (mi.type === 'MERGE_EXPANDED') issues.push('MERGE_EXPANDED: ขยายจากเซลล์รวม → ' + (mi.months||[]).join(','));
                else if (mi.type === 'SHARED_PAYMENT') { issues.push('SHARED_PAYMENT: ชำระร่วมกับบ้าน ' + (mi.ref||'')); if (rowStatus === 'SUCCESS') rowStatus = 'WARNING'; }
                else if (mi.type === 'MERGE_DETECTED') issues.push('MERGE_DETECTED: เซลล์รวม "' + mi.text + '"');
            }
        }
        if (hasSharedPayment && rowStatus === 'SUCCESS') rowStatus = 'WARNING';

        results.push({
            rowIndex: r,
            rawName, rawHouse, rawMoo, rawFee,
            matchedCustomer: match.customer,
            matchConfidence: match.confidence,
            matchLevel: match.level,
            matchStatus: match.status,
            monthData,
            fiscalYear,
            issues,
            rowStatus,
            action: hasSharedPayment ? 'SKIP' : (rowStatus === 'ERROR' ? 'SKIP' : 'IMPORT'),
            sheetName,
            mergeInfo: mergeInfo.length > 0 ? mergeInfo : null,
            isSharedPayment: hasSharedPayment,
            sharedPaymentRef: sharedRef
        });
    }

    return { results, structure };
}

// ============================================
// VALIDATION ENGINE
// ============================================
function validateImportBatch(results, existingMonthlyStatus) {
    let successCount = 0, warningCount = 0, errorCount = 0;
    const receiptSet = new Set();

    for (const row of results) {
        // Check duplicate receipts within batch
        for (const [mk, md] of Object.entries(row.monthData)) {
            if (md.receipt) {
                if (receiptSet.has(md.receipt)) {
                    row.issues.push(`ใบเสร็จซ้ำในไฟล์: ${md.receipt}`);
                    if (row.rowStatus === 'SUCCESS') row.rowStatus = 'WARNING';
                } else {
                    receiptSet.add(md.receipt);
                }
            }
            // Check vs existing database
            if (row.matchedCustomer && existingMonthlyStatus) {
                const cid = row.matchedCustomer.id;
                const yr = md.year || row.fiscalYear;
                const existing = (existingMonthlyStatus[cid] || {})[yr] || {};
                if (existing[mk] === 'paid' && md.status === 'paid') {
                    row.issues.push(`${FISCAL_MONTH_LABELS[FISCAL_MONTH_ORDER.indexOf(mk)]} ปี ${yr} ชำระแล้วในระบบ`);
                    if (row.rowStatus === 'SUCCESS') row.rowStatus = 'WARNING';
                }
            }
        }

        if (row.rowStatus === 'ERROR') errorCount++;
        else if (row.rowStatus === 'WARNING') warningCount++;
        else successCount++;
    }

    return { successCount, warningCount, errorCount, total: results.length };
}

// ============================================
// IMPORT EXECUTOR (Safe DB Write)
// ============================================
async function executeImport(results, batchId, fileName, userName) {
    const importLog = [];
    let successCount = 0, errorCount = 0;
    const chunkSize = 50;

    for (let i = 0; i < results.length; i += chunkSize) {
        const chunk = results.slice(i, i + chunkSize);
        for (const row of chunk) {
            if (row.action === 'SKIP' || !row.matchedCustomer) {
                importLog.push({ row: row.rowIndex, status: 'skipped', reason: row.issues.join('; ') });
                continue;
            }

            try {
                const cid = row.matchedCustomer.id;
                for (const [mk, md] of Object.entries(row.monthData)) {
                    if (md.status === 'unpaid') continue; // Don't overwrite with unpaid
                    const yr = md.year || row.fiscalYear;
                    // Get old value for rollback
                    const ms = getMonthlyStatus();
                    const oldVal = ((ms[cid] || {})[yr] || {})[mk] || 'unpaid';
                    // Save to DB
                    await saveMonthlyStatusDB(cid, yr, mk, md.status, null);
                    // If has receipt, create payment record
                    if (md.receipt && md.status === 'paid') {
                        const payment = {
                            id: 'IMP' + Date.now().toString().slice(-6) + Math.random().toString(36).slice(-3),
                            receipt_no: md.receipt,
                            customer_id: cid,
                            customer_name: row.matchedCustomer.name,
                            house_no: row.matchedCustomer.house_no + ' ม.' + row.matchedCustomer.moo,
                            amount: md.amount || row.matchedCustomer.fee,
                            months_paid: [FISCAL_MONTH_LABELS[FISCAL_MONTH_ORDER.indexOf(mk)]],
                            fiscal_year: yr,
                            method: 'นำเข้าจาก Excel',
                            date: new Date().toISOString().split('T')[0],
                            time: new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}),
                            status: 'completed',
                            staff: userName || 'Excel Import',
                            source: 'excel-import'
                        };
                        await saveWastePaymentDB(payment);
                    }
                    importLog.push({ row: row.rowIndex, customer: cid, month: mk, year: yr, oldVal, newVal: md.status, receipt: md.receipt, status: 'success' });
                }
                successCount++;
            } catch (err) {
                errorCount++;
                importLog.push({ row: row.rowIndex, status: 'error', reason: err.message });
            }
        }
        // Report progress
        if (typeof updateImportProgress === 'function') {
            updateImportProgress(Math.min(i + chunkSize, results.length), results.length);
        }
    }

    // Save import history
    const history = {
        id: batchId,
        batch_id: batchId,
        filename: fileName,
        import_date: new Date().toISOString(),
        user_name: userName,
        total_rows: results.length,
        success_count: successCount,
        error_count: errorCount,
        warning_count: results.filter(r => r.rowStatus === 'WARNING').length,
        status: errorCount === 0 ? 'completed' : 'partial',
        rollback_status: 'none',
        import_data: JSON.stringify(importLog)
    };

    // Save to Supabase if available
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        await supabaseClient.from('waste_import_history').upsert(history);
    }
    // Save locally
    const histories = JSON.parse(localStorage.getItem('waste_import_history') || '[]');
    histories.unshift(history);
    localStorage.setItem('waste_import_history', JSON.stringify(histories));

    return { successCount, errorCount, importLog, batchId };
}

// ============================================
// UNDO IMPORT
// ============================================
async function undoImport(batchId) {
    const histories = JSON.parse(localStorage.getItem('waste_import_history') || '[]');
    const hist = histories.find(h => h.batch_id === batchId);
    if (!hist) return false;

    const log = JSON.parse(hist.import_data || '[]');
    for (const entry of log) {
        if (entry.status === 'success' && entry.oldVal) {
            await saveMonthlyStatusDB(entry.customer, entry.year, entry.month, entry.oldVal, null);
        }
    }

    hist.rollback_status = 'rolled_back';
    hist.status = 'rolled_back';
    localStorage.setItem('waste_import_history', JSON.stringify(histories));

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        await supabaseClient.from('waste_import_history').update({ rollback_status: 'rolled_back', status: 'rolled_back' }).eq('batch_id', batchId);
    }
    return true;
}

function getImportHistory() {
    return JSON.parse(localStorage.getItem('waste_import_history') || '[]');
}
