/**
 * dashboard-engine.js
 * Global Smart Governance Dashboard — Data Engine
 * Handles: KPI loading, Charts, Map, CCTV, Auto-refresh
 */

// ═══ CONFIG ═══
const REFRESH_INTERVAL = 30000; // 30 seconds
const MAP_CENTER = [14.224155, 100.025713]; // Default center
const MAP_ZOOM = 14;

// ═══ MOCK DATA ═══
const MOCK_CCTV = [
    { id: 1, name: 'กล้อง CCTV สี่แยกตลาดเทศบาล', location: 'สี่แยกตลาด หมู่ 1', status: 'online', lat: 14.225, lng: 100.026, videoUrl: 'https://www.youtube.com/embed/ydYDqZQpim8?autoplay=1&mute=1' },
    { id: 2, name: 'กล้อง CCTV หน้าโรงเรียน', location: 'ถนนสายหลัก หมู่ 3', status: 'online', lat: 14.223, lng: 100.028, videoUrl: 'https://www.youtube.com/embed/ydYDqZQpim8?autoplay=1&mute=1' },
    { id: 3, name: 'กล้อง CCTV สวนสาธารณะ', location: 'สวนเฉลิมพระเกียรติ หมู่ 5', status: 'offline', lat: 14.226, lng: 100.023, videoUrl: '' },
    { id: 4, name: 'กล้อง CCTV ประตูทางเข้าหมู่บ้าน', location: 'ทางเข้าหมู่บ้านจัดสรร หมู่ 7', status: 'online', lat: 14.222, lng: 100.025, videoUrl: 'https://www.youtube.com/embed/ydYDqZQpim8?autoplay=1&mute=1' },
];



// ═══ GLOBALS ═══
let dashMap = null;
let mapMarkers = [];
let refreshTimer = null;

// ═══ INIT ═══
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('th-TH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    renderCCTV();
    refreshAllData();
    refreshTimer = setInterval(refreshAllData, REFRESH_INTERVAL);
});

// ═══ REFRESH ALL ═══
async function refreshAllData() {
    document.getElementById('lastRefresh').textContent = 'อัพเดทล่าสุด: ' + new Date().toLocaleTimeString('th-TH');
    await Promise.all([loadMasterKPIs(), loadServiceKPIs(), loadMapData(), loadRecentActivity()]);
}

// ═══ SECTION 1: MASTER DATA KPIs ═══
async function loadMasterKPIs() {
    try {
        if (!supabaseClient) return setMockMasterKPIs();

        // Population count
        const { count: popCount } = await supabaseClient.from('User_population').select('*', { count: 'exact', head: true });
        document.getElementById('kpi-population').textContent = (popCount || 0).toLocaleString('th-TH');
        document.getElementById('kpi-population-sub').innerHTML = '<span class="text-success"><i class="fa-solid fa-arrow-trend-up me-1"></i>ผู้ลงทะเบียนในระบบ</span>';

        // Household estimate
        const households = Math.ceil((popCount || 0) / 3.2);
        document.getElementById('kpi-household').textContent = households.toLocaleString('th-TH');
        document.getElementById('kpi-household-sub').textContent = 'ประมาณการจากประชากร';

        // Staff count
        const { count: staffCount } = await supabaseClient.from('Staff').select('*', { count: 'exact', head: true }).eq('status', 'active');
        document.getElementById('kpi-staff').textContent = (staffCount || 0).toLocaleString('th-TH');
        document.getElementById('kpi-staff-sub').innerHTML = '<span class="text-success">สถานะ: ใช้งานอยู่</span>';

        // Department count
        const { data: depts } = await supabaseClient.from('Staff').select('department').eq('status', 'active');
        const uniqueDepts = depts ? [...new Set(depts.map(d => d.department).filter(Boolean))] : [];
        document.getElementById('kpi-dept').textContent = uniqueDepts.length;
        document.getElementById('kpi-dept-sub').textContent = uniqueDepts.slice(0, 3).join(', ') + (uniqueDepts.length > 3 ? '...' : '');
    } catch (err) {
        console.warn('Master KPI error:', err);
        setMockMasterKPIs();
    }
}

function setMockMasterKPIs() {
    document.getElementById('kpi-population').textContent = '12,450';
    document.getElementById('kpi-population-sub').innerHTML = '<span class="text-success"><i class="fa-solid fa-arrow-trend-up me-1"></i>+3.2% จากปีก่อน</span>';
    document.getElementById('kpi-household').textContent = '4,210';
    document.getElementById('kpi-household-sub').textContent = 'ครัวเรือน ในเขตเทศบาล';
    document.getElementById('kpi-staff').textContent = '86';
    document.getElementById('kpi-staff-sub').innerHTML = '<span class="text-success">สถานะ: ใช้งานอยู่</span>';
    document.getElementById('kpi-dept').textContent = '6';
    document.getElementById('kpi-dept-sub').textContent = 'กองคลัง, กองช่าง, สำนักปลัด...';
}

// ═══ SECTION 2: SERVICE KPIs ═══
async function loadServiceKPIs() {
    // Revenue (mock)
    document.getElementById('svc-revenue').textContent = '฿4.52M';

    try {
        if (!supabaseClient) return setMockServiceKPIs();

        const { count: total } = await supabaseClient.from('electric_repairs').select('*', { count: 'exact', head: true });
        const { count: completed } = await supabaseClient.from('electric_repairs').select('*', { count: 'exact', head: true }).eq('status', 'completed');
        const pending = (total || 0) - (completed || 0);

        document.getElementById('svc-total').textContent = (total || 0).toLocaleString();
        document.getElementById('svc-completed').textContent = (completed || 0).toLocaleString();
        document.getElementById('svc-pending').textContent = pending.toLocaleString();
    } catch (err) {
        console.warn('Service KPI error:', err);
        setMockServiceKPIs();
    }
}

function setMockServiceKPIs() {
    document.getElementById('svc-total').textContent = '128';
    document.getElementById('svc-completed').textContent = '95';
    document.getElementById('svc-pending').textContent = '33';
}


// ═══ SECTION 3: MAP ═══
async function loadMapData() {
    if (!dashMap) initMap();

    // Clear old markers
    mapMarkers.forEach(m => dashMap.removeLayer(m));
    mapMarkers = [];

    try {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient
            .from('electric_repairs')
            .select('id, complaint_id, reporter_name, damage_cause, status, latitude, longitude, image_url, created_at')
            .not('latitude', 'is', null)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error || !data) return;

        data.forEach(r => {
            if (!r.latitude || !r.longitude) return;
            const color = r.status === 'completed' ? '#10b981' : (r.status === 'pending' ? '#ef4444' : '#f59e0b');
            const icon = L.divIcon({
                className: '',
                html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);"></div>`,
                iconSize: [14, 14], iconAnchor: [7, 7]
            });

            const statusTh = { pending: 'รอดำเนินการ', accepted: 'รับเรื่องแล้ว', in_progress: 'กำลังดำเนินการ', completed: 'เสร็จสิ้น' };
            const badgeColor = { pending: 'danger', accepted: 'warning', in_progress: 'primary', completed: 'success' };
            const dateStr = r.created_at ? new Date(r.created_at).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'numeric' }) : '-';
            const imgTag = r.image_url ? `<img src="${r.image_url}" style="width:100%;max-height:120px;object-fit:cover;border-radius:8px;margin-top:6px;">` : '';

            const popup = `
                <div style="min-width:200px;font-family:Prompt,sans-serif;font-size:.82rem;">
                    <div class="fw-bold mb-1" style="font-size:.9rem;"><i class="fa-solid fa-bolt text-warning me-1"></i>${r.complaint_id || 'ไม่ระบุ'}</div>
                    <div><b>ผู้แจ้ง:</b> ${r.reporter_name || '-'}</div>
                    <div><b>สาเหตุ:</b> ${r.damage_cause || '-'}</div>
                    <div><b>วันที่:</b> ${dateStr}</div>
                    <div class="mt-1"><span class="badge bg-${badgeColor[r.status] || 'secondary'}">${statusTh[r.status] || r.status}</span></div>
                    ${imgTag}
                    <button class="btn btn-xs btn-outline-info mt-2 w-100" onclick="openCCTV(1)"><i class="fa-solid fa-video me-1"></i>ดู CCTV ใกล้เคียง</button>
                </div>`;

            const m = L.marker([r.latitude, r.longitude], { icon }).addTo(dashMap).bindPopup(popup);
            mapMarkers.push(m);
        });

        document.getElementById('mapMarkerCount').innerHTML = `<i class="fa-solid fa-location-dot me-1"></i>${data.length} คำร้อง`;

        if (data.length > 0 && data[0].latitude) {
            dashMap.setView([data[0].latitude, data[0].longitude], MAP_ZOOM);
        }
    } catch (err) { console.warn('Map error:', err); }
}

function initMap() {
    dashMap = L.map('dashboardMap').setView(MAP_CENTER, MAP_ZOOM);
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { maxZoom: 20, attribution: '&copy; Google' }).addTo(dashMap);

    // Legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = () => {
        const div = L.DomUtil.create('div', '');
        div.style.cssText = 'background:#fff;padding:8px 12px;border-radius:8px;box-shadow:0 1px 5px rgba(0,0,0,.2);font-size:.72rem;font-family:Prompt,sans-serif;';
        div.innerHTML = '<b>สถานะ</b><br><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#ef4444;margin-right:4px;"></span>รอดำเนินการ<br><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#f59e0b;margin-right:4px;"></span>กำลังดำเนินการ<br><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#10b981;margin-right:4px;"></span>เสร็จสิ้น';
        return div;
    };
    legend.addTo(dashMap);
}

// ═══ CCTV ═══
function renderCCTV() {
    const container = document.getElementById('cctvList');
    container.innerHTML = MOCK_CCTV.map(c => `
        <div class="cctv-item" onclick="openCCTV(${c.id})">
            <span class="cctv-dot ${c.status}"></span>
            <div style="flex:1;min-width:0;">
                <div class="fw-semibold text-sm text-truncate">${c.name}</div>
                <div style="font-size:.7rem;color:#6b7280;" class="text-truncate">${c.location}</div>
            </div>
            <span class="badge ${c.status === 'online' ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${c.status === 'online' ? 'text-success' : 'text-danger'}" style="font-size:.65rem;">${c.status === 'online' ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
    `).join('');
}

function openCCTV(id) {
    const cam = MOCK_CCTV.find(c => c.id === id) || MOCK_CCTV[0];
    document.getElementById('cctvModalTitle').innerHTML = `<i class="fa-solid fa-video text-info me-2"></i>${cam.name}`;
    document.getElementById('cctvModalLocation').innerHTML = `<i class="fa-solid fa-location-dot me-1"></i>${cam.location}`;
    document.getElementById('cctvModalStatus').innerHTML = cam.status === 'online'
        ? '<span class="badge bg-success"><i class="fa-solid fa-circle me-1" style="font-size:.5rem;"></i>ONLINE</span>'
        : '<span class="badge bg-danger">OFFLINE</span>';
    document.getElementById('cctvVideoContainer').innerHTML = cam.status === 'online' && cam.videoUrl
        ? `<iframe src="${cam.videoUrl}" frameborder="0" allowfullscreen style="width:100%;height:100%;"></iframe>`
        : `<div class="d-flex flex-column align-items-center justify-content-center h-100 text-white"><i class="fa-solid fa-video-slash fa-3x mb-2 opacity-50"></i><span class="opacity-75">กล้องออฟไลน์</span></div>`;
    new bootstrap.Modal(document.getElementById('cctvModal')).show();
}

// ═══ RECENT ACTIVITY ═══
async function loadRecentActivity() {
    const tbody = document.getElementById('activityBody');
    try {
        if (!supabaseClient) { tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">ไม่สามารถเชื่อมต่อฐานข้อมูล</td></tr>'; return; }

        const { data, error } = await supabaseClient.from('electric_repairs')
            .select('complaint_id, reporter_name, damage_cause, status, created_at')
            .order('created_at', { ascending: false }).limit(6);

        if (error || !data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">ยังไม่มีรายการ</td></tr>';
            return;
        }

        const statusMap = { pending:'รอดำเนินการ', accepted:'รับเรื่องแล้ว', in_progress:'กำลังดำเนินการ', completed:'เสร็จสิ้น' };
        const badgeMap = { pending:'bg-danger', accepted:'bg-warning text-dark', in_progress:'bg-primary', completed:'bg-success' };

        tbody.innerHTML = data.map(r => {
            const d = r.created_at ? new Date(r.created_at) : null;
            const dateStr = d ? d.toLocaleDateString('th-TH', { day:'numeric', month:'short' }) + ' ' + d.toLocaleTimeString('th-TH', { hour:'2-digit', minute:'2-digit' }) : '-';
            return `<tr>
                <td class="ps-4 fw-semibold text-xs">${r.complaint_id || '-'}</td>
                <td>${r.reporter_name || '-'}</td>
                <td class="text-truncate" style="max-width:180px;">${r.damage_cause || '-'}</td>
                <td class="text-xs text-muted">${dateStr}</td>
                <td class="pe-4"><span class="badge ${badgeMap[r.status] || 'bg-secondary'}">${statusMap[r.status] || r.status}</span></td>
            </tr>`;
        }).join('');

        document.getElementById('activityCount').textContent = data.length + ' รายการ';
    } catch (err) { console.warn('Activity error:', err); }
}


// ═══ DRILL DOWN ═══
async function drillDown(type) {
    const titles = { population:'ข้อมูลประชากร', household:'ข้อมูลครัวเรือน', staff:'ข้อมูลบุคลากร', department:'ข้อมูลหน่วยงาน' };
    document.getElementById('drillDownTitle').innerHTML = `<i class="fa-solid fa-chart-bar text-primary me-2"></i>${titles[type] || type}`;
    const body = document.getElementById('drillDownBody');
    body.innerHTML = '<div class="text-center py-4"><span class="spinner-border text-primary"></span></div>';
    new bootstrap.Modal(document.getElementById('drillDownModal')).show();

    try {
        if (type === 'staff' && supabaseClient) {
            const { data } = await supabaseClient.from('Staff').select('first_name, last_name, department, role, status').eq('status','active').limit(20);
            if (data && data.length) {
                body.innerHTML = `<table class="table table-sm table-hover"><thead><tr><th>ชื่อ-สกุล</th><th>กอง</th><th>ตำแหน่ง</th></tr></thead><tbody>${data.map(s=>`<tr><td>${s.first_name} ${s.last_name}</td><td>${s.department||'-'}</td><td><span class="badge bg-primary bg-opacity-10 text-primary">${s.role||'-'}</span></td></tr>`).join('')}</tbody></table>`;
                return;
            }
        }
        if (type === 'department' && supabaseClient) {
            const { data } = await supabaseClient.from('Staff').select('department').eq('status','active');
            if (data) {
                const counts = {};
                data.forEach(d => { if(d.department) counts[d.department] = (counts[d.department]||0)+1; });
                body.innerHTML = `<div class="list-group list-group-flush">${Object.entries(counts).map(([k,v])=>`<div class="list-group-item d-flex justify-content-between align-items-center"><span><i class="fa-solid fa-building text-primary me-2"></i>${k}</span><span class="badge bg-primary rounded-pill">${v} คน</span></div>`).join('')}</div>`;
                return;
            }
        }
    } catch(e) { console.warn('Drill-down error:', e); }
    body.innerHTML = '<div class="text-center text-muted py-3"><i class="fa-solid fa-database fa-2x mb-2 opacity-25"></i><br>ไม่สามารถโหลดข้อมูลได้</div>';
}
