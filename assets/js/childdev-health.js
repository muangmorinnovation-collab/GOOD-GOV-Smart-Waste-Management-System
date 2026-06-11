/**
 * childdev-health.js — Health Checklist Module
 */

const HealthModule = {
    currentRoom: '',
    todayData: {},

    init() {
        this.loadToday();
    },

    loadToday() {
        const health = ChilddevDB.getAll('health').filter(h => h.date === childdevGetTodayStr());
        this.todayData = {};
        health.forEach(h => { this.todayData[h.studentId] = h; });
    },

    toggle(studentId, field) {
        const today = childdevGetTodayStr();
        let record = this.todayData[studentId];
        if (!record) {
            record = {
                id: childdevGenerateId('HLT'), studentId, date: today,
                milk: false, brushTeeth: false, nailCheck: false, hairCheck: false,
                bodyClean: false, hasFever: false, sickSymptoms: '', mood: '😊',
                recorder: 'ครู', recordedAt: new Date().toISOString()
            };
            ChilddevDB.add('health', record);
            this.todayData[studentId] = record;
        }
        record[field] = !record[field];
        record.recordedAt = new Date().toISOString();
        ChilddevDB.update('health', record.id, record);
        this.todayData[studentId] = record;
        return record[field];
    },

    setMood(studentId, mood) {
        const record = this.todayData[studentId];
        if (record) {
            record.mood = mood;
            ChilddevDB.update('health', record.id, { mood });
        }
    },

    setSick(studentId, symptoms) {
        const record = this.todayData[studentId];
        if (record) {
            record.sickSymptoms = symptoms;
            ChilddevDB.update('health', record.id, { sickSymptoms: symptoms });
        }
    },

    getSummary() {
        const all = Object.values(this.todayData);
        return {
            total: all.length,
            milk: all.filter(h => h.milk).length,
            brush: all.filter(h => h.brushTeeth).length,
            fever: all.filter(h => h.hasFever).length,
            sick: all.filter(h => h.sickSymptoms).length,
            noMilk: all.filter(h => !h.milk).length,
            noBrush: all.filter(h => !h.brushTeeth).length
        };
    }
};
