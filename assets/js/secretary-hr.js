/**
 * secretary-hr.js - HR, Attendance, Leave and Vehicle Logic
 * Smart Governance Municipality Platform
 */

class SecretaryHRService {
    constructor() {
        this.client = window.supabaseClient;
    }

    // ==========================================
    // 1. FACE ATTENDANCE SYSTEM
    // ==========================================
    async getDailyAttendance(dateStr) {
        const date = dateStr || new Date().toISOString().split('T')[0];
        if (!this.client) return this.getMockAttendance(date);
        try {
            const { data, error } = await this.client
                .from('staff_attendance')
                .select('*')
                .eq('date', date);
            if (error) throw error;
            return data;
        } catch (err) {
            console.error("Error loading attendance:", err);
            return this.getMockAttendance(date);
        }
    }

    async registerFaceDescriptor(staffId, faceDescriptorArray, enrollmentPhotoUrl) {
        const payload = {
            staff_id: staffId,
            face_descriptor: faceDescriptorArray,
            enrollment_photo_url: enrollmentPhotoUrl
        };
        if (!this.client) {
            console.log("Mock face registered for:", staffId);
            return { data: payload, error: null };
        }
        return await this.client.from('staff_face_registrations').insert([payload]);
    }

    async checkInFace(staffId, staffName, photoBase64) {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];
        const dateStr = now.toISOString().split('T')[0];
        
        // เวลาเข้างานราชการคือ 08:30 น.
        const officialInTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30, 0);
        let status = 'ปกติ';
        let lateMinutes = 0;
        if (now > officialInTime) {
            status = 'สาย';
            lateMinutes = Math.floor((now - officialInTime) / 60000);
        }

        const payload = {
            staff_id: staffId,
            staff_name: staffName,
            date: dateStr,
            check_in: now.toISOString(),
            check_in_photo_url: photoBase64 || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
            status: status,
            late_minutes: lateMinutes
        };

        if (!this.client) {
            console.log("Mock Face Check-in:", payload);
            return { data: payload, error: null };
        }

        try {
            // ลอง upsert ข้อมูลกรณีมีการเช็คอินซ้ำในวัน
            const { data, error } = await this.client
                .from('staff_attendance')
                .upsert([payload], { onConflict: 'staff_id, date' });
            if (error) throw error;

            // บันทึกลงปฏิทินหากสแกนเข้างาน
            await this.logCalendarEvent(`เช็คอินเข้างาน: ${staffName}`, `เข้างานเวลา ${timeStr} น. สถานะ: ${status}`, now.toISOString(), now.toISOString(), 'เข้างาน', staffId, '#057a55');

            return { data, error: null };
        } catch (err) {
            console.error("Error scanning face:", err);
            return { error: err };
        }
    }

    async checkOutFace(staffId, staffName, photoBase64) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];

        const payload = {
            check_out: now.toISOString(),
            check_out_photo_url: photoBase64 || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
        };

        if (!this.client) {
            console.log("Mock Face Check-out:", payload);
            return { data: payload, error: null };
        }

        try {
            const { data, error } = await this.client
                .from('staff_attendance')
                .update(payload)
                .match({ staff_id: staffId, date: dateStr });
            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            console.error("Error scanning check-out face:", err);
            return { error: err };
        }
    }

    // ==========================================
    // 2. ONLINE LEAVE SYSTEM
    // ==========================================
    async getLeaveHistory(staffId) {
        let query = this.client ? this.client.from('staff_leaves').select('*') : null;
        if (this.client && staffId) {
            query = query.eq('staff_id', staffId);
        }
        if (!this.client) return this.getMockLeaves(staffId);
        try {
            const { data, error } = await query.order('start_date', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error("Error loading leave list:", err);
            return this.getMockLeaves(staffId);
        }
    }

    async getLeaveBalance(staffId) {
        if (!this.client) return this.getMockLeaveBalance(staffId);
        try {
            const { data, error } = await this.client
                .from('leave_balances')
                .select('*')
                .eq('staff_id', staffId)
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error("Error loading leave balances:", err);
            return this.getMockLeaveBalance(staffId);
        }
    }

    async submitLeaveRequest(staffId, staffName, leaveType, startDateStr, endDateStr, reason, address, fileUrl, signatureBase64) {
        const start = new Date(startDateStr);
        const end = new Date(endDateStr);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // นับวันรวมสะสม

        const payload = {
            staff_id: staffId,
            staff_name: staffName,
            leave_type: leaveType,
            start_date: startDateStr,
            end_date: endDateStr,
            total_days: diffDays,
            reason: reason,
            contact_address: address,
            file_url: fileUrl,
            signature_url: signatureBase64,
            status: 'เสนอปลัด'
        };

        if (!this.client) {
            console.log("Mock leave submitted:", payload);
            return { data: payload, error: null };
        }

        try {
            const { data, error } = await this.client.from('staff_leaves').insert([payload]).select();
            if (error) throw error;

            // บันทึกลงตารางปฏิทินกลาง
            await this.logCalendarEvent(`ลางาน (${leaveType}): ${staffName}`, `ลาติดต่อกัน ${diffDays} วันเนื่องจาก ${reason}`, startDateStr, endDateStr, 'วันลา', data[0].id, '#ef4444');

            return { data, error: null };
        } catch (err) {
            console.error("Error submitting leave form:", err);
            return { error: err };
        }
    }

    // ==========================================
    // 3. DAILY WORK LOG (CONTRACTOR WORK LOG)
    // ==========================================
    async getDailyWorkLogs(staffId) {
        let query = this.client ? this.client.from('daily_work_logs').select('*') : null;
        if (this.client && staffId) {
            query = query.eq('staff_id', staffId);
        }
        if (!this.client) return this.getMockWorkLogs(staffId);
        try {
            const { data, error } = await query.order('work_date', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error("Error fetching daily work logs:", err);
            return this.getMockWorkLogs(staffId);
        }
    }

    async submitWorkLog(staffId, staffName, dateStr, tasks, times, photoUrl, fileUrl) {
        const payload = {
            staff_id: staffId,
            staff_name: staffName,
            work_date: dateStr,
            tasks_performed: tasks,
            time_spent: times,
            photo_url: photoUrl,
            attachment_url: fileUrl,
            status: 'รอตรวจ'
        };

        if (!this.client) {
            console.log("Mock Daily Log submitted:", payload);
            return { data: payload, error: null };
        }

        try {
            const { data, error } = await this.client.from('daily_work_logs').insert([payload]);
            if (error) throw error;
            return { data, error: null };
        } catch (err) {
            console.error("Error submitting daily work log:", err);
            return { error: err };
        }
    }

    // ==========================================
    // 4. CENTRAL CALENDAR INTEGRATOR
    // ==========================================
    async logCalendarEvent(title, desc, start, end, type, sourceId, colorHex) {
        const payload = {
            title: title,
            description: desc,
            start_date: start,
            end_date: end,
            event_type: type,
            source_id: sourceId,
            color_hex: colorHex || '#3b82f6'
        };
        if (!this.client) {
            console.log("Mock calendar log:", payload);
            return;
        }
        await this.client.from('org_calendar_events').insert([payload]);
    }

    async getCalendarEvents() {
        if (!this.client) return this.getMockCalendarEvents();
        try {
            const { data, error } = await this.client
                .from('org_calendar_events')
                .select('*')
                .order('start_date', { ascending: true });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error("Error loading calendar events:", err);
            return this.getMockCalendarEvents();
        }
    }

    // ==========================================
    // MOCK DATA GENERATORS (UI Resiliency)
    // ==========================================
    async getMonthlyAttendanceSummary(yearMonthStr) {
        // yearMonthStr e.g. "2026-05"
        if (!this.client) return this.getMockMonthlySummary(yearMonthStr);
        
        try {
            // Real implementation would group by staff and sum stats. 
            // Since Supabase RPC might be needed for group by, we fetch and aggregate client-side for now.
            const { data, error } = await this.client
                .from('staff_attendance')
                .select('*')
                .like('date', `${yearMonthStr}%`);
                
            if (error) throw error;
            
            const summary = {};
            data.forEach(row => {
                if (!summary[row.staff_id]) {
                    summary[row.staff_id] = {
                        staff_id: row.staff_id,
                        staff_name: row.staff_name,
                        total_present: 0,
                        total_late: 0,
                        total_leave: 0 // Would come from leaves table normally
                    };
                }
                summary[row.staff_id].total_present += 1;
                if (row.status === 'สาย') summary[row.staff_id].total_late += 1;
            });
            
            return Object.values(summary);
            
        } catch (err) {
            console.error("Error loading monthly summary:", err);
            return this.getMockMonthlySummary(yearMonthStr);
        }
    }

    getMockMonthlySummary(yearMonth) {
        return [
            { staff_id: "s1", staff_name: "นายทนงศักดิ์ รักไทย", total_present: 20, total_late: 1, total_leave: 2 },
            { staff_id: "s2", staff_name: "น.ส.ดวงใจ งามดี", total_present: 19, total_late: 4, total_leave: 0 },
            { staff_id: "s3", staff_name: "นายบรรเจิด เกียรติกร", total_present: 22, total_late: 0, total_leave: 0 },
            { staff_id: "s4", staff_name: "นายปิติ สู้ชีวิต", total_present: 21, total_late: 2, total_leave: 1 }
        ];
    }

    getMockAttendance(date) {
        return [
            { id: "att-1", staff_id: "s1", staff_name: "นายทนงศักดิ์ รักไทย", date: date, check_in: `${date}T08:15:00Z`, check_out: `${date}T16:35:00Z`, status: "ปกติ", late_minutes: 0 },
            { id: "att-2", staff_id: "s2", staff_name: "น.ส.ดวงใจ งามดี", date: date, check_in: `${date}T08:48:00Z`, check_out: null, status: "สาย", late_minutes: 18 },
            { id: "att-3", staff_id: "s3", staff_name: "นายบรรเจิด เกียรติกร", date: date, check_in: `${date}T08:24:00Z`, check_out: null, status: "ปกติ", late_minutes: 0 }
        ];
    }

    getMockLeaves(staffId) {
        return [
            { id: "l1", staff_id: staffId || "s1", staff_name: "นายทนงศักดิ์ รักไทย", leave_type: "ลาป่วย", start_date: "2026-05-10", end_date: "2026-05-12", total_days: 3, reason: "มีไข้หวัดใหญ่ แพทย์สั่งหยุดตรวจเช็คความดัน", status: "นายกอนุมัติ", approver_name: "นายกเทศมนตรี" },
            { id: "l2", staff_id: staffId || "s1", staff_name: "นายทนงศักดิ์ รักไทย", leave_type: "ลากิจ", start_date: "2026-05-22", end_date: "2026-05-22", total_days: 1, reason: "ติดต่อทำธุรกรรมที่ดินมรดกครอบครัว", status: "เสนอปลัด", approver_name: null }
        ];
    }

    getMockLeaveBalance(staffId) {
        return {
            id: "bal-1",
            staff_id: staffId || "s1",
            year: 2569,
            sick_taken: 3,
            sick_limit: 30,
            personal_taken: 1,
            personal_limit: 45,
            vacation_taken: 0,
            vacation_limit: 10,
            vacation_carried: 5,
            maternity_taken: 0,
            maternity_limit: 90
        };
    }

    getMockWorkLogs(staffId) {
        return [
            { id: "w1", staff_id: staffId || "s4", staff_name: "นายปิติ สู้ชีวิต", work_date: "2026-05-24", tasks_performed: "จัดเอกสารเสนอแฟ้มสารบรรณหน้าห้องปลัด กวาดลานอเนกประสงค์ต้อนรับคณะเทศบาลดูงาน และพิมพ์เอกสารราชการทั่วไป", time_spent: "08:30 - 16:30 น.", status: "รอตรวจ", supervisor_comment: "" },
            { id: "w2", staff_id: staffId || "s4", staff_name: "นายปิติ สู้ชีวิต", work_date: "2026-05-23", tasks_performed: "ตัดกิ่งไม้ริมรั้วประตูหลังเทศบาลเพื่อความปลอดภัยสายส่องสว่าง CCTV และขัดล้างรถตู้วราชการ กค-8888", time_spent: "08:30 - 16:30 น.", status: "ตรวจเสร็จแล้ว", supervisor_comment: "ผลงานดี ทำงานเรียบร้อยเป็นระเบียบ" }
        ];
    }

    getMockCalendarEvents() {
        return [
            { id: "c1", title: "ประชุมสภาสัญจร ประจำสัปดาห์", description: "วาระวางแผนระบายน้ำรับมือหน้าฝน", start_date: "2026-05-24T09:00:00Z", end_date: "2026-05-24T12:00:00Z", event_type: "ประชุม", color_hex: "#d97706" },
            { id: "c2", title: "ลากิจ: นายทนงศักดิ์ รักไทย", description: "ติดต่อทำธุรกรรมโอนที่ดิน", start_date: "2026-05-26T00:00:00Z", end_date: "2026-05-26T23:59:59Z", event_type: "วันลา", color_hex: "#ef4444" },
            { id: "c3", title: "ขอใช้รถราชการ: ไปอำเภอจัดประชุม", description: "รถกะบะ กข-1234 อนุมัติการออกเดิน", start_date: "2026-05-24T13:30:00Z", end_date: "2026-05-24T16:30:00Z", event_type: "ภารกิจภาคสนาม", color_hex: "#3b82f6" },
            { id: "c4", title: "วันวิสาขบูชา", description: "วันหยุดราชการประจำปี", start_date: "2026-05-20T00:00:00Z", end_date: "2026-05-20T23:59:59Z", event_type: "วันหยุดราชการ", color_hex: "#10b981" }
        ];
    }
}

window.secretaryHRService = new SecretaryHRService();
