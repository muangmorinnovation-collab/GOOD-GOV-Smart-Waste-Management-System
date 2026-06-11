/**
 * childdev-map.js — Leaflet Map Module for Student Homes
 */

const ChilddevMap = {
    map: null,
    markers: [],
    markerGroup: null,

    init(elementId, center = [15.0, 103.0], zoom = 13) {
        this.map = L.map(elementId).setView(center, zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap', maxZoom: 19
        }).addTo(this.map);
        this.markerGroup = L.layerGroup().addTo(this.map);
        return this.map;
    },

    loadStudentMarkers(students, classrooms, filterRoom = '') {
        this.markerGroup.clearLayers();
        this.markers = [];
        const filtered = filterRoom ? students.filter(s => s.classroomId === filterRoom) : students;
        const bounds = [];

        filtered.forEach(s => {
            if (!s.address?.lat || !s.address?.lng) return;
            const rm = classrooms.find(c => c.id === s.classroomId);
            const color = rm?.color || '#3b82f6';
            const icon = L.divIcon({
                className: '',
                html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:bold;">${s.gender === 'ชาย' ? '♂' : '♀'}</div>`,
                iconSize: [28, 28], iconAnchor: [14, 14]
            });

            const guardian = ChilddevDB.getAll('guardians').find(g => g.studentId === s.id);
            const marker = L.marker([s.address.lat, s.address.lng], { icon })
                .bindPopup(`
                    <div style="min-width:200px;font-family:Prompt,sans-serif;">
                        <div style="text-align:center;margin-bottom:8px;">
                            <div style="width:48px;height:48px;border-radius:50%;background:${color};color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:1.5rem;">${s.gender === 'ชาย' ? '👦' : '👧'}</div>
                        </div>
                        <div style="font-weight:700;font-size:14px;text-align:center;">${s.prefix}${s.firstName} ${s.lastName}</div>
                        <div style="font-size:11px;color:#6b7280;text-align:center;margin-bottom:6px;">"${s.nickname}" • ${s.classroom}</div>
                        <hr style="margin:6px 0;border-color:#e5e7eb;">
                        ${guardian ? `<div style="font-size:12px;"><b>ผู้ปกครอง:</b> ${guardian.name}</div>
                        <div style="font-size:12px;"><b>โทร:</b> ${guardian.phone}</div>` : ''}
                        <div style="font-size:12px;"><b>ที่อยู่:</b> ${s.address.houseNo} ม.${s.address.moo} ต.${s.address.tambon}</div>
                        <div style="margin-top:8px;text-align:center;">
                            <a href="https://www.google.com/maps/dir/?api=1&destination=${s.address.lat},${s.address.lng}" target="_blank" style="font-size:12px;color:#1a56db;text-decoration:none;"><i class="fa-solid fa-route"></i> นำทาง Google Maps</a>
                        </div>
                    </div>
                `);
            this.markerGroup.addLayer(marker);
            this.markers.push(marker);
            bounds.push([s.address.lat, s.address.lng]);
        });

        if (bounds.length > 0) {
            this.map.fitBounds(bounds, { padding: [30, 30] });
        }
    },

    search(query, students, classrooms) {
        const q = query.toLowerCase();
        const found = students.filter(s =>
            (s.firstName + s.lastName + s.nickname).toLowerCase().includes(q) && s.address?.lat
        );
        if (found.length > 0) {
            this.loadStudentMarkers(found, classrooms);
        }
        return found;
    }
};
