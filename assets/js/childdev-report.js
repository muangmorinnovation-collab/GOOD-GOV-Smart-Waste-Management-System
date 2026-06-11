/**
 * childdev-report.js — Report Generation Module
 */

const ReportModule = {
    generateAttendanceReport(students, attendance, dateFrom, dateTo, roomFilter) {
        let att = attendance.filter(a => a.date >= dateFrom && a.date <= dateTo);
        if (roomFilter) {
            const roomStudents = students.filter(s => s.classroomId === roomFilter).map(s => s.id);
            att = att.filter(a => roomStudents.includes(a.studentId));
        }
        const present = att.filter(a => a.status === 'มาเรียน').length;
        const late = att.filter(a => a.status === 'มาสาย').length;
        const absent = att.filter(a => a.status === 'ขาดเรียน').length;
        const sick = att.filter(a => a.status === 'ลาป่วย').length;
        return { total: att.length, present, late, absent, sick, records: att };
    },

    generateHealthReport(students, health, dateFrom, dateTo, roomFilter) {
        let h = health.filter(r => r.date >= dateFrom && r.date <= dateTo);
        if (roomFilter) {
            const roomStudents = students.filter(s => s.classroomId === roomFilter).map(s => s.id);
            h = h.filter(r => roomStudents.includes(r.studentId));
        }
        return {
            total: h.length,
            milk: h.filter(r => r.milk).length,
            brush: h.filter(r => r.brushTeeth).length,
            fever: h.filter(r => r.hasFever).length,
            sick: h.filter(r => r.sickSymptoms).length,
            records: h
        };
    },

    generateBMIReport(students, roomFilter) {
        let s = students.filter(st => st.status === 'กำลังศึกษา');
        if (roomFilter) s = s.filter(st => st.classroomId === roomFilter);
        const results = s.map(st => ({ ...st, bmi: childdevCalcBMI(st.weight, st.height) }));
        return {
            total: results.length,
            thin: results.filter(r => r.bmi.status === 'ผอม').length,
            normal: results.filter(r => r.bmi.status === 'ปกติ').length,
            chubby: results.filter(r => r.bmi.status === 'ท้วม').length,
            obese: results.filter(r => r.bmi.status === 'อ้วน').length,
            records: results
        };
    },

    getDateRange(period) {
        const now = new Date();
        const today = childdevGetTodayStr();
        let from = today, to = today;
        if (period === 'week') {
            const d = new Date(now); d.setDate(d.getDate() - 7);
            from = d.toISOString().split('T')[0];
        } else if (period === 'month') {
            from = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
        } else if (period === 'year') {
            from = `${now.getFullYear()}-01-01`;
        }
        return { from, to };
    },

    printReport(title, content) {
        const win = window.open('', '_blank');
        win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
            <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;600;700&display=swap" rel="stylesheet">
            <style>body{font-family:'Prompt',sans-serif;padding:2rem;color:#1f2937;}
            table{width:100%;border-collapse:collapse;margin-top:1rem;}
            th,td{padding:8px 12px;border:1px solid #e5e7eb;font-size:13px;}
            th{background:#f9fafb;font-weight:600;}
            h2{color:#1a56db;} .text-right{text-align:right;}</style>
        </head><body>${content}</body></html>`);
        win.document.close();
        win.print();
    }
};
