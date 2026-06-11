/**
 * cg.js - Service and Logic for Care Givers
 */

const CGService = {
    async getCGList() {
        const { data, error } = await supabaseClient.from('ph_cg_staff').select('*').order('first_name', { ascending: true });
        if(error) throw error;
        return data;
    },
    
    async saveVisit(visitData, adlData, twoQData) {
        try {
            // 1. Save Visit
            const { data: visit, error: visitErr } = await supabaseClient.from('ph_care_visits')
                .insert(visitData).select('id').single();
            if(visitErr) throw visitErr;
            
            // 2. Save ADL Assessment
            if(adlData) {
                adlData.visit_id = visit.id;
                adlData.patient_member_id = visitData.patient_member_id;
                const { error: adlErr } = await supabaseClient.from('ph_adl_assessments').insert(adlData);
                if(adlErr) throw adlErr;
            }
            
            // 3. Save 2Q Screening
            if(twoQData) {
                twoQData.visit_id = visit.id;
                twoQData.patient_member_id = visitData.patient_member_id;
                const { error: qErr } = await supabaseClient.from('ph_2q_assessments').insert(twoQData);
                if(qErr) throw qErr;
            }
            
            return visit.id;
        } catch (error) {
            console.error("Error saving visit:", error);
            throw error;
        }
    },
    
    calculateBMI(weight, heightCm) {
        if(!weight || !heightCm) return 0;
        const hM = heightCm / 100;
        return (weight / (hM * hM)).toFixed(2);
    },
    
    analyzeADL(score) {
        // 0-4 = ติดเตียง, 5-11 = ติดบ้าน, 12-20 = ติดสังคม
        let level = '';
        let color = '';
        if(score <= 4) { level = 'ติดเตียง'; color = 'danger'; }
        else if(score <= 11) { level = 'ติดบ้าน'; color = 'warning'; }
        else { level = 'ติดสังคม'; color = 'success'; }
        return { score, level, color };
    }
};

window.CGService = CGService;
