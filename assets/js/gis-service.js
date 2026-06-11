/**
 * gis-service.js — GIS Spatial Layer Service
 * Smart Governance Municipality Platform
 */
const GISService = {
    map: null, layers: {}, layerGroup: null, heatLayer: null,
    LAYER_COLORS: {
        all:'#3b82f6', elderly:'#f59e0b', disabled:'#8b5cf6', bedridden:'#ef4444',
        newborn:'#10b981', poor:'#dc2626', scholars:'#0694a2', leaders:'#1a56db'
    },
    LAYER_ICONS: {
        all:'fa-house-chimney', elderly:'fa-person-cane', disabled:'fa-wheelchair',
        bedridden:'fa-bed-pulse', newborn:'fa-baby', poor:'fa-hand-holding-heart',
        scholars:'fa-graduation-cap', leaders:'fa-people-group'
    },

    initMap(containerId) {
        this.map = L.map(containerId);
        
        // Base Maps
        const googleStreets = L.tileLayer('http://mt0.google.com/vt/lyrs=m&hl=th&x={x}&y={y}&z={z}', {
            attribution:'&copy; Google Maps', maxZoom:20
        });
        
        const googleHybrid = L.tileLayer('http://mt0.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}', {
            attribution:'&copy; Google Maps (Satellite)', maxZoom:20
        });

        // Set default layer
        googleHybrid.addTo(this.map);
        
        // Add Layer Control (Top Left)
        const baseMaps = {
            "🗺️ แผนที่ถนน (Street)": googleStreets,
            "🛰️ ดาวเทียม (Satellite)": googleHybrid
        };
        
        L.control.layers(baseMaps, null, { position: 'topleft' }).addTo(this.map);
        
        // Use FeatureGroup instead of MarkerCluster to show all points
        this.layerGroup = L.featureGroup().addTo(this.map);
        return this.map;
    },

    async loadLayers(data) {
        if(!data || !data.length) data = await DigitalDataService.getHouseholdMap();
        this.clearLayers();
        
        data.forEach(h => {
            if(!h.latitude || !h.longitude) return;
            const marker = this._createMarker(h, 'all');
            this.layerGroup.addLayer(marker);
        });
        this.layers.all = data;
        
        // Auto fit bounds to markers if any exist
        if (this.layerGroup.getLayers().length > 0) {
            this.map.fitBounds(this.layerGroup.getBounds(), { padding: [50, 50], maxZoom: 17 });
        } else {
            this.map.setView([14.882, 100.414], 13); // Central Thailand fallback
        }
    },

    filterSpatialData(layerType, data) {
        if(!data) data = this.layers.all || [];
        const filtered = data.filter(h => {
            switch(layerType) {
                case 'elderly': return (h.elderly_count||0) > 0;
                case 'disabled': return (h.disabled_count||0) > 0;
                case 'bedridden': return (h.bedridden_count||0) > 0;
                case 'newborn': return (h.newborn_count||0) > 0;
                case 'poor': return h.poverty_status === true;
                default: return true;
            }
        });
        
        this.clearLayers();
        filtered.forEach(h => {
            if(!h.latitude||!h.longitude) return;
            const marker = this._createMarker(h, layerType);
            this.layerGroup.addLayer(marker);
        });
        
        // Auto fit bounds to filtered markers if any exist
        if (this.layerGroup.getLayers().length > 0) {
            this.map.fitBounds(this.layerGroup.getBounds(), { padding: [50, 50], maxZoom: 17 });
        } else {
            this.map.setView([14.882, 100.414], 13);
        }
        
        return filtered;
    },

    _createMarker(h, layerType) {
        const color = this.LAYER_COLORS[layerType] || this.LAYER_COLORS.all;
        const iconClass = this.LAYER_ICONS[layerType] || this.LAYER_ICONS.all;
        
        const html = `
            <div style="position:relative; text-align:center; transform:translateY(-10px);">
                <div style="background:${color}; color:#fff; padding:3px 8px; border-radius:20px; font-size:0.8rem; font-weight:700; border:2px solid #fff; box-shadow:0 3px 6px rgba(0,0,0,0.3); white-space:nowrap; display:inline-flex; align-items:center; gap:6px;">
                    <i class="fa-solid ${iconClass}"></i> ${h.house_number || '-'}
                </div>
                <div style="width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:8px solid ${color}; margin:0 auto; margin-top:-2px; filter:drop-shadow(0 2px 2px rgba(0,0,0,0.2)); position:relative; z-index:-1;"></div>
            </div>
        `;
        
        const customIcon = L.divIcon({
            className: 'custom-gis-marker',
            html: html,
            iconSize: [80, 40],
            iconAnchor: [40, 40],
            popupAnchor: [0, -40]
        });

        const marker = L.marker([h.latitude, h.longitude], { icon: customIcon, zIndexOffset: 1000 });
        marker.bindPopup(this._buildPopup(h, layerType));
        return marker;
    },

    searchRadius(lat, lng, radiusKm, data) {
        if(!data) data = this.layers.all || [];
        return data.filter(h => {
            if(!h.latitude||!h.longitude) return false;
            const d = this._haversine(lat,lng,h.latitude,h.longitude);
            return d <= radiusKm;
        });
    },

    clearLayers() {
        if(this.layerGroup) this.layerGroup.clearLayers();
    },

    toggleHeatmap(data, show) {
        if(!this.map) return;
        if(this.heatLayer) { this.map.removeLayer(this.heatLayer); this.heatLayer=null; }
        if(!show) return;
        if(typeof L.heatLayer === 'undefined') { console.warn('Leaflet.heat not loaded'); return; }
        if(!data) data = this.layers.all || [];
        const pts = data.filter(h=>h.latitude&&h.longitude).map(h=>[h.latitude,h.longitude,1]);
        this.heatLayer = L.heatLayer(pts, {radius:25,blur:15,maxZoom:17}).addTo(this.map);
    },

    // Future GIS Intelligence stub
    enableGISIntelligence() { console.log('GIS Intelligence: Architecture stub'); return {status:'stub'}; },

    _buildPopup(h, layerType='all') {
        return `<div style="min-width:240px;font-family:'Prompt',sans-serif;">
            <div style="font-weight:700;font-size:1.05rem;margin-bottom:4px;color:#1e3a8a;"><i class="fa-solid fa-house-chimney me-1"></i> บ้านเลขที่ ${h.house_number||'-'}</div>
            <div style="font-size:0.85rem;color:#4b5563;font-weight:500;"><i class="fa-solid fa-map-pin me-1"></i> หมู่ ${h.village_no||'-'} ${h.village_name||''}</div>
            <hr style="margin:8px 0;border-color:#e5e7eb;">
            <div style="font-size:0.85rem;margin-bottom:4px;"><b><i class="fa-solid fa-user me-1 text-secondary"></i> เจ้าบ้าน:</b> ${h.owner_name||'-'}</div>
            <div style="font-size:0.85rem;"><b><i class="fa-solid fa-users me-1 text-secondary"></i> สมาชิก:</b> ${h.total_members||0} คน</div>
            
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;font-size:0.8rem;">
                ${(h.elderly_count||0)>0 && (layerType==='all'||layerType==='elderly')?`<div style="background:#fef3c7;border:1px solid #fde68a;padding:6px 10px;border-radius:8px;">
                    <div style="color:#92400e;font-weight:700;"><i class="fa-solid fa-person-cane"></i> ผู้สูงอายุ (${h.elderly_count} คน)</div>
                    ${h.elderly_names && h.elderly_names.length ? `<div style="color:#78350f;margin-top:4px;padding-left:18px;">- ${h.elderly_names.join('<br>- ')}</div>` : ''}
                </div>`:''}
                
                ${(h.disabled_count||0)>0 && (layerType==='all'||layerType==='disabled')?`<div style="background:#ede9fe;border:1px solid #ddd6fe;padding:6px 10px;border-radius:8px;">
                    <div style="color:#5b21b6;font-weight:700;"><i class="fa-solid fa-wheelchair"></i> ผู้พิการ (${h.disabled_count} คน)</div>
                    ${h.disabled_names && h.disabled_names.length ? `<div style="color:#4c1d95;margin-top:4px;padding-left:18px;">- ${h.disabled_names.join('<br>- ')}</div>` : ''}
                </div>`:''}

                ${(h.bedridden_count||0)>0 && (layerType==='all'||layerType==='bedridden')?`<div style="background:#fee2e2;border:1px solid #fecaca;padding:6px 10px;border-radius:8px;">
                    <div style="color:#991b1b;font-weight:700;"><i class="fa-solid fa-bed-pulse"></i> ผู้ป่วยติดเตียง (${h.bedridden_count} คน)</div>
                    ${h.bedridden_names && h.bedridden_names.length ? `<div style="color:#7f1d1d;margin-top:4px;padding-left:18px;">- ${h.bedridden_names.join('<br>- ')}</div>` : ''}
                </div>`:''}

                ${(h.newborn_count||0)>0 && (layerType==='all'||layerType==='newborn')?`<div style="background:#d1fae5;border:1px solid #a7f3d0;padding:6px 10px;border-radius:8px;">
                    <div style="color:#065f46;font-weight:700;"><i class="fa-solid fa-baby"></i> เด็กแรกเกิด (${h.newborn_count} คน)</div>
                    ${h.newborn_names && h.newborn_names.length ? `<div style="color:#064e3b;margin-top:4px;padding-left:18px;">- ${h.newborn_names.join('<br>- ')}</div>` : ''}
                </div>`:''}

                ${h.poverty_status && (layerType==='all'||layerType==='poor')?`<div style="background:#fee2e2;border:1px solid #fecaca;color:#991b1b;padding:6px 10px;border-radius:8px;font-weight:700;"><i class="fa-solid fa-hand-holding-heart"></i> ครัวเรือนยากจน</div>`:''}
            </div>

            <a href="digital-data-profile.html?id=${h.id}" style="display:block;margin-top:12px;text-align:center;background:#3b82f6;color:#fff;padding:6px 12px;border-radius:8px;font-size:0.85rem;font-weight:600;text-decoration:none;transition:all 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'"><i class="fa-solid fa-folder-open me-1"></i> ดูโปรไฟล์แบบละเอียด</a>
        </div>`;
    },

    _haversine(lat1,lon1,lat2,lon2) {
        const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
        const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
        return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    }
};
