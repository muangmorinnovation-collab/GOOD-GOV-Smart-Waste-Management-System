/**
 * secretary-cctv.js - CCTV Management Logic
 * Smart Governance Municipality Platform
 */

class SecretaryCCTVService {
    constructor() {
        this.client = window.supabaseClient;
    }

    /**
     * ดึงข้อมูลทะเบียนกล้อง CCTV ทั้งหมด
     */
    async getCameras() {
        if (!this.client) return this.getMockCameras();
        try {
            const { data, error } = await this.client
                .from('cctv_registry')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error("Error loading CCTV camera list:", err);
            return this.getMockCameras();
        }
    }

    /**
     * ดึงประวัติการจองหรือซ่อมบำรุงกล้อง CCTV
     */
    async saveCameraMaintenance(cameraId, reportText, status, responsibleOfficer) {
        if (!this.client) {
            console.log("Mock maintenance saved for:", cameraId, reportText, status);
            return { success: true };
        }
        try {
            // โหลดข้อมูลเดิมเพื่อดึงประวัติ JSON
            const { data: cam, error: fetchErr } = await this.client
                .from('cctv_registry')
                .select('maintenance_history')
                .eq('id', cameraId)
                .single();
            if (fetchErr) throw fetchErr;

            const history = cam.maintenance_history || [];
            const logEntry = {
                date: new Date().toISOString().split('T')[0],
                report: reportText,
                officer: responsibleOfficer || 'ช่างกล้องเทศบาล'
            };
            history.push(logEntry);

            const { error: updateErr } = await this.client
                .from('cctv_registry')
                .update({
                    maintenance_history: history,
                    status: status,
                    updated_at: new Date()
                })
                .eq('id', cameraId);
            if (updateErr) throw updateErr;

            return { success: true };
        } catch (err) {
            console.error("Error updating CCTV maintenance history:", err);
            return { error: err };
        }
    }

    // ==========================================
    // MOCK DATA GENERATORS (UI Resiliency)
    // ==========================================
    getMockCameras() {
        return [
            {
                id: "cam-1",
                name: "กล้องแยกตลาดเทศบาล 01",
                location_name: "หน้าประตูหลักตลาดสดเทศบาล",
                latitude: 13.736000,
                longitude: 100.523000,
                ip_address: "192.168.10.201",
                stream_url: "https://demo.unified-streaming.com/kaltura/cast/hevc/master.m3u8",
                department: "สำนักปลัด",
                status: "Online",
                responsible_officer: "นายประพันธ์ กล้องส่อง",
                maintenance_history: [
                    { date: "2026-05-10", report: "ขัดคราบฝุ่นเลนส์ภายนอกและกวดขันขายึดให้แน่นหนา", officer: "นายประพันธ์ กล้องส่อง" }
                ]
            },
            {
                id: "cam-2",
                name: "กล้องหน้าสำนักงานเทศบาล 02",
                location_name: "เสาไฟหน้าเสาธงอาคารสำนักงานใหญ่",
                latitude: 13.737500,
                longitude: 100.524200,
                ip_address: "192.168.10.202",
                stream_url: "https://demo.unified-streaming.com/kaltura/cast/hevc/master.m3u8",
                department: "สำนักปลัด",
                status: "Online",
                responsible_officer: "นายประพันธ์ กล้องส่อง",
                maintenance_history: []
            },
            {
                id: "cam-3",
                name: "กล้องสามแยกโรงเรียนเทศบาล 03",
                location_name: "หน้าสามแยกโรงเรียนเทศบาลวัดมหาธาตุ",
                latitude: 13.735100,
                longitude: 100.521800,
                ip_address: "192.168.10.203",
                stream_url: "https://demo.unified-streaming.com/kaltura/cast/hevc/master.m3u8",
                department: "สำนักปลัด",
                status: "Offline",
                responsible_officer: "นายสุทิน เลนส์ใส",
                maintenance_history: [
                    { date: "2026-05-22", report: "พบไฟตก อุปกรณ์ขัดข้องรอจัดสรรโมเด็มอินเตอร์เน็ตทดแทน", officer: "นายสุทิน เลนส์ใส" }
                ]
            }
        ];
    }
}

window.secretaryCCTVService = new SecretaryCCTVService();
