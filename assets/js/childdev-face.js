/**
 * childdev-face.js — Face Recognition Module
 * Uses face-api.js for detection + WebRTC camera
 */

const FaceModule = {
    video: null,
    canvas: null,
    ctx: null,
    isRunning: false,
    isModelLoaded: false,
    mode: 'attendance', // 'attendance' | 'register'
    labeledDescriptors: [],
    checkedStudents: new Set(),
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
            console.log('✅ Face models loaded');
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

    loadSavedFaces() {
        const faceData = ChilddevDB.getAll('faceData');
        this.labeledDescriptors = faceData.map(f => {
            const desc = new Float32Array(f.descriptor);
            return new faceapi.LabeledFaceDescriptors(f.studentId, [desc]);
        });
    },

    async registerFace(studentId) {
        if (!this.isModelLoaded) { alert('โมเดลยังไม่พร้อม'); return null; }
        const detection = await faceapi
            .detectSingleFace(this.video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks(true)
            .withFaceDescriptor();
        if (!detection) return null;

        const descriptor = Array.from(detection.descriptor);
        const existing = ChilddevDB.getAll('faceData').find(f => f.studentId === studentId);
        if (existing) {
            ChilddevDB.update('faceData', existing.id, { descriptor, updatedAt: new Date().toISOString() });
        } else {
            ChilddevDB.add('faceData', {
                id: childdevGenerateId('FACE'),
                studentId,
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
        this.checkedStudents.clear();

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
                const student = ChilddevDB.getById('students', match.label);
                const label = student ? `${student.nickname} (${(1 - match.distance).toFixed(0)*100}%)` : 'ไม่รู้จัก';
                this.ctx.fillText(label, box.x, box.y - 8);

                if (match.label !== 'unknown' && !this.checkedStudents.has(match.label)) {
                    this.checkedStudents.add(match.label);
                    this.playSuccess();
                    // แคปภาพตอนสแกนสำเร็จ
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
