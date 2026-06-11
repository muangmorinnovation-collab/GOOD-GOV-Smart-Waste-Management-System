/**
 * childdev.js — Shared Data Layer & Utilities
 * ระบบการจัดการศูนย์พัฒนาเด็กเล็ก
 * Smart Governance Municipality Platform
 */

// =============================================
// DATABASE KEYS
// =============================================
const CHILDDEV_KEYS = {
    students: 'childdev_students',
    guardians: 'childdev_guardians',
    attendance: 'childdev_attendance',
    faceData: 'childdev_face_data',
    health: 'childdev_health',
    lunch: 'childdev_lunch',
    activities: 'childdev_activities',
    classrooms: 'childdev_classrooms',
    bmi: 'childdev_bmi',
    reports: 'childdev_reports',
    drafts: 'childdev_drafts'
};

// =============================================
// MOCK CLASSROOMS
// =============================================
const MOCK_CLASSROOMS = [
    { id: 'C001', name: 'อนุบาล 1/1', level: 'อนุบาล 1', teacher: 'ครูสมใจ รักเด็ก', teacherPhone: '081-234-5601', color: '#3b82f6', capacity: 25, icon: '🌻' },
    { id: 'C002', name: 'อนุบาล 1/2', level: 'อนุบาล 1', teacher: 'ครูวิไล ใจดี', teacherPhone: '081-234-5602', color: '#10b981', capacity: 25, icon: '🌈' },
    { id: 'C003', name: 'อนุบาล 2/1', level: 'อนุบาล 2', teacher: 'ครูพรทิพย์ สุขสันต์', teacherPhone: '081-234-5603', color: '#f59e0b', capacity: 25, icon: '⭐' },
    { id: 'C004', name: 'อนุบาล 2/2', level: 'อนุบาล 2', teacher: 'ครูนภา แสงจันทร์', teacherPhone: '081-234-5604', color: '#ef4444', capacity: 25, icon: '🎨' },
    { id: 'C005', name: 'อนุบาล 3/1', level: 'อนุบาล 3', teacher: 'ครูมณี ศรีสุข', teacherPhone: '081-234-5605', color: '#8b5cf6', capacity: 25, icon: '🚀' },
    { id: 'C006', name: 'อนุบาล 3/2', level: 'อนุบาล 3', teacher: 'ครูดวงใจ พัฒนา', teacherPhone: '081-234-5606', color: '#ec4899', capacity: 25, icon: '🌟' }
];

// =============================================
// MOCK STUDENTS (50+)
// =============================================
const FIRST_NAMES_BOY = ['กิตติ','ธนกร','ภูมิ','พีรพัฒน์','ณัฐวุฒิ','อภิชาติ','สิทธิชัย','วรากร','จิรายุ','ปัณณวิชญ์','ศุภกิจ','พชร','ธีรดนย์','กันตพงศ์','ภัทรพล','เมธา','อนุชา','ศรัณย์','ณภัทร','สุรเชษฐ์','ธนวัฒน์','กรวิชญ์','ชยพล','ไกรวิชญ์','ปภาวิน'];
const FIRST_NAMES_GIRL = ['ปภาวรินทร์','ณัฐธิดา','พิมพ์ลภัส','กัญญาณัฐ','ชนิสรา','สุภาวดี','ธัญชนก','ปราณี','อารียา','วรรณิศา','นภัสสร','ภัทราพร','ธนพร','กมลชนก','ศิริรัตน์','พรรณวดี','จิดาภา','สุชาดา','อรพรรณ','มนัสนันท์','พิชญาภา','ชลธิชา','กนกวรรณ','ปวีณา','ณิชา'];
const LAST_NAMES = ['สุขสันต์','ใจดี','มีสุข','รุ่งเรือง','ศรีสวัสดิ์','พัฒนา','วงศ์ดี','สมบูรณ์','ประเสริฐ','ทองดี','แสงทอง','มงคล','เจริญสุข','รักษา','วิไลลักษณ์','ศักดิ์สิทธิ์','อุดมสุข','บุญมี','พิทักษ์','สวัสดี','นิยม','สายทอง','รักไทย','ดำรงค์','สันติ'];
const NICKNAMES_BOY = ['ปอนด์','กัน','ภู','ต้น','นัท','เก่ง','บอส','มาร์ค','เจ','ไอซ์','แบงค์','พี','ฟลุ๊ค','เอิร์ธ','บิ๊ก','กาย','โอม','อาร์ม','ฟิล์ม','เบนซ์','แม็ค','กร','บีม','ปลื้ม','แทน'];
const NICKNAMES_GIRL = ['มิ้นท์','ฝ้าย','แพร','ใบเตย','น้ำ','ปิ่น','เบล','มุก','จูน','แก้ม','พลอย','ไอซ์','เฟิร์น','ออม','ปาล์ม','กิ๊ฟ','ครีม','ซิน','มิว','เนย','แพน','อิง','นิ้ง','ขิม','อร'];
const BLOOD_GROUPS = ['A','B','O','AB'];
const RELATIONS = ['บิดา','มารดา','ปู่','ย่า','ตา','ยาย','ลุง','ป้า'];
const OCCUPATIONS = ['เกษตรกร','รับจ้างทั่วไป','ค้าขาย','พนักงานบริษัท','ข้าราชการ','ธุรกิจส่วนตัว','แม่บ้าน'];

function generateMockStudents() {
    const students = [];
    const guardians = [];
    const classroomIds = MOCK_CLASSROOMS.map(c => c.id);
    const baseLat = 15.0; const baseLng = 103.0;

    for (let i = 0; i < 54; i++) {
        const isBoy = i < 27;
        const firstName = isBoy ? FIRST_NAMES_BOY[i % FIRST_NAMES_BOY.length] : FIRST_NAMES_GIRL[(i - 27) % FIRST_NAMES_GIRL.length];
        const lastName = LAST_NAMES[i % LAST_NAMES.length];
        const nickname = isBoy ? NICKNAMES_BOY[i % NICKNAMES_BOY.length] : NICKNAMES_GIRL[(i - 27) % NICKNAMES_GIRL.length];
        const gender = isBoy ? 'ชาย' : 'หญิง';
        const prefix = isBoy ? 'ด.ช.' : 'ด.ญ.';
        const classIdx = i % classroomIds.length;
        const birthYear = 2022 + Math.floor(Math.random() * 2);
        const birthMonth = Math.floor(Math.random() * 12) + 1;
        const birthDay = Math.floor(Math.random() * 28) + 1;
        const birthday = `${birthYear}-${String(birthMonth).padStart(2,'0')}-${String(birthDay).padStart(2,'0')}`;
        const age = new Date().getFullYear() - birthYear;
        const weight = 12 + Math.floor(Math.random() * 8);
        const height = 85 + Math.floor(Math.random() * 25);

        const sid = `STD-${String(i + 1).padStart(4, '0')}`;
        const idCard = `1${String(Math.floor(Math.random() * 999999999999)).padStart(12, '0')}`;

        students.push({
            id: sid, idCard, prefix,
            firstName, lastName, nickname, gender, birthday, age,
            bloodGroup: BLOOD_GROUPS[Math.floor(Math.random() * 4)],
            weight, height,
            photo: '',
            facePhoto: '',
            classroomId: classroomIds[classIdx],
            classroom: MOCK_CLASSROOMS[classIdx].name,
            level: MOCK_CLASSROOMS[classIdx].level,
            status: 'กำลังศึกษา',
            address: { houseNo: `${Math.floor(Math.random() * 300) + 1}`, moo: `${Math.floor(Math.random() * 15) + 1}`, road: '', tambon: 'ในเมือง', amphoe: 'เมือง', province: 'นครราชสีมา', lat: baseLat + (Math.random() - 0.5) * 0.05, lng: baseLng + (Math.random() - 0.5) * 0.05 },
            allergies: i % 10 === 0 ? 'แพ้นมวัว' : (i % 15 === 0 ? 'แพ้ถั่ว' : ''),
            createdAt: new Date().toISOString()
        });

        guardians.push({
            id: `GRD-${String(i + 1).padStart(4, '0')}`,
            studentId: sid,
            name: `${RELATIONS[i % RELATIONS.length]} ${lastName}`,
            relation: RELATIONS[i % RELATIONS.length],
            phone: `08${Math.floor(Math.random() * 10)}-${String(Math.floor(Math.random() * 999)).padStart(3,'0')}-${String(Math.floor(Math.random() * 9999)).padStart(4,'0')}`,
            lineId: `parent_${i + 1}`,
            occupation: OCCUPATIONS[i % OCCUPATIONS.length],
            income: [8000,10000,12000,15000,20000,25000,30000][Math.floor(Math.random() * 7)]
        });
    }
    return { students, guardians };
}

// =============================================
// MOCK ATTENDANCE (TODAY)
// =============================================
function generateTodayAttendance(students) {
    const today = new Date().toISOString().split('T')[0];
    return students.map((s, i) => {
        const isPresent = Math.random() > 0.08;
        const isLate = isPresent && Math.random() > 0.85;
        const hour = isLate ? 8 + Math.floor(Math.random() * 2) : 7 + Math.floor(Math.random() * 1);
        const minute = Math.floor(Math.random() * 60);
        return {
            id: `ATT-${today}-${s.id}`,
            studentId: s.id,
            date: today,
            status: isPresent ? (isLate ? 'มาสาย' : 'มาเรียน') : (Math.random() > 0.5 ? 'ลาป่วย' : 'ขาดเรียน'),
            timeIn: isPresent ? `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}` : '',
            method: isPresent ? 'face' : '',
            recorder: 'ระบบอัตโนมัติ'
        };
    });
}

// =============================================
// MOCK HEALTH DATA (TODAY)
// =============================================
function generateTodayHealth(students) {
    const today = new Date().toISOString().split('T')[0];
    return students.map(s => ({
        id: `HLT-${today}-${s.id}`,
        studentId: s.id,
        date: today,
        milk: Math.random() > 0.1,
        brushTeeth: Math.random() > 0.12,
        nailCheck: Math.random() > 0.05,
        hairCheck: Math.random() > 0.05,
        bodyClean: Math.random() > 0.03,
        hasFever: Math.random() > 0.95,
        sickSymptoms: Math.random() > 0.9 ? 'ไอเล็กน้อย' : '',
        mood: ['😊','😐','😢','😴'][Math.floor(Math.random() * 4)],
        recorder: 'ครูสมใจ',
        recordedAt: new Date().toISOString()
    }));
}

// =============================================
// MOCK LUNCH MENUS
// =============================================
const MOCK_LUNCH_MENUS = [
    { id: 'LN001', date: new Date().toISOString().split('T')[0], menu: 'ข้าวผัดไข่ + แกงจืดเต้าหู้', nutrition: 'โปรตีน 15g, คาร์บ 45g, ไขมัน 8g', cost: 25, photo: '' },
    { id: 'LN002', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], menu: 'ข้าวมันไก่ + ต้มจืดผัก', nutrition: 'โปรตีน 18g, คาร์บ 50g, ไขมัน 10g', cost: 28, photo: '' },
    { id: 'LN003', date: new Date(Date.now() - 172800000).toISOString().split('T')[0], menu: 'ข้าวราดแกงเขียวหวาน + ไข่เจียว', nutrition: 'โปรตีน 16g, คาร์บ 48g, ไขมัน 12g', cost: 30, photo: '' },
    { id: 'LN004', date: new Date(Date.now() - 259200000).toISOString().split('T')[0], menu: 'ก๋วยเตี๋ยวน้ำใส + ผลไม้', nutrition: 'โปรตีน 12g, คาร์บ 40g, ไขมัน 5g', cost: 22, photo: '' },
    { id: 'LN005', date: new Date(Date.now() - 345600000).toISOString().split('T')[0], menu: 'ข้าวผัดหมู + แกงจืดวุ้นเส้น', nutrition: 'โปรตีน 14g, คาร์บ 42g, ไขมัน 9g', cost: 26, photo: '' }
];

// =============================================
// MOCK ACTIVITIES
// =============================================
const MOCK_ACTIVITIES = [
    { id: 'ACT001', name: 'วันเด็กแห่งชาติ', classroomId: 'ALL', date: '2569-01-11', teacher: 'ครูสมใจ รักเด็ก', description: 'กิจกรรมวันเด็กแห่งชาติ มีการแสดง เกม และแจกของขวัญ', photos: [], video: '' },
    { id: 'ACT002', name: 'กิจกรรมศิลปะสร้างสรรค์', classroomId: 'C001', date: '2569-05-10', teacher: 'ครูสมใจ รักเด็ก', description: 'วาดภาพระบายสีธรรมชาติ', photos: [], video: '' },
    { id: 'ACT003', name: 'เรียนรู้วิทยาศาสตร์', classroomId: 'C003', date: '2569-05-08', teacher: 'ครูพรทิพย์ สุขสันต์', description: 'ทดลองปลูกต้นถั่วงอก', photos: [], video: '' },
    { id: 'ACT004', name: 'กีฬาสีประจำปี', classroomId: 'ALL', date: '2569-03-15', teacher: 'ครูมณี ศรีสุข', description: 'การแข่งขันกีฬาสีภายใน', photos: [], video: '' },
    { id: 'ACT005', name: 'นิทานก่อนนอน', classroomId: 'C002', date: '2569-05-12', teacher: 'ครูวิไล ใจดี', description: 'อ่านนิทานเสริมจินตนาการ', photos: [], video: '' }
];

// =============================================
// LOCAL STORAGE CRUD (Supabase-ready)
// =============================================
const ChilddevDB = {
    _get(key) {
        try { return JSON.parse(localStorage.getItem(key)) || []; }
        catch { return []; }
    },
    _set(key, data) { localStorage.setItem(key, JSON.stringify(data)); },

    getAll(table) { return this._get(CHILDDEV_KEYS[table]); },
    getById(table, id) { return this._get(CHILDDEV_KEYS[table]).find(r => r.id === id); },

    add(table, record) {
        const data = this._get(CHILDDEV_KEYS[table]);
        data.push(record);
        this._set(CHILDDEV_KEYS[table], data);
        return record;
    },
    update(table, id, updates) {
        const data = this._get(CHILDDEV_KEYS[table]);
        const idx = data.findIndex(r => r.id === id);
        if (idx === -1) return null;
        data[idx] = { ...data[idx], ...updates };
        this._set(CHILDDEV_KEYS[table], data);
        return data[idx];
    },
    delete(table, id) {
        let data = this._get(CHILDDEV_KEYS[table]);
        data = data.filter(r => r.id !== id);
        this._set(CHILDDEV_KEYS[table], data);
    },
    search(table, query, fields) {
        const q = query.toLowerCase();
        return this._get(CHILDDEV_KEYS[table]).filter(r =>
            fields.some(f => (r[f] || '').toLowerCase().includes(q))
        );
    },
    filter(table, filterObj) {
        return this._get(CHILDDEV_KEYS[table]).filter(r =>
            Object.entries(filterObj).every(([k, v]) => !v || r[k] === v)
        );
    },
    clear(table) { localStorage.removeItem(CHILDDEV_KEYS[table]); },
    initMockData() {
        const existingStudents = this._get(CHILDDEV_KEYS.students);
        const existingRooms = this._get(CHILDDEV_KEYS.classrooms);
        if (existingStudents.length > 0 && existingRooms.length > 0) {
            console.log(`✅ Childdev data loaded: ${existingStudents.length} students, ${existingRooms.length} classrooms`);
            return;
        }
        this.forceReset();
    },
    forceReset() {
        Object.values(CHILDDEV_KEYS).forEach(k => localStorage.removeItem(k));
        const { students, guardians } = generateMockStudents();
        this._set(CHILDDEV_KEYS.students, students);
        this._set(CHILDDEV_KEYS.guardians, guardians);
        this._set(CHILDDEV_KEYS.classrooms, MOCK_CLASSROOMS);
        this._set(CHILDDEV_KEYS.attendance, generateTodayAttendance(students));
        this._set(CHILDDEV_KEYS.health, generateTodayHealth(students));
        this._set(CHILDDEV_KEYS.lunch, MOCK_LUNCH_MENUS);
        this._set(CHILDDEV_KEYS.activities, MOCK_ACTIVITIES);
        console.log(`✅ Childdev mock data initialized: ${students.length} students`);
    }
};

// =============================================
// DRAFT AUTO-SAVE
// =============================================
const ChilddevDraft = {
    save(formId, data) { localStorage.setItem(`childdev_draft_${formId}`, JSON.stringify(data)); },
    load(formId) { try { return JSON.parse(localStorage.getItem(`childdev_draft_${formId}`)); } catch { return null; } },
    clear(formId) { localStorage.removeItem(`childdev_draft_${formId}`); }
};

// =============================================
// UTILITY FUNCTIONS
// =============================================
function childdevFormatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function childdevCalcAge(birthday) {
    if (!birthday) return '-';
    const b = new Date(birthday);
    const now = new Date();
    let y = now.getFullYear() - b.getFullYear();
    let m = now.getMonth() - b.getMonth();
    if (m < 0) { y--; m += 12; }
    return `${y} ปี ${m} เดือน`;
}

function childdevCalcBMI(weight, height) {
    if (!weight || !height) return { bmi: 0, status: '-', color: '#6b7280' };
    const h = height / 100;
    const bmi = weight / (h * h);
    let status, color;
    if (bmi < 15) { status = 'ผอม'; color = '#f59e0b'; }
    else if (bmi < 18) { status = 'ปกติ'; color = '#10b981'; }
    else if (bmi < 20) { status = 'ท้วม'; color = '#f97316'; }
    else { status = 'อ้วน'; color = '#ef4444'; }
    return { bmi: bmi.toFixed(1), status, color };
}

function childdevGetTodayStr() { return new Date().toISOString().split('T')[0]; }

function childdevGenerateId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
}

// Skeleton loading HTML
function childdevSkeleton(count = 3) {
    return Array.from({ length: count }, () =>
        `<div class="placeholder-glow mb-2"><span class="placeholder col-12" style="height:40px;border-radius:8px;"></span></div>`
    ).join('');
}

// =============================================
// INIT IMMEDIATELY (ไม่รอ DOMContentLoaded)
// =============================================
ChilddevDB.initMockData();
