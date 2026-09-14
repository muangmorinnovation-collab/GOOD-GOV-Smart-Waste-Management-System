/**
 * waste-settings.js — Logic for Waste System Settings
 */

let orgLogoBase64 = null;
let mayorSignatureBase64 = null;
let qrCodePromptPayBase64 = null;
let qrCodeBase64 = null;
let currentSettingsId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Show loading
    Swal.fire({ title: 'กำลังโหลดข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        await loadSettings();
        Swal.close();
    } catch (err) {
        console.error(err);
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลการตั้งค่าได้', 'error');
    }
});

async function loadSettings() {
    let settings = null;

    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        const { data, error } = await supabaseClient
            .from('waste_settings')
            .select('*')
            .limit(1)
            .single();
        
        if (data) {
            settings = data;
        } else if (error && error.code !== 'PGRST116') {
            // Ignore "Row not found" error
            console.warn('Supabase fetch error:', error);
        }
    }

    if (!settings) {
        const local = localStorage.getItem('waste_settings');
        if (local) settings = JSON.parse(local);
    }

    if (settings) {
        currentSettingsId = settings.id;
        document.getElementById('orgName').value = settings.org_name || '';
        document.getElementById('orgAddress').value = settings.org_address || '';
        document.getElementById('orgPhone').value = settings.org_phone || '';
        document.getElementById('docInvoiceNo').value = settings.doc_invoice_no || '';
        document.getElementById('mayorName').value = settings.mayor_name || '';
        document.getElementById('mayorTitle').value = settings.mayor_title || '';
        document.getElementById('envLicenseNo').value = settings.env_license_no || '';
        document.getElementById('envPostOffice').value = settings.env_post_office || '';
        document.getElementById('gasUrl').value = settings.gas_url || '';
        
        if (settings.bank_account) document.getElementById('bankAccount').value = settings.bank_account;
        if (settings.bank_account_name) document.getElementById('bankAccountName').value = settings.bank_account_name;
        if (settings.bank_name) document.getElementById('bankName').value = settings.bank_name;
        if (settings.bank_branch) document.getElementById('bankBranch').value = settings.bank_branch;

        if (settings.org_logo) {
            const preview = document.getElementById('orgLogoPreview');
            preview.src = settings.org_logo;
            preview.style.display = 'block';
            
            const headerLogo = document.getElementById('page-header-logo');
            const headerIcon = document.getElementById('page-header-icon');
            if (headerLogo && headerIcon) {
                headerLogo.src = settings.org_logo;
                headerLogo.style.display = 'block';
                headerIcon.style.display = 'none';
            }

            const cardLogo = document.getElementById('card-header-logo');
            const cardIcon = document.getElementById('card-header-icon');
            if (cardLogo && cardIcon) {
                cardLogo.src = settings.org_logo;
                cardLogo.style.display = 'block';
                cardIcon.style.display = 'none';
            }
        }

        if (settings.mayor_signature) {
            const preview = document.getElementById('mayorSignaturePreview');
            preview.src = settings.mayor_signature;
            preview.style.display = 'block';
        }

        if (settings.qr_code_payment) {
            const preview = document.getElementById('qrCodePromptPayPreview');
            preview.src = settings.qr_code_payment;
            preview.style.display = 'block';
        }

        if (settings.qr_code) {
            const preview = document.getElementById('qrCodePreview');
            preview.src = settings.qr_code;
            preview.style.display = 'block';
        }
    }
}

function previewImage(input, previewId) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    // Validate type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
        Swal.fire('ข้อผิดพลาด', 'รองรับเฉพาะไฟล์ JPG หรือ PNG เท่านั้น', 'warning');
        input.value = '';
        return;
    }
    // Validate size (2MB)
    if (file.size > 2 * 1024 * 1024) {
        Swal.fire('ข้อผิดพลาด', 'ขนาดไฟล์ต้องไม่เกิน 2MB', 'warning');
        input.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = e => {
        const base64 = e.target.result;
        const preview = document.getElementById(previewId);
        preview.src = base64;
        preview.style.display = 'block';

        if (previewId === 'orgLogoPreview') {
            orgLogoBase64 = base64;
        } else if (previewId === 'mayorSignaturePreview') {
            mayorSignatureBase64 = base64;
        } else if (previewId === 'qrCodePromptPayPreview') {
            qrCodePromptPayBase64 = base64;
        } else if (previewId === 'qrCodePreview') {
            qrCodeBase64 = base64;
        }
    };
    reader.readAsDataURL(file);
}

async function uploadToGas(base64, filename, gasUrl) {
    if (!gasUrl) return base64; // Fallback to base64 if no GAS URL

    try {
        const response = await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({
                base64: base64,
                filename: filename
            })
        });
        const result = await response.json();
        if (result.success) {
            return result.imageUrl; // The google drive direct link
        } else {
            console.warn('Google Drive Upload Failed:', result.error);
            return base64; // Fallback
        }
    } catch (e) {
        console.error('Upload Error:', e);
        return base64; // Fallback
    }
}

async function saveSettings() {
    const btn = document.querySelector('button[onclick="saveSettings()"]');
    const originalBtnHtml = btn.innerHTML;
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังบันทึก...';

        const gasUrl = document.getElementById('gasUrl').value.trim();

        // 1. Upload new images if any
        let finalLogo = document.getElementById('orgLogoPreview').src;
        if (orgLogoBase64) {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>อัปโหลด Logo...';
            finalLogo = await uploadToGas(orgLogoBase64, `logo_${Date.now()}.png`, gasUrl);
        }

        let finalSignature = document.getElementById('mayorSignaturePreview').src;
        if (mayorSignatureBase64) {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>อัปโหลดลายเซ็น...';
            finalSignature = await uploadToGas(mayorSignatureBase64, `signature_${Date.now()}.png`, gasUrl);
        }
        
        let finalQrCodePromptPay = document.getElementById('qrCodePromptPayPreview').src;
        if (qrCodePromptPayBase64) {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>อัปโหลด PromptPay QR...';
            finalQrCodePromptPay = await uploadToGas(qrCodePromptPayBase64, `qrcode_pp_${Date.now()}.png`, gasUrl);
        }

        let finalQrCode = document.getElementById('qrCodePreview').src;
        if (qrCodeBase64) {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>อัปโหลด QR Code...';
            finalQrCode = await uploadToGas(qrCodeBase64, `qrcode_${Date.now()}.png`, gasUrl);
        }

        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>กำลังบันทึกลงฐานข้อมูล...';

        // Fix to avoid saving the placeholder default base64 if no image was ever selected/loaded
        if(finalLogo.includes(window.location.origin) || finalLogo === '') finalLogo = null;
        if(finalSignature.includes(window.location.origin) || finalSignature === '') finalSignature = null;
        if(finalQrCodePromptPay.includes(window.location.origin) || finalQrCodePromptPay === '') finalQrCodePromptPay = null;
        if(finalQrCode.includes(window.location.origin) || finalQrCode === '') finalQrCode = null;

        const payload = {
            org_name: document.getElementById('orgName').value.trim(),
            org_address: document.getElementById('orgAddress').value.trim(),
            org_phone: document.getElementById('orgPhone').value.trim(),
            doc_invoice_no: document.getElementById('docInvoiceNo').value.trim(),
            mayor_name: document.getElementById('mayorName').value.trim(),
            mayor_title: document.getElementById('mayorTitle').value.trim(),
            env_license_no: document.getElementById('envLicenseNo').value.trim(),
            env_post_office: document.getElementById('envPostOffice').value.trim(),
            gas_url: gasUrl,
            bank_account: document.getElementById('bankAccount').value.trim(),
            bank_account_name: document.getElementById('bankAccountName').value.trim(),
            bank_name: document.getElementById('bankName').value.trim(),
            bank_branch: document.getElementById('bankBranch').value.trim(),
            org_logo: finalLogo,
            mayor_signature: finalSignature,
            qr_code: finalQrCode,
            qr_code_payment: finalQrCodePromptPay,
            updated_at: new Date().toISOString()
        };

        // 2. Save to Supabase
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            let error;
            // Use Upsert to prevent duplicate key errors and simplify logic
            payload.id = 1; // Always use ID 1 for single settings row
            const res = await supabaseClient.from('waste_settings').upsert([payload]);
            error = res.error;
            currentSettingsId = 1;

            if (error) {
                // It might fail if table doesn't exist
                throw error;
            }
        }

        // 3. Save to localStorage fallback
        localStorage.setItem('waste_settings', JSON.stringify({id: currentSettingsId, ...payload}));

        // Reset the tracking vars
        orgLogoBase64 = null;
        mayorSignatureBase64 = null;

        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: 'ข้อมูลการตั้งค่าถูกบันทึกเรียบร้อยแล้ว',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (err) {
        console.error("Save error:", err);
        Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาตรวจสอบฐานข้อมูล', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalBtnHtml;
    }
}

// --- Backup & Restore Logic ---

const BACKUP_TABLES = [
    'waste_settings',
    'waste_staff',
    'waste_monthly_status',
    'waste_payments',
    'waste_chats',
    'waste_fee_types',
    'waste_fee_history',
    'waste_customers',
    'waste_register_requests',
    'waste_cancel_requests',
    'waste_exemptions',
    'garbage_payment_transactions',
    'waste_import_history',
    'Staff',
    'User_population'
];

async function backupData() {
    if (!supabaseClient) {
        Swal.fire('ข้อผิดพลาด', 'ระบบยังไม่ได้เชื่อมต่อกับ Supabase', 'error');
        return;
    }

    try {
        Swal.fire({
            title: 'กำลังดึงข้อมูลเพื่อสำรอง...',
            text: 'กรุณารอสักครู่ (อาจใช้เวลาหลายวินาที)',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const backupData = {
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0'
            },
            data: {}
        };

        for (const table of BACKUP_TABLES) {
            let allRows = [];
            let from = 0;
            const step = 1000;
            
            while (true) {
                const { data, error } = await supabaseClient
                    .from(table)
                    .select('*')
                    .range(from, from + step - 1);
                
                if (error) {
                    if (error.code !== '42P01') { // 42P01 is undefined_table
                        console.warn(`Error backing up table ${table}:`, error);
                    }
                    break;
                }
                
                if (data && data.length > 0) {
                    allRows.push(...data);
                    from += step;
                }
                
                if (!data || data.length < step) {
                    break;
                }
            }
            
            if (allRows.length > 0) {
                backupData.data[table] = allRows;
            }
        }

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
        const filename = `waste_backup_${dateStr}_${timeStr}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Swal.fire('สำเร็จ', 'สำรองข้อมูลเรียบร้อยแล้ว ไฟล์ถูกดาวน์โหลดลงเครื่อง', 'success');
    } catch (error) {
        console.error('Backup failed:', error);
        Swal.fire('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการสำรองข้อมูล', 'error');
    }
}

function triggerRestore() {
    document.getElementById('restoreFileInput').click();
}

async function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;

    event.target.value = '';

    if (!supabaseClient) {
        Swal.fire('ข้อผิดพลาด', 'ระบบยังไม่ได้เชื่อมต่อกับ Supabase', 'error');
        return;
    }

    try {
        const text = await file.text();
        const backupFile = JSON.parse(text);

        if (!backupFile.data || !backupFile.metadata) {
            Swal.fire('ข้อผิดพลาด', 'ไฟล์ไม่ถูกต้อง หรือไม่ใช่ไฟล์สำรองข้อมูล', 'error');
            return;
        }

        const tablesInBackup = Object.keys(backupFile.data);
        if (tablesInBackup.length === 0) {
            Swal.fire('คำเตือน', 'ไม่มีข้อมูลในไฟล์สำรองนี้', 'warning');
            return;
        }

        const confirm = await Swal.fire({
            title: 'ยืนยันการเรียกคืนข้อมูล?',
            html: `คุณกำลังจะเรียกคืนข้อมูลจากวันที่ <b>${new Date(backupFile.metadata.timestamp).toLocaleString('th-TH')}</b><br><br><span class="text-danger fw-bold">ข้อมูลปัจจุบันในระบบจะถูกลบทิ้งและแทนที่ด้วยข้อมูลจากไฟล์นี้ทั้งหมด!</span><br>คุณแน่ใจหรือไม่?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'ยืนยันการเรียกคืน',
            cancelButtonText: 'ยกเลิก'
        });

        if (!confirm.isConfirmed) return;

        Swal.fire({
            title: 'กำลังเรียกคืนข้อมูล...',
            text: 'ห้ามปิดหน้านี้จนกว่าจะเสร็จสิ้น',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        // Delete all rows in current tables to ensure exact state mapping
        for (const table of tablesInBackup) {
            try {
                // Delete everything where ID is not null (applies to almost all tables with primary key)
                await supabaseClient.from(table).delete().not('id', 'is', null);
            } catch (err) {
                console.warn(`Could not clear table ${table}, will try to upsert instead:`, err);
            }
        }

        // Insert chunks
        for (const table of tablesInBackup) {
            const rows = backupFile.data[table];
            if (!rows || rows.length === 0) continue;

            const chunkSize = 500;
            for (let i = 0; i < rows.length; i += chunkSize) {
                const chunk = rows.slice(i, i + chunkSize);
                const { error } = await supabaseClient.from(table).upsert(chunk);
                if (error) {
                    console.error(`Error inserting into ${table}:`, error);
                    throw new Error(`Failed to restore table ${table}: ${error.message}`);
                }
            }
        }

        Swal.fire({
            icon: 'success',
            title: 'เรียกคืนข้อมูลสำเร็จ!',
            text: 'ระบบจะทำการรีเฟรชหน้าเว็บ',
            timer: 2000,
            showConfirmButton: false
        }).then(() => {
            window.location.reload();
        });

    } catch (error) {
        console.error('Restore failed:', error);
        Swal.fire('ข้อผิดพลาดในการเรียกคืนข้อมูล', error.message || 'เกิดข้อผิดพลาด', 'error');
    }
}

