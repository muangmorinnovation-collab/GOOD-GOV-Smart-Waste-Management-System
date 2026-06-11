// ── Google Drive GeoTIFF Loader v2 ──
// Uses .tfw world files for coordinates + UTM→WGS84 conversion

const DriveGeoTIFF = (function () {
    const DRIVE_API = 'https://www.googleapis.com/drive/v3';
    let apiKey = '';
    let loadedTiles = [];
    let boundsGroup = null;
    let mapRef = null;

    function init(m) { mapRef = m; boundsGroup = L.layerGroup().addTo(m); }

    // ── API Key ──
    function setApiKey(k) { apiKey = k.trim(); localStorage.setItem('sgov_gdrive_apikey', apiKey); }
    function getApiKey() { if (!apiKey) apiKey = localStorage.getItem('sgov_gdrive_apikey') || ''; return apiKey; }

    // ── UTM → WGS84 conversion ──
    // Thai drone images are typically UTM Zone 47N (EPSG:32647) or 48N
    function utmToLatLng(easting, northing, zone, northern) {
        // Simplified UTM to WGS84 conversion
        const a = 6378137; // WGS84 semi-major axis
        const f = 1 / 298.257223563;
        const e = Math.sqrt(2 * f - f * f);
        const e2 = e * e / (1 - e * e);
        const k0 = 0.9996;
        const x = easting - 500000;
        const y = northern ? northing : northing - 10000000;
        const M = y / k0;
        const mu = M / (a * (1 - e * e / 4 - 3 * e * e * e * e / 64 - 5 * e * e * e * e * e * e / 256));
        const e1 = (1 - Math.sqrt(1 - e * e)) / (1 + Math.sqrt(1 - e * e));
        const phi1 = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
            + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
            + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);
        const sinPhi = Math.sin(phi1), cosPhi = Math.cos(phi1), tanPhi = Math.tan(phi1);
        const N1 = a / Math.sqrt(1 - e * e * sinPhi * sinPhi);
        const T1 = tanPhi * tanPhi;
        const C1 = e2 * cosPhi * cosPhi;
        const R1 = a * (1 - e * e) / Math.pow(1 - e * e * sinPhi * sinPhi, 1.5);
        const D = x / (N1 * k0);
        const lat = phi1 - (N1 * tanPhi / R1) * (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * e2) * D * D * D * D / 24
            + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * e2 - 3 * C1 * C1) * D * D * D * D * D * D / 720);
        const lng = (D - (1 + 2 * T1 + C1) * D * D * D / 6
            + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * e2 + 24 * T1 * T1) * D * D * D * D * D / 120) / cosPhi;
        const latDeg = lat * 180 / Math.PI;
        const lngDeg = ((zone - 1) * 6 - 180 + 3) + lng * 180 / Math.PI;
        return [latDeg, lngDeg];
    }

    // Detect UTM zone from easting/northing values
    function detectUTMZone(x, y) {
        // Thai coordinates: UTM 47N (96°E-102°E) or 48N (102°E-108°E)
        // If easting is in 100000-999999 range, it's UTM
        if (x > 100000 && x < 999999) {
            // For Thailand, most areas are in zone 47 or 48
            // Zone 47: central longitude 99°E (covers most of Thailand)
            // Zone 48: central longitude 105°E
            return { isUTM: true, zone: 47, northern: true };
        }
        return { isUTM: false };
    }

    // ── Extract folder ID ──
    function extractFolderId(input) {
        if (!input) return null;
        const m = input.match(/folders\/([a-zA-Z0-9_-]+)/);
        if (m) return m[1];
        if (/^[a-zA-Z0-9_-]{10,}$/.test(input.trim())) return input.trim();
        return null;
    }

    // ── List ALL files in folder ──
    async function listAllFiles(folderId) {
        const key = getApiKey();
        if (!key) throw new Error('กรุณาใส่ Google API Key ก่อน');
        const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
        const url = `${DRIVE_API}/files?q=${q}&fields=files(id,name,size,mimeType,thumbnailLink)&pageSize=1000&key=${key}`;
        const resp = await fetch(url);
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error?.message || 'ไม่สามารถเข้าถึงโฟลเดอร์ — ตรวจสอบ API Key และ share เป็น "Anyone with link"');
        }
        const data = await resp.json();
        return data.files || [];
    }

    // ── Download text file from Drive ──
    async function downloadText(fileId) {
        const key = getApiKey();
        const url = `${DRIVE_API}/files/${fileId}?alt=media&key=${key}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error('Download failed');
        return await resp.text();
    }

    // ── Parse .tfw world file ──
    function parseTFW(text) {
        const lines = text.trim().split(/\r?\n/).map(l => parseFloat(l.trim()));
        if (lines.length < 6 || lines.some(isNaN)) return null;
        return {
            pixelSizeX: lines[0],  // A: pixel size in X direction
            rotY: lines[1],        // D: rotation
            rotX: lines[2],        // B: rotation
            pixelSizeY: lines[3],  // E: pixel size in Y direction (negative = north-up)
            originX: lines[4],     // C: X coordinate of upper-left pixel center
            originY: lines[5]      // F: Y coordinate of upper-left pixel center
        };
    }

    // ── Read TIF dimensions (width/height from header) ──
    async function readTifDimensions(fileId) {
        const key = getApiKey();
        const url = `${DRIVE_API}/files/${fileId}?alt=media&key=${key}`;
        try {
            const resp = await fetch(url, { headers: { 'Range': 'bytes=0-8191' } });
            const buf = await resp.arrayBuffer();
            const view = new DataView(buf);
            // TIFF header: byte order (2) + magic (2) + IFD offset (4)
            const le = view.getUint16(0) === 0x4949; // little-endian
            const g16 = (o) => le ? view.getUint16(o, true) : view.getUint16(o, false);
            const g32 = (o) => le ? view.getUint32(o, true) : view.getUint32(o, false);
            const ifdOffset = g32(4);
            if (ifdOffset > buf.byteLength - 2) return null;
            const numEntries = g16(ifdOffset);
            let width = 0, height = 0;
            for (let i = 0; i < numEntries && i < 50; i++) {
                const entryOff = ifdOffset + 2 + i * 12;
                if (entryOff + 12 > buf.byteLength) break;
                const tag = g16(entryOff);
                const type = g16(entryOff + 2);
                const valOff = entryOff + 8;
                if (tag === 256) width = (type === 3) ? g16(valOff) : g32(valOff);
                if (tag === 257) height = (type === 3) ? g16(valOff) : g32(valOff);
            }
            return (width && height) ? { width, height } : null;
        } catch (e) {
            console.warn('Failed to read TIF dimensions:', e);
            return null;
        }
    }

    // ── Calculate bounding box from TFW + dimensions ──
    function calcBounds(tfw, dims) {
        const ulX = tfw.originX;
        const ulY = tfw.originY;
        const lrX = ulX + tfw.pixelSizeX * dims.width;
        const lrY = ulY + tfw.pixelSizeY * dims.height; // pixelSizeY is negative

        const utm = detectUTMZone(ulX, ulY);
        if (utm.isUTM) {
            const ul = utmToLatLng(ulX, ulY, utm.zone, utm.northern);
            const lr = utmToLatLng(lrX, lrY, utm.zone, utm.northern);
            return [[lr[0], ul[1]], [ul[0], lr[1]]]; // [[south,west],[north,east]]
        } else {
            // Already in lat/lng (unlikely for drone, but handle)
            return [[Math.min(ulY, lrY), Math.min(ulX, lrX)],
            [Math.max(ulY, lrY), Math.max(ulX, lrX)]];
        }
    }

    // ── Render overview image from .ovr or .tif using geotiff.js ──
    async function renderOverview(fileId) {
        const key = getApiKey();
        const url = `${DRIVE_API}/files/${fileId}?alt=media&key=${key}`;
        const tiff = await GeoTIFF.fromUrl(url, { allowFullFile: false });
        const count = await tiff.getImageCount();
        // Use the smallest overview (last image = lowest resolution)
        const imgIdx = Math.max(0, count - 1);
        const image = await tiff.getImage(imgIdx);
        const w = image.getWidth();
        const h = image.getHeight();
        const numBands = image.getSamplesPerPixel();
        // Read RGB bands (or first 3 bands)
        const samples = numBands >= 3 ? [0, 1, 2] : [0];
        const rasters = await image.readRasters({ samples: samples });
        // Detect data range for normalization (8-bit vs 16-bit)
        let maxVal = 255;
        if (image.getBitsPerSample && image.getBitsPerSample()[0] > 8) maxVal = 65535;
        // Quick sample to find actual max (for better contrast)
        let sampleMax = 0;
        const band0 = rasters[0];
        const step = Math.max(1, Math.floor(band0.length / 5000));
        for (let i = 0; i < band0.length; i += step) {
            if (band0[i] > sampleMax) sampleMax = band0[i];
        }
        if (sampleMax > 255) maxVal = sampleMax || 65535;
        else if (sampleMax > 0 && sampleMax <= 255) maxVal = 255;
        const scale = 255 / maxVal;
        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(w, h);
        const pixels = imgData.data;
        const isGray = samples.length === 1;
        for (let i = 0; i < w * h; i++) {
            const idx = i * 4;
            if (isGray) {
                const v = Math.min(255, Math.round(rasters[0][i] * scale));
                pixels[idx] = pixels[idx + 1] = pixels[idx + 2] = v;
            } else {
                pixels[idx] = Math.min(255, Math.round(rasters[0][i] * scale));
                pixels[idx + 1] = Math.min(255, Math.round(rasters[1][i] * scale));
                pixels[idx + 2] = Math.min(255, Math.round(rasters[2][i] * scale));
            }
            pixels[idx + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        return canvas.toDataURL('image/jpeg', 0.85);
    }

    // ── Create overlay for a tile (bounds only, image loaded later) ──
    function createOverlay(baseName, bounds, tifFile) {
        // Bounds rectangle
        const rect = L.rectangle(bounds, {
            color: '#8b5cf6', weight: 2, fillOpacity: 0.08,
            dashArray: '6,4'
        }).addTo(boundsGroup);

        // Center label
        const center = L.latLngBounds(bounds).getCenter();
        const label = L.marker(center, {
            icon: L.divIcon({
                className: '',
                html: '<div style="background:rgba(139,92,246,0.9);color:#fff;padding:3px 10px;border-radius:6px;font-size:0.72rem;white-space:nowrap;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.3);">' +
                    baseName + '.tif</div>',
                iconSize: null
            }),
            interactive: false
        }).addTo(boundsGroup);

        rect.bindPopup(
            '<div style="font-size:0.8rem;"><b>' + baseName + '.tif</b><br>' +
            'ขนาด: ' + formatSize(tifFile.size) + '<br>' +
            '<a href="https://drive.google.com/file/d/' + tifFile.id + '/view" target="_blank" style="color:#3b82f6;">เปิดใน Drive</a></div>'
        );

        return { overlay: null, rect, label, baseName, bounds };
    }

    // ── Load overview image and attach to tile ──
    async function loadTileImage(tile, ovrFileId, tifFileId) {
        // Prefer .ovr (smaller, contains only overviews)
        const fileId = ovrFileId || tifFileId;
        try {
            const dataUrl = await renderOverview(fileId);
            tile.overlay = L.imageOverlay(dataUrl, tile.bounds, {
                opacity: 0.75, interactive: true
            }).addTo(mapRef);
            tile.overlay.bindTooltip(tile.baseName + '.tif', { sticky: true, direction: 'top' });
            // Remove label once image is loaded (image replaces it)
            if (tile.label) boundsGroup.removeLayer(tile.label);
            return true;
        } catch (e) {
            console.warn(`Failed to render overview for ${tile.baseName}:`, e.message);
            return false;
        }
    }

    function formatSize(bytes) {
        if (!bytes) return '—';
        const b = parseInt(bytes);
        if (b > 1e9) return (b / 1e9).toFixed(2) + ' GB';
        if (b > 1e6) return (b / 1e6).toFixed(1) + ' MB';
        return (b / 1e3).toFixed(0) + ' KB';
    }

    // ── Main: Load folder ──
    async function loadFolder(folderInput, mapInstance, onProgress) {
        const folderId = extractFolderId(folderInput);
        if (!folderId) throw new Error('Folder ID/URL ไม่ถูกต้อง');
        mapRef = mapInstance;
        clearAll(mapInstance);

        onProgress && onProgress('กำลังดึงรายการไฟล์จากโฟลเดอร์...', 0);
        const allFiles = await listAllFiles(folderId);

        // Group files by base name
        const groups = {};
        allFiles.forEach(f => {
            const name = f.name.toLowerCase();
            let base = null;
            if (name.endsWith('.tif')) base = f.name.slice(0, -4);
            else if (name.endsWith('.tfw')) base = f.name.slice(0, -4);
            else if (name.endsWith('.tif.aux.xml')) base = f.name.slice(0, -12);
            else if (name.endsWith('.tif.ovr')) base = f.name.slice(0, -8);
            if (base) {
                base = base.toLowerCase();
                if (!groups[base]) groups[base] = {};
                if (name.endsWith('.tif') && !name.endsWith('.tif.aux.xml') && !name.endsWith('.tif.ovr'))
                    groups[base].tif = f;
                else if (name.endsWith('.tfw'))
                    groups[base].tfw = f;
                else if (name.endsWith('.tif.aux.xml'))
                    groups[base].aux = f;
                else if (name.endsWith('.tif.ovr'))
                    groups[base].ovr = f;
            }
        });

        const groupKeys = Object.keys(groups).filter(k => groups[k].tif && groups[k].tfw);
        if (groupKeys.length === 0) throw new Error('ไม่พบไฟล์ .tif + .tfw ที่จับคู่กันได้ในโฟลเดอร์');

        onProgress && onProgress(`พบ ${groupKeys.length} ชุดภาพ กำลังอ่านพิกัด...`, 10);

        let success = 0;
        let allBoundsArr = [];
        const tilesToLoad = []; // for phase 2 (image loading)

        // ── Phase 1: Read coordinates & show bounds (fast) ──
        for (let i = 0; i < groupKeys.length; i++) {
            const base = groupKeys[i];
            const g = groups[base];
            const pct = 10 + Math.round((i / groupKeys.length) * 40);
            onProgress && onProgress(`อ่านพิกัด: ${base}.tif (${i + 1}/${groupKeys.length})`, pct);

            try {
                const tfwText = await downloadText(g.tfw.id);
                const tfw = parseTFW(tfwText);
                if (!tfw) { console.warn(`Invalid TFW: ${base}.tfw`); continue; }

                let dims = await readTifDimensions(g.tif.id);
                if (!dims) {
                    const bytes = parseInt(g.tif.size) || 500000000;
                    const side = Math.round(Math.sqrt(bytes / 3));
                    dims = { width: side, height: side };
                }

                const bounds = calcBounds(tfw, dims);
                const tile = createOverlay(base, bounds, g.tif);
                loadedTiles.push(tile);
                allBoundsArr.push(bounds);
                tilesToLoad.push({ tile, g });
                success++;
            } catch (err) {
                console.warn(`Error processing ${base}:`, err);
            }
        }

        // Fit map to all bounds
        if (allBoundsArr.length > 0) {
            const combined = L.latLngBounds(allBoundsArr[0]);
            allBoundsArr.forEach(b => combined.extend(b));
            mapInstance.fitBounds(combined.pad(0.05));
        }

        onProgress && onProgress(`พิกัดสำเร็จ ${success} ไฟล์ — กำลังโหลดภาพ...`, 55);

        // ── Phase 2: Load overview images progressively ──
        let imgLoaded = 0;
        for (let i = 0; i < tilesToLoad.length; i++) {
            const { tile, g } = tilesToLoad[i];
            const pct = 55 + Math.round((i / tilesToLoad.length) * 43);
            onProgress && onProgress(`โหลดภาพ: ${tile.baseName}.tif (${i + 1}/${tilesToLoad.length})`, pct);
            const ovrId = g.ovr ? g.ovr.id : null;
            const ok = await loadTileImage(tile, ovrId, g.tif.id);
            if (ok) imgLoaded++;
        }

        onProgress && onProgress(`สำเร็จ! ${imgLoaded}/${success} ภาพแสดงผล`, 100);
        return { total: groupKeys.length, loaded: success, imagesRendered: imgLoaded };
    }

    // ── Controls ──
    function setAllOpacity(val) {
        loadedTiles.forEach(t => { if (t.overlay) t.overlay.setOpacity(val); });
    }

    function setVisible(visible, m) {
        loadedTiles.forEach(t => {
            if (t.overlay) { if (visible) t.overlay.addTo(m); else m.removeLayer(t.overlay); }
        });
        if (visible) boundsGroup.addTo(m); else m.removeLayer(boundsGroup);
    }

    function clearAll(m) {
        loadedTiles.forEach(t => { if (t.overlay) m.removeLayer(t.overlay); });
        loadedTiles = [];
        if (boundsGroup) boundsGroup.clearLayers();
    }

    function getCount() { return loadedTiles.length; }

    return { init, setApiKey, getApiKey, loadFolder, setAllOpacity, setVisible, clearAll, getCount };
})();
