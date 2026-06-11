/**
 * secretary-face.js — Face Recognition Module for Secretary (สำนักปลัด)
 * Cloned architecture from childdev-face.js, adapted for staff attendance
 * Uses face-api.js for detection + WebRTC camera
 */

const SecFaceModule = {
    video: null,
    canvas: null,
    ctx: null,
    isRunning: false,
    isModelLoaded: false,
    mode: 'attendance', // 'attendance' | 'register'
    labeledDescriptors: [],
    checkedStaff: new Set(),
    successSound: null,

    async init(videoEl, canvasEl) {
        this.video = videoEl;
        this.canvas = canvasEl;
        this.ctx = canvasEl.getContext('2d');
        this.successSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgkKmsj2E2NWCSqauPYTY1YJKpq49hNjVgkqmrj2E2NWA=');
        await this.loadModels();
        this.loadSavedFaces();
    },

    async loadModels() {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model/';
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
            this.isModelLoaded = true;
            console.log('✅ Secretary Face models loaded');
            return true;
        } catch (e) {
            console.error('❌ Face model load failed:', e);
            return false;
        }
    },

    async startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
            });
            this.video.srcObject = stream;
            await this.video.play();
            this.canvas.width = this.video.videoWidth || 640;
            this.canvas.height = this.video.videoHeight || 480;
            return true;
        } catch (e) {
            console.error('Camera error:', e);
            return false;
        }
    },

    stopCamera() {
        this.isRunning = false;
        if (this.video?.srcObject) {
            this.video.srcObject.getTracks().forEach(t => t.stop());
            this.video.srcObject = null;
        }
    },

    // Load registered face descriptors from localStorage
    loadSavedFaces() {
        const faceData = SecStaffDB.getAll('faceData');
        this.labeledDescriptors = faceData.map(f => {
            const desc = new Float32Array(f.descriptor);
            return new faceapi.LabeledFaceDescriptors(f.staffId, [desc]);
        });
    },

    async registerFace(staffId) {
        if (!this.isModelLoaded) { alert('โมเดลยังไม่พร้อม'); return null; }
        const detection = await faceapi
            .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true)
            .withFaceDescriptor();
        if (!detection) return null;

        const descriptor = Array.from(detection.descriptor);
        const existing = SecStaffDB.getAll('faceData').find(f => f.staffId === staffId);
        if (existing) {
            SecStaffDB.update('faceData', existing.id, { descriptor, updatedAt: new Date().toISOString() });
        } else {
            SecStaffDB.add('faceData', {
                id: secGenerateId('SFACE'),
                staffId,
                descriptor,
                createdAt: new Date().toISOString()
            });
        }
        this.loadSavedFaces();
        return detection;
    },

    async startAttendanceLoop(onMatch) {
        if (!this.isModelLoaded || this.labeledDescriptors.length === 0) return;
        this.isRunning = true;
        this.checkedStaff.clear();

        const faceMatcher = new faceapi.FaceMatcher(this.labeledDescriptors, 0.5);

        const detect = async () => {
            if (!this.isRunning) return;
            const detections = await faceapi
                .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks(true)
                .withFaceDescriptors();

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            for (const det of detections) {
                const match = faceMatcher.findBestMatch(det.descriptor);
                const box = det.detection.box;

                // Draw face frame
                this.ctx.strokeStyle = match.label !== 'unknown' ? '#10b981' : '#ef4444';
                this.ctx.lineWidth = 3;
                this.ctx.strokeRect(box.x, box.y, box.width, box.height);

                // Label
                this.ctx.fillStyle = match.label !== 'unknown' ? '#10b981' : '#ef4444';
                this.ctx.font = '14px Prompt';
                const staff = SecStaffDB.getById('staff', match.label);
                const label = staff ? `${staff.name} (${((1 - match.distance) * 100).toFixed(0)}%)` : 'ไม่รู้จัก';
                this.ctx.fillText(label, box.x, box.y - 8);

                if (match.label !== 'unknown' && !this.checkedStaff.has(match.label)) {
                    this.checkedStaff.add(match.label);
                    this.playSuccess();
                    // Capture snapshot on successful scan
                    const snapshot = this.captureSnapshot();
                    if (onMatch) onMatch(match.label, 1 - match.distance, snapshot);
                }
            }
            requestAnimationFrame(detect);
        };
        detect();
    },

    playSuccess() {
        try { this.successSound?.play(); } catch {}
    },

    captureSnapshot() {
        const c = document.createElement('canvas');
        c.width = this.video.videoWidth;
        c.height = this.video.videoHeight;
        c.getContext('2d').drawImage(this.video, 0, 0);
        return c.toDataURL('image/jpeg', 0.7);
    }
};

/**
 * SecStaffDB — localStorage-based staff DB for face attendance
 * Same architecture as ChilddevDB
 */
const SecStaffDB = {
    _storageKey: 'sec_staff_db',

    _load() {
        try {
            return JSON.parse(localStorage.getItem(this._storageKey)) || {};
        } catch { return {}; }
    },

    _save(db) {
        localStorage.setItem(this._storageKey, JSON.stringify(db));
    },

    getAll(collection) {
        const db = this._load();
        return db[collection] || [];
    },

    getById(collection, id) {
        return this.getAll(collection).find(item => item.id === id);
    },

    add(collection, item) {
        const db = this._load();
        if (!db[collection]) db[collection] = [];
        db[collection].push(item);
        this._save(db);
        return item;
    },

    update(collection, id, updates) {
        const db = this._load();
        const items = db[collection] || [];
        const idx = items.findIndex(item => item.id === id);
        if (idx !== -1) {
            items[idx] = { ...items[idx], ...updates };
            this._save(db);
            return items[idx];
        }
        return null;
    },

    remove(collection, id) {
        const db = this._load();
        db[collection] = (db[collection] || []).filter(item => item.id !== id);
        this._save(db);
    },

    // Initialize demo staff data if empty
    initDemoData() {
        const existing = this.getAll('staff');
        if (existing.length > 0) return;

        const demoStaff = [
            { id: 's1', name: 'นายทนงศักดิ์ รักไทย', position: 'นักวิเคราะห์นโยบายและแผน', department: 'สำนักปลัด' },
            { id: 's2', name: 'น.ส.ดวงใจ งามดี', position: 'นักทรัพยากรบุคคล', department: 'สำนักปลัด' },
            { id: 's3', name: 'นายบรรเจิด เกียรติกร', position: 'นิติกร', department: 'สำนักปลัด' },
            { id: 's4', name: 'นายปิติ สู้ชีวิต', position: 'เจ้าพนักงานธุรการ', department: 'สำนักปลัด' },
            { id: 's5', name: 'น.ส.วิลาวัลย์ ใจดี', position: 'นักจัดการงานทั่วไป', department: 'สำนักปลัด' },
            { id: 's6', name: 'นายสมชาย รุ่งเรือง', position: 'ปลัดเทศบาล', department: 'สำนักปลัด' }
        ];
        demoStaff.forEach(s => this.add('staff', s));
    }
};

function secGetTodayStr() { return new Date().toISOString().split('T')[0]; }

function secGenerateId(prefix) {
    return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
}
