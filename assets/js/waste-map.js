/**
 * waste-map.js — Leaflet Map Module
 * Customer Location Map with Colored Markers
 */

let wasteMap = null;
let wasteMarkers = [];
let wasteMarkerLayer = null;

function initWasteMap(containerId) {
    if (wasteMap) { wasteMap.remove(); wasteMap = null; }
    
    wasteMap = L.map(containerId).setView([14.890, 102.020], 14);
    
    L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        attribution: '&copy; Google',
        maxZoom: 20
    }).addTo(wasteMap);

    wasteMarkerLayer = L.layerGroup().addTo(wasteMap);
    loadWasteMarkers();
    return wasteMap;
}

function getMarkerColor(customerId) {
    const ms = getMonthlyStatus();
    const status = ms[customerId];
    if (!status) return 'gray';
    
    const now = new Date();
    const currentMonthKey = WASTE_MONTH_KEYS[now.getMonth() >= 9 ? now.getMonth() - 9 : now.getMonth() + 3];
    
    if (status[currentMonthKey] === 'paid') return 'green';
    if (status[currentMonthKey] === 'pending') return 'orange';
    return 'red';
}

function createColoredIcon(color) {
    const colors = {
        green: '#10b981', red: '#ef4444', orange: '#f59e0b', gray: '#6b7280'
    };
    const c = colors[color] || colors.gray;
    
    return L.divIcon({
        className: 'waste-marker',
        html: `<div style="background:${c};width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
            <i class="fa-solid fa-house" style="color:white;font-size:12px;"></i></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -16]
    });
}

function loadWasteMarkers(filterMoo, filterStatus) {
    if (!wasteMarkerLayer) return;
    wasteMarkerLayer.clearLayers();
    wasteMarkers = [];
    
    let customers = getWasteCustomers().filter(c => c.status === 'active' && c.lat && c.lng);
    
    if (filterMoo && filterMoo !== 'all') {
        customers = customers.filter(c => c.moo === filterMoo);
    }
    
    customers.forEach(c => {
        const color = getMarkerColor(c.id);
        
        if (filterStatus && filterStatus !== 'all') {
            if (filterStatus === 'paid' && color !== 'green') return;
            if (filterStatus === 'unpaid' && color !== 'red') return;
            if (filterStatus === 'pending' && color !== 'orange') return;
        }
        
        const ms = getMonthlyStatus();
        const s = ms[c.id] || {};
        const unpaidCount = WASTE_MONTH_KEYS.filter(mk => s[mk] === 'unpaid').length;
        const totalDebt = unpaidCount * c.fee;
        
        const statusText = color === 'green' ? '<span class="badge bg-success">ชำระแล้ว</span>' :
                          color === 'orange' ? '<span class="badge bg-warning text-dark">รออนุมัติ</span>' :
                          `<span class="badge bg-danger">ค้าง ${unpaidCount} เดือน</span>`;
        
        const popup = `<div style="font-family:'Prompt',sans-serif;min-width:200px;">
            <h6 style="margin:0 0 8px;font-weight:600;color:#1a56db;"><i class="fa-solid fa-house me-1"></i>${c.name}</h6>
            <table style="font-size:12px;width:100%;">
                <tr><td style="color:#6b7280;padding:2px 8px 2px 0;">บ้านเลขที่</td><td><b>${c.house_no} ม.${c.moo}</b></td></tr>
                <tr><td style="color:#6b7280;padding:2px 8px 2px 0;">เบอร์โทร</td><td>${c.phone}</td></tr>
                <tr><td style="color:#6b7280;padding:2px 8px 2px 0;">สถานะ</td><td>${statusText}</td></tr>
                ${totalDebt > 0 ? `<tr><td style="color:#6b7280;padding:2px 8px 2px 0;">ยอดค้าง</td><td style="color:#ef4444;font-weight:600;">฿${formatMoney(totalDebt)}</td></tr>` : ''}
            </table>
            <div style="margin-top:8px;text-align:right;">
                <a href="https://www.google.com/maps?q=${c.lat},${c.lng}" target="_blank" class="btn btn-xs btn-outline-primary" style="font-size:11px;">
                    <i class="fa-solid fa-map-location-dot me-1"></i>Google Maps
                </a>
            </div>
        </div>`;
        
        const marker = L.marker([c.lat, c.lng], { icon: createColoredIcon(color) })
            .bindPopup(popup);
        
        wasteMarkers.push({ marker, customer: c, color });
        wasteMarkerLayer.addLayer(marker);
    });
    
    if (wasteMarkers.length > 0 && wasteMap) {
        const group = L.featureGroup(wasteMarkers.map(m => m.marker));
        wasteMap.fitBounds(group.getBounds().pad(0.1));
    }
}

function searchWasteMap(query) {
    if (!query) { loadWasteMarkers(); return; }
    const q = query.toLowerCase();
    const found = wasteMarkers.find(m => 
        m.customer.name.toLowerCase().includes(q) || 
        m.customer.house_no.includes(q)
    );
    if (found && wasteMap) {
        wasteMap.setView(found.marker.getLatLng(), 17);
        found.marker.openPopup();
    }
}
