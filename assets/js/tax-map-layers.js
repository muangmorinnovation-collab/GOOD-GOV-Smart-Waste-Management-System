// ── Tax Map Layer System ──
// Base: Google Satellite | Overlay: Drone from GDrive | Layers: GeoJSON/SHP

// ── Config ──
const MAP_CENTER = [13.7370, 100.5230];
const MAP_ZOOM = 15;

// ── Base Layers ──
const baseLayers = {
    satellite: L.tileLayer('https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        subdomains: '0123', maxZoom: 21, attribution: '© Google Satellite'
    }),
    hybrid: L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        subdomains: '0123', maxZoom: 21, attribution: '© Google Hybrid'
    }),
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OpenStreetMap'
    })
};

// ── Init Map ──
const map = L.map('taxMap', { layers: [baseLayers.satellite] }).setView(MAP_CENTER, MAP_ZOOM);
L.control.layers({ 'ดาวเทียม': baseLayers.satellite, 'ดาวเทียม+ป้าย': baseLayers.hybrid, 'แผนที่ถนน': baseLayers.osm }, {}, { position: 'topright' }).addTo(map);
L.control.scale({ imperial: false }).addTo(map);

// ── Drone Overlay ──
let droneLayer = null;
let droneOpacity = 0.7;

function loadDroneFromDrive(fileId) {
    if (!fileId) return;
    const url = 'https://drive.google.com/uc?export=download&id=' + fileId;
    loadDroneImage(url);
}

function loadDroneImage(url) {
    removeDroneLayer();
    const bounds = map.getBounds().pad(-0.1);
    droneLayer = L.imageOverlay(url, bounds, { opacity: droneOpacity, interactive: false });
    droneLayer.addTo(map);
    droneLayer.getElement().style.pointerEvents = 'none';
    document.getElementById('droneStatus').innerHTML = '<span class="text-success"><i class="fa-solid fa-check-circle me-1"></i>โหลดสำเร็จ</span>';
    document.getElementById('droneControls').style.display = 'block';
}

function loadDroneWithBounds(url, sw, ne) {
    removeDroneLayer();
    const bounds = L.latLngBounds(sw, ne);
    droneLayer = L.imageOverlay(url, bounds, { opacity: droneOpacity, interactive: false });
    droneLayer.addTo(map);
    map.fitBounds(bounds);
    document.getElementById('droneStatus').innerHTML = '<span class="text-success"><i class="fa-solid fa-check-circle me-1"></i>โหลดสำเร็จ</span>';
    document.getElementById('droneControls').style.display = 'block';
}

function removeDroneLayer() {
    if (droneLayer) { map.removeLayer(droneLayer); droneLayer = null; }
}

function setDroneOpacity(v) {
    droneOpacity = parseFloat(v);
    if (droneLayer) droneLayer.setOpacity(droneOpacity);
    document.getElementById('opacityVal').textContent = Math.round(droneOpacity * 100) + '%';
}

// ── GeoJSON Layer Management ──
const geoLayers = { parcels: null, buildings: null, roads: null, custom: [] };

const LAYER_STYLES = {
    parcels: { color: '#22c55e', weight: 2, fillOpacity: 0.4, fillColor: '#22c55e' },
    buildings: { color: '#f97316', weight: 2, fillOpacity: 0.35, fillColor: '#fb923c' },
    roads: { color: '#facc15', weight: 3, fillOpacity: 0, fill: false }
};

function loadGeoJSONLayer(name, data) {
    if (geoLayers[name]) { map.removeLayer(geoLayers[name]); }
    const style = LAYER_STYLES[name] || { color: '#8b5cf6', weight: 2, fillOpacity: 0.3 };
    geoLayers[name] = L.geoJSON(data, {
        style: function(f) {
            if (name === 'parcels' && f.properties) {
                const paid = f.properties.status === 'paid' || f.properties.paid;
                return { ...style, fillColor: paid ? '#22c55e' : '#ef4444', color: paid ? '#16a34a' : '#dc2626' };
            }
            return style;
        },
        onEachFeature: function(f, layer) {
            if (f.properties) {
                let html = '<div style="font-size:0.8rem;max-width:220px;">';
                for (const [k, v] of Object.entries(f.properties)) {
                    if (v !== null && v !== '') html += '<b>' + k + ':</b> ' + v + '<br>';
                }
                html += '</div>';
                layer.bindPopup(html);
                if (f.properties.name || f.properties.id || f.properties.NAME) {
                    layer.bindTooltip(f.properties.name || f.properties.id || f.properties.NAME, { direction: 'top', className: 'layer-tooltip' });
                }
            }
        }
    }).addTo(map);
    map.fitBounds(geoLayers[name].getBounds().pad(0.1));
    updateLayerBadge(name, data.features ? data.features.length : 0);
}

function updateLayerBadge(name, count) {
    const el = document.getElementById('count-' + name);
    if (el) el.textContent = count + ' รายการ';
}

function toggleLayer(name) {
    if (!geoLayers[name]) return;
    if (map.hasLayer(geoLayers[name])) map.removeLayer(geoLayers[name]);
    else geoLayers[name].addTo(map);
}

function removeLayer(name) {
    if (geoLayers[name]) { map.removeLayer(geoLayers[name]); geoLayers[name] = null; }
    updateLayerBadge(name, 0);
}

// ── File Upload Handlers ──
function handleFileUpload(input, layerName) {
    const file = input.files[0];
    if (!file) return;
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'geojson' || ext === 'json') {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                loadGeoJSONLayer(layerName, data);
                showToast('โหลด ' + file.name + ' สำเร็จ', 'success');
            } catch (err) { showToast('ไฟล์ GeoJSON ไม่ถูกต้อง: ' + err.message, 'error'); }
        };
        reader.readAsText(file);
    } else if (ext === 'shp' || ext === 'zip') {
        if (typeof shp === 'undefined') {
            showToast('กำลังโหลด SHP parser...', 'info');
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/shpjs@4.0.4/dist/shp.min.js';
            s.onload = () => parseSHP(file, layerName);
            document.head.appendChild(s);
        } else { parseSHP(file, layerName); }
    } else if (['png','jpg','jpeg','tif','tiff'].includes(ext)) {
        handleDroneImageFile(file);
    } else {
        showToast('รองรับ: .geojson, .json, .shp, .zip, .png, .jpg', 'warning');
    }
}

function parseSHP(file, layerName) {
    const reader = new FileReader();
    reader.onload = e => {
        shp(e.target.result).then(data => {
            loadGeoJSONLayer(layerName, data);
            showToast('แปลง SHP → GeoJSON สำเร็จ', 'success');
        }).catch(err => showToast('SHP Error: ' + err.message, 'error'));
    };
    reader.readAsArrayBuffer(file);
}

function handleDroneImageFile(file) {
    const url = URL.createObjectURL(file);
    loadDroneImage(url);
    showToast('โหลดภาพ ' + file.name + ' เป็น overlay', 'success');
}

function loadFromDriveURL(layerName) {
    const input = document.getElementById('drive-url-' + layerName);
    if (!input || !input.value.trim()) return;
    let url = input.value.trim();
    // Extract file ID from Drive URL
    const m = url.match(/[-\w]{25,}/);
    if (m) url = 'https://drive.google.com/uc?export=download&id=' + m[0];
    if (layerName === 'drone') {
        loadDroneImage(url);
    } else {
        fetch(url).then(r => r.json()).then(data => {
            loadGeoJSONLayer(layerName, data);
            showToast('โหลดจาก Google Drive สำเร็จ', 'success');
        }).catch(() => showToast('ไม่สามารถโหลดจาก Drive ได้ — ตรวจสอบว่าไฟล์ share เป็น "Anyone with link"', 'error'));
    }
}

// ── Mock Parcels (demo) ──
const PARCELS = [
    { id:'04E001', owner:'นายวิชัย ร่ำรวย', address:'บ้านเลขที่ 45 หมู่ 1', type:'ที่ดินพร้อมสิ่งปลูกสร้าง', area:'1 ไร่ 2 งาน', value:2500000, tax:7500, status:'unpaid', lat:13.7375, lng:100.5220 },
    { id:'04E002', owner:'นางสาวใจดี มีสุข', address:'บ้านเลขที่ 46 หมู่ 1', type:'บ้านพักอาศัย', area:'80 ตร.ว.', value:1500000, tax:4500, status:'paid', lat:13.7370, lng:100.5240 },
    { id:'04E003', owner:'บจก.เจริญพาณิชย์', address:'เลขที่ 100 หมู่ 2', type:'อาคารพาณิชย์', area:'4 ไร่', value:12000000, tax:22000, status:'unpaid', lat:13.7360, lng:100.5260 },
    { id:'04E004', owner:'นายสมหวัง ดีงาม', address:'บ้านเลขที่ 78 หมู่ 3', type:'ที่ดินเปล่า', area:'50 ตร.ว.', value:800000, tax:800, status:'paid', lat:13.7380, lng:100.5200 },
];

let parcelLayers = [];
PARCELS.forEach(p => {
    const s = 0.0013;
    const poly = L.polygon([
        [p.lat, p.lng], [p.lat, p.lng + s], [p.lat - s * 0.6, p.lng + s], [p.lat - s * 0.6, p.lng]
    ], { fillColor: p.status === 'paid' ? '#22c55e' : '#ef4444', color: 'white', weight: 2, fillOpacity: 0.55 }).addTo(map);
    poly.bindTooltip('<b>' + p.id + '</b> — ' + p.owner, { direction: 'top' });
    poly.on('click', () => showParcelDetail(p));
    parcelLayers.push({ poly, parcel: p });
});

// ── Toggle visibility helpers ──
function toggleDroneVisibility(visible) {
    if (!droneLayer) return;
    if (visible) droneLayer.addTo(map);
    else map.removeLayer(droneLayer);
}

function toggleDemoParcelVisibility(visible) {
    parcelLayers.forEach(({ poly }) => {
        if (visible) poly.addTo(map);
        else map.removeLayer(poly);
    });
}

function showParcelDetail(p) {
    const badge = p.status === 'paid' ? '<span class="badge bg-success">ชำระแล้ว</span>' : '<span class="badge bg-danger">ค้างชำระ</span>';
    document.getElementById('parcelDetail').innerHTML =
        '<div class="mb-3 pb-3 border-bottom d-flex justify-content-between"><div><span class="badge bg-primary mb-1">' + p.id + '</span><br><div class="fw-bold">' + p.owner + '</div><div class="text-xs text-muted">' + p.address + '</div></div>' + badge + '</div>' +
        '<div class="row g-2 mb-3" style="font-size:0.82rem;"><div class="col-6"><div class="text-muted">ประเภท</div><div class="fw-semibold">' + p.type + '</div></div><div class="col-6"><div class="text-muted">เนื้อที่</div><div class="fw-semibold">' + p.area + '</div></div><div class="col-6"><div class="text-muted">ทุนทรัพย์</div><div class="fw-semibold">฿' + p.value.toLocaleString() + '</div></div><div class="col-6"><div class="text-muted">ภาษีที่ต้องชำระ</div><div class="fw-bold fs-6 ' + (p.status === 'unpaid' ? 'text-danger' : 'text-success') + '">฿' + p.tax.toLocaleString() + '</div></div></div>' +
        '<div class="d-grid gap-2">' + (p.status === 'unpaid' ? '<button class="btn btn-sm btn-primary" onclick="showToast(\'สร้าง QR PromptPay ฿' + p.tax.toLocaleString() + ' สำเร็จ\',\'success\')"><i class="fa-solid fa-qrcode me-1"></i>สร้าง QR รับชำระ</button>' : '') +
        '<button class="btn btn-sm btn-outline-secondary" onclick="showToast(\'กำลังพิมพ์ ภ.ด.ส.3 แปลง ' + p.id + '\',\'info\')"><i class="fa-solid fa-print me-1"></i>พิมพ์ ภ.ด.ส.3</button></div>';
    map.setView([p.lat, p.lng], 17);
}

function filterMap(type) {
    parcelLayers.forEach(({ poly, parcel }) => {
        if (type === 'all') poly.setStyle({ fillOpacity: 0.55 });
        else poly.setStyle({ fillOpacity: (type === 'paid' ? parcel.status === 'paid' : parcel.status === 'unpaid') ? 0.75 : 0.1 });
    });
}

function filterParcels(q) {
    const lq = q.toLowerCase();
    parcelLayers.forEach(({ poly, parcel }) => {
        const match = !q || parcel.id.toLowerCase().includes(lq) || parcel.owner.toLowerCase().includes(lq);
        poly.setStyle({ fillOpacity: match ? 0.55 : 0.1 });
    });
}
