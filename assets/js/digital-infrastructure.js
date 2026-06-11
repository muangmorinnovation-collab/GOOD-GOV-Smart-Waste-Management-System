/**
 * digital-infrastructure.js — Core DIIS Management Service
 * Smart Governance Municipality Platform
 */

const DigitalInfraService = {
    // === MOCK DATA STORE ===
    mockRoads: [
        { id: '1', road_id: 'ถ.ทถ. 1-0001', road_cl: 'ทางหลวงท้องถิ่นชั้น 3', road_name: 'ถนนบูรพาพัฒนา', road_type: 'ถนนขึ้นทะเบียนทางหลวง', surface_type: 'คอนกรีตเสริมเหล็ก', width: 6, length_m: 1250, village_no: '2', status: 'good', construction_year: 2562, budget_source: 'งบอุดหนุนเฉพาะกิจ', latitude: 17.978, longitude: 103.475, geom: { type: 'LineString', coordinates: [[103.475, 17.978], [103.477, 17.979], [103.479, 17.977]] } },
        { id: '2', road_id: 'ถ.ทถ. 1-0002', road_cl: 'ทางหลวงท้องถิ่นชั้น 4', road_name: 'ซอยสุขใจ 4', road_type: 'ถนนภายในตำบล', surface_type: 'แอสฟัลต์ติก/ลาดยาง', width: 4, length_m: 450, village_no: '3', status: 'fair', construction_year: 2565, budget_source: 'เทศบัญญัติงบประมาณ', latitude: 17.973, longitude: 103.468, geom: { type: 'LineString', coordinates: [[103.468, 17.973], [103.469, 17.971], [103.471, 17.972]] } },
        { id: '3', road_id: 'ถ.ทถ. 1-0003', road_cl: 'ทางหลวงท้องถิ่นชั้น 4', road_name: 'ถนนนาดี-โคกเจริญ', road_type: 'ถนนในแผนพัฒนา', surface_type: 'หินคลุก/ลูกรัง', width: 5, length_m: 2300, village_no: '5', status: 'poor', construction_year: 2560, budget_source: 'งบพัฒนาจังหวัด', latitude: 17.985, longitude: 103.480, geom: { type: 'LineString', coordinates: [[103.480, 17.985], [103.482, 17.983], [103.484, 17.984]] } }
    ],
    mockWater: [
        { id: '1', water_code: 'WR-001', water_name: 'หนองใหญ่พัฒนา', water_type: 'หนอง', surface_area_sqm: 12800, depth_m: 4, capacity_cum: 51200, village_no: '2', status: 'normal', latitude: 17.980, longitude: 103.471 },
        { id: '2', water_code: 'WR-002', water_name: 'สระน้ำหลังโรงเรียน', water_type: 'สระ', surface_area_sqm: 3200, depth_m: 3, capacity_cum: 9600, village_no: '4', status: 'shallow', latitude: 17.971, longitude: 103.479 }
    ],
    mockWaterways: [
        { id: '1', waterway_code: 'WW-01', waterway_name: 'คลองส่งน้ำชลประทาน 1', waterway_type: 'คลองส่งน้ำ', width_m: 3, depth_m: 1.5, length_m: 1800, village_no: '3', status: 'normal', latitude: 17.975, longitude: 103.473 }
    ],
    mockDrainage: [
        { id: '1', asset_id: 'DN-001', drainage_type: 'ฝาท่อระบายน้ำ', material: 'เหล็กหล่อ', width_m: 0.8, depth_m: 1.2, length_m: 0.8, road_id: 'ถ.ทถ. 1-0001', village_no: '2', status: 'good', latitude: 17.9782, longitude: 103.4751 },
        { id: '2', asset_id: 'DN-002', drainage_type: 'รางระบายน้ำ', material: 'คอนกรีต', width_m: 0.5, depth_m: 0.8, length_m: 120, road_id: 'ถ.ทถ. 1-0002', village_no: '3', status: 'clogged', latitude: 17.9731, longitude: 103.4682 }
    ],
    mockPublicLand: [
        { id: '1', land_code: 'PL-01', land_name: 'สวนสุขภาพเฉลิมพระเกียรติ', land_type: 'พื้นที่สีเขียว/สวนสาธารณะ', area_rai: 8, area_ngan: 2, area_sqwa: 40, village_no: '2', status: 'used', current_use: 'นันทนาการและสวนสุขภาพชุมชน', latitude: 17.976, longitude: 103.470 }
    ],
    mockBoundaryMarkers: [
        { id: '1', marker_code: 'BM-01', marker_type: 'หลักเขตตำบล', description: 'หลักปูนกลมสลักอักษรจังหวัด ตั้งอยู่กึ่งกลางสะพานข้ามห้วย', village_no: '1', latitude: 17.992, longitude: 103.485, marker_condition: 'perfect', image_url: '', document_url: '' }
    ],
    mockRepairs: [
        { id: '1', repair_code: 'INF-REP-0001/2569', asset_type: 'ถนน', asset_id: 'ถ.ทถ. 1-0003', damage_detail: 'ผิวจราจรลูกรังเป็นหลุมเป็นบ่อ ลึก 15 ซม. เป็นระยะทาง 50 เมตร', reporter_name: 'นายกานต์ โคกนาดี', reporter_phone: '081-2345678', status: 'pending', budget: 120000, contractor: 'หจก. ทางดีวิศวกรรม', materials_used: [], repair_date: '', staff_name: 'สมคิด การช่าง', latitude: 17.985, longitude: 103.480, created_at: '2026-05-20T10:00:00Z' },
        { id: '2', repair_code: 'INF-REP-0002/2569', asset_type: 'รางระบายน้ำ', asset_id: 'DN-002', damage_detail: 'ตะกอนทรายหนาและวัชพืชอุดตัน ทำให้น้ำไหลช้า น้ำล้นท่วมผิวทางช่วงฝนตกหนัก', reporter_name: 'นางสมศรี สุขใจ', reporter_phone: '089-8765432', status: 'completed', budget: 15000, contractor: 'ดำเนินการเองโดยงานช่าง', materials_used: [], repair_date: '2026-05-22', staff_name: 'วิชัย พาสุข', latitude: 17.9731, longitude: 103.4682, created_at: '2026-05-18T09:30:00Z', image_url_before: 'https://ui-avatars.com/api/?name=Before&background=dc2626&color=fff', image_url_after: 'https://ui-avatars.com/api/?name=After&background=16a34a&color=fff' }
    ],
    mockPermits: [
        { id: '1', permit_code: 'EP-INF-0001/2569', permit_type: 'Building Permit', applicant_name: 'นายสุรชัย เมตตา', applicant_phone: '085-5554433', building_type: 'อาคารพาณิชย์ คสล. 3 ชั้น', address: '124 หมู่ 2 ถนนบูรพาพัฒนา', parcel_id: 'NS3G-1024', latitude: 17.9785, longitude: 103.4752, status: 'approved', document_url: '#', inspection_notes: 'ตรวจสอบโครงสร้างเหล็กและการระยะถอยร่นเป็นไปตามกฎหมายควบคุมอาคาร', created_at: '2026-05-10T08:30:00Z' }
    ],
    mockProposals: [
        { id: '1', proposal_code: 'PROP-2569-001', project_name: 'โครงการก่อสร้างระบบระบายน้ำ คสล. ซอยสุขใจ 4 หมู่ 3', budget_amount: 1500000, boq_detail: [
            { item: 'งานขุดและปรับระดับดิน', qty: 450, unit: 'ลบ.ม.', price: 120, total: 54000 },
            { item: 'รางระบายน้ำคอนกรีตสำเร็จรูป รูปตัว U ขนาด 0.5 เมตร', qty: 900, unit: 'เมตร', price: 1200, total: 1080000 },
            { item: 'งานฝาปิด คสล. และบ่อพักระบายน้ำ ทุก 10 เมตร', qty: 90, unit: 'ชุด', price: 2500, total: 225000 },
            { item: 'งานปรับสภาพผิวทางแอสฟัลต์คืนรูปเดิม', qty: 300, unit: 'ตร.ม.', price: 350, total: 105000 }
        ], cost_estimate: 1464000, project_justification: 'ป้องกันปัญหาน้ำท่วมขังพื้นที่เกษตรและบ้านเรือนราษฎรกว่า 80 ครัวเรือนในซอยสุขใจ 4 ช่วงฤดูฝน', location_map_url: '', photo_urls: [], supporting_documents: [], status: 'finalized', created_at: '2026-05-21T04:15:00Z' }
    ],

    // === LAYER COLORS ===
    LAYER_STYLES: {
        roads: { color: '#dc2626', weight: 4, opacity: 0.8 },
        water: { color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.6, weight: 1.5 },
        waterways: { color: '#0ea5e9', weight: 3, opacity: 0.8 },
        drainage: { color: '#22c55e', weight: 2.5, opacity: 0.7 },
        lighting: { color: '#eab308', radius: 6, fillOpacity: 0.9, weight: 1 },
        publicLand: { color: '#16a34a', fillColor: '#4ade80', fillOpacity: 0.5, weight: 1.5 },
        boundary: { color: '#8b5cf6', weight: 2, dashArray: '6, 6', fill: false },
        markers: { color: '#7c3aed', radius: 5, fillOpacity: 1, weight: 1.5 }
    },

    /**
     * คืนค่าสไตล์ของแนวเส้นทางถนนแบบไดนามิก จำแนกตามประเภทผิวจราจรและแผนพัฒนา
     * @param {Object} road ข้อมูลถนน
     */
    getRoadStyle(road) {
        let color = '#3b82f6'; // สีน้ำเงินมาตรฐาน
        
        if (road.road_type === 'ถนนในแผนพัฒนา') {
            color = '#eab308'; // สีเหลืองสว่างพรีเมียม (Vibrant Golden Yellow)
        } else {
            const surface = road.surface_type || '';
            if (surface.includes('คอนกรีตเสริมเหล็ก')) {
                color = '#0ea5e9'; // สีฟ้าสว่าง (Bright Sky Blue)
            } else if (surface.includes('แอสฟัลต์ติก') || surface.includes('ลาดยาง')) {
                color = '#10b981'; // สีเขียวมรกต (Emerald Green)
            } else if (surface.includes('หินคลุก') || surface.includes('ลูกรัง')) {
                color = '#f97316'; // สีส้มแดงลูกรัง (Vibrant Laterite Orange)
            } else {
                color = '#8b5cf6'; // สีม่วงสำหรับอื่นๆ (Purple)
            }
        }
        
        return {
            color: color,
            weight: 5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
        };
    },

    // === INITS & LOADERS (Supabase Wrapper with Mock Fallbacks) ===
    async getRoads() {
        if (typeof GISSpatialService !== 'undefined') {
            return await GISSpatialService.loadRoads();
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_roads').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockRoads;
    },

    async getWater() {
        if (typeof WaterSpatialService !== 'undefined') {
            return await WaterSpatialService.loadAssets('res');
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_water_resources').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockWater;
    },

    async getWaterways() {
        if (typeof WaterSpatialService !== 'undefined') {
            return await WaterSpatialService.loadAssets('way');
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_waterways').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockWaterways;
    },

    async getDrainage() {
        if (typeof WaterSpatialService !== 'undefined') {
            return await WaterSpatialService.loadAssets('drain');
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_drainage_assets').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockDrainage;
    },

    async getPublicLand() {
        if (typeof PublicLandSpatialService !== 'undefined') {
            return await PublicLandSpatialService.loadPublicLands();
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_public_lands').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockPublicLand;
    },

    async getBoundaryMarkers() {
        if (typeof BoundarySpatialService !== 'undefined') {
            return await BoundarySpatialService.loadMarkers();
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_boundary_markers').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockBoundaryMarkers;
    },

    async getRepairs() {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_repairs').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockRepairs;
    },

    async getPermits() {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_permits').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockPermits;
    },

    async getProposals() {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const { data, error } = await supabaseClient.from('infra_grant_proposals').select('*').order('created_at', { ascending: false });
            if (!error && data) return data;
        }
        return this.mockProposals;
    },

    // === SAVE METHODS ===
    async saveRoad(road) {
        if (typeof GISSpatialService !== 'undefined') {
            return await GISSpatialService.saveGeometry(road);
        }
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const isNew = !road.id;
            const action = isNew 
                ? supabaseClient.from('infra_roads').insert([road])
                : supabaseClient.from('infra_roads').update(road).eq('id', road.id);
            const { data, error } = await action.select();
            if (error) throw error;
            return data[0];
        } else {
            if (!road.id) {
                road.id = String(this.mockRoads.length + 1);
                this.mockRoads.push(road);
            } else {
                const idx = this.mockRoads.findIndex(r => r.id === road.id);
                if (idx !== -1) this.mockRoads[idx] = road;
            }
            return road;
        }
    },

    async saveRepair(rep) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const isNew = !rep.id;
            if (isNew) delete rep.repair_code;
            const action = isNew 
                ? supabaseClient.from('infra_repairs').insert([rep])
                : supabaseClient.from('infra_repairs').update(rep).eq('id', rep.id);
            const { data, error } = await action.select();
            if (error) throw error;
            return data[0];
        } else {
            if (!rep.id) {
                rep.id = String(this.mockRepairs.length + 1);
                rep.repair_code = `INF-REP-${String(this.mockRepairs.length+1).padStart(4,'0')}/2569`;
                rep.created_at = new Date().toISOString();
                this.mockRepairs.push(rep);
            } else {
                const idx = this.mockRepairs.findIndex(r => r.id === rep.id);
                if (idx !== -1) this.mockRepairs[idx] = { ...this.mockRepairs[idx], ...rep };
            }
            return rep;
        }
    },

    async savePermit(pmt) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const isNew = !pmt.id;
            if (isNew) delete pmt.permit_code;
            const action = isNew 
                ? supabaseClient.from('infra_permits').insert([pmt])
                : supabaseClient.from('infra_permits').update(pmt).eq('id', pmt.id);
            const { data, error } = await action.select();
            if (error) throw error;
            return data[0];
        } else {
            if (!pmt.id) {
                pmt.id = String(this.mockPermits.length + 1);
                pmt.permit_code = `EP-INF-${String(this.mockPermits.length+1).padStart(4,'0')}/2569`;
                pmt.created_at = new Date().toISOString();
                this.mockPermits.push(pmt);
            } else {
                const idx = this.mockPermits.findIndex(p => p.id === pmt.id);
                if (idx !== -1) this.mockPermits[idx] = { ...this.mockPermits[idx], ...pmt };
            }
            return pmt;
        }
    },

    async saveProposal(prop) {
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            const isNew = !prop.id;
            const action = isNew 
                ? supabaseClient.from('infra_grant_proposals').insert([prop])
                : supabaseClient.from('infra_grant_proposals').update(prop).eq('id', prop.id);
            const { data, error } = await action.select();
            if (error) throw error;
            return data[0];
        } else {
            if (!prop.id) {
                prop.id = String(this.mockProposals.length + 1);
                prop.created_at = new Date().toISOString();
                this.mockProposals.push(prop);
            } else {
                const idx = this.mockProposals.findIndex(p => p.id === prop.id);
                if (idx !== -1) this.mockProposals[idx] = { ...this.mockProposals[idx], ...prop };
            }
            return prop;
        }
    },

    // === AI ENGINEERING ASSISTANT INTEGRATION ===
    aiAnalyze(requestType, payload) {
        // กฎการจำลองสมองกลวิศวกรส่วนท้องถิ่น (Local Engineering Expert Rules)
        const timestamp = new Date().toLocaleTimeString('th-TH');
        
        switch (requestType) {
            case 'road_scoring':
                // ประเมินคะแนนสภาพถนน
                const r = payload;
                let score = 95;
                let remarks = [];
                if (r.status === 'poor') { score -= 40; remarks.push('ผิวทางชำรุดหนักเป็นหลุมบ่อ'); }
                if (r.status === 'fair') { score -= 15; remarks.push('ผิวทางชำรุดเล็กน้อยหรือแตกลายงา'); }
                if (r.surface_type === 'หินคลุก/ลูกรัง') { score -= 20; remarks.push('สภาพทางไม่มีการก่อสร้างรองรับแรงเฉือนสูง'); }
                if (r.length_m > 2000 && r.width < 5) { score -= 10; remarks.push('รูปทรงแคบและยาว ความหนาแน่นจราจรอาจล้นไหล่ทาง'); }
                
                return {
                    success: true,
                    timestamp,
                    result: {
                        score: Math.max(10, score),
                        grade: score >= 80 ? 'A (ดีเยี่ยม)' : score >= 60 ? 'B (ดี)' : score >= 40 ? 'C (ปานกลาง)' : 'D (ชำรุดควรซ่อมด่วน)',
                        recommendation: score < 50 
                            ? '🚨 แนะนำจัดทำบรรจุเข้าแผนพัฒนา 3 ปี และเสนอขอ "งบอุดหนุนเฉพาะกิจ" เพื่อยกระดับผิวทางเป็นคอนกรีตเสริมเหล็ก คสล. โดยทันที'
                            : '🟢 อยู่ในสภาพใช้งานได้ดี แนะนำวางระบบตรวจสอบการอุดตันของรางระบายน้ำสองข้างทางตามรอบ 6 เดือน',
                        reasons: remarks
                    }
                };
                
            case 'maintenance_predict':
                // พยากรณ์รอบการซ่อมแซมและบำรุงล่วงหน้า
                const age = payload.construction_year ? (2569 - payload.construction_year) : 5;
                const roadType = payload.surface_type || 'คอนกรีตเสริมเหล็ก';
                let decayRate = 3.5; // เปอร์เซ็นต์ความเสื่อมต่อปี
                if (roadType === 'หินคลุก/ลูกรัง') decayRate = 15;
                else if (roadType === 'แอสฟัลต์ติก/ลาดยาง') decayRate = 6.5;

                const expectedLife = roadType === 'คอนกรีตเสริมเหล็ก' ? 20 : roadType === 'แอสฟัลต์ติก/ลาดยาง' ? 10 : 3;
                const remainingLife = Math.max(0, expectedLife - age);
                const threatIndex = Math.min(100, Math.round((age / expectedLife) * 100));

                return {
                    success: true,
                    timestamp,
                    result: {
                        age_years: age,
                        expected_lifespan: expectedLife,
                        remaining_years: remainingLife,
                        threat_index: `${threatIndex}%`,
                        next_action_year: 2569 + Math.round(remainingLife),
                        risk_level: threatIndex >= 80 ? 'วิกฤต (High Risk)' : threatIndex >= 50 ? 'ปานกลาง (Medium Risk)' : 'ต่ำ (Low Risk)',
                        forecast_text: threatIndex >= 80
                            ? `⚠️ คาดการณ์ว่าถนน ${payload.road_name} มีอายุงานใกล้เคียงขีดจำกัดสูงสุดแล้ว สภาพทางจะเสื่อมโทรมทวีคูณในช่วงฤดูมรสุมที่จะถึงนี้ ควรซ่อมแซมใหญ่ภายในปีนี้`
                            : `✅ ถนนยังคงอยู่ในระยะการรักษาเสถียรภาพ คาดการณ์กำหนดการขูดลอกปูผิวหน้าใหม่ (Overlay) ในปี พ.ศ. ${2569 + Math.round(remainingLife)}`
                    }
                };

            case 'budget_optimization':
                // แนะนำความเร่งด่วนในการกระจายงบประมาณ
                const proposals = payload || [];
                if (!proposals.length) return { success: false, text: 'ไม่พบรายการคำเสนอโครงการเพื่อทำการคำนวณสัดส่วนงบประมาณ' };
                
                const analyzedProposals = proposals.map(p => {
                    let priorityScore = 50;
                    let desc = '';
                    if (p.project_name.includes('ระบายน้ำ') || p.project_name.includes('น้ำท่วม')) {
                        priorityScore += 30;
                        desc += '+30 (ป้องกันอุทกภัยชุมชน/ความเดือดร้อนฉับพลัน) ';
                    }
                    if (p.budget_amount < 500000) {
                        priorityScore += 10;
                        desc += '+10 (ขนาดงบประมาณเหมาะสมอนุมัติเร็ว) ';
                    } else if (p.budget_amount > 2000000) {
                        priorityScore -= 10;
                        desc += '-10 (วงเงินขนาดใหญ่ควรแบ่งเฟส) ';
                    }
                    if (p.project_justification && p.project_justification.length > 50) {
                        priorityScore += 10;
                        desc += '+10 (ข้อมูลหลักการความคุ้มค่าครบถ้วน)';
                    }
                    return {
                        id: p.id,
                        project_name: p.project_name,
                        budget: p.budget_amount,
                        score: priorityScore,
                        score_reasons: desc,
                        priority_rank: priorityScore >= 80 ? 'เร่งด่วนสูงสุด (Rank A)' : priorityScore >= 65 ? 'เร่งด่วนปานกลาง (Rank B)' : 'ลำดับรอง (Rank C)'
                    };
                });
                
                // จัดอันดับตามคะแนนความเร่งด่วน
                analyzedProposals.sort((a,b) => b.score - a.score);

                return {
                    success: true,
                    timestamp,
                    result: {
                        total_budget_requested: proposals.reduce((acc,curr) => acc + curr.budget_amount, 0),
                        prioritized_list: analyzedProposals,
                        policy_recommendation: '💡 ข้อเสนอเชิงนโยบาย: งบประมาณเงินอุดหนุนเฉพาะกิจในปีนี้ควรเน้นจัดสรรไปที่ระบบระบายน้ำและการยกระดับเส้นทางสัญจรในหมู่บ้านที่มีประชากรหนาแน่นสูงก่อน เพื่อให้สอดคล้องกับดัชนีร้องเรียนสะสมในระบบร้องทุกข์ของสำนักปลัด'
                    }
                };

            default:
                return { success: false, text: 'คำขอประมวลผลระบบไม่ถูกต้อง' };
        }
    }
};

// ส่งออกเข้า Window Context สำหรับการเรียกใช้นอกโมดูล
window.DigitalInfraService = DigitalInfraService;
console.log("DIIS Core Service Loaded with Mock Database & AI Module.");
