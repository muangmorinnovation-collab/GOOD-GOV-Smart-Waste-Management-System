/**
 * healthcare.js - Shared Service for Public Health (กองสาธารณสุข)
 * Includes dashboard analytics and shared utilities for CG and CM
 */

const HealthcareService = {
    // -----------------------------------------
    // DASHBOARD ANALYTICS
    // -----------------------------------------
    
    async getExecutiveDashboardStats() {
        try {
            // Count elderly
            const { count: elderlyCount } = await supabaseClient.from('dd_elderly').select('*', { count: 'exact', head: true });
            // Count disabled
            const { count: disabledCount } = await supabaseClient.from('dd_disabled_persons').select('*', { count: 'exact', head: true });
            // Count bedridden
            const { count: bedriddenCount } = await supabaseClient.from('dd_bedridden_patients').select('*', { count: 'exact', head: true });
            
            // Count CGs
            const { count: cgCount } = await supabaseClient.from('ph_cg_staff').select('*', { count: 'exact', head: true });
            // Count CMs
            const { count: cmCount } = await supabaseClient.from('ph_cm_staff').select('*', { count: 'exact', head: true });
            
            // Count visits this month
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const { count: visitCount } = await supabaseClient.from('ph_care_visits')
                .select('*', { count: 'exact', head: true })
                .gte('visit_date', startOfMonth);
                
            // Equipment stats
            const { data: equipData } = await supabaseClient.from('ph_medical_equipments').select('total_quantity, borrowed_quantity, remaining_quantity');
            let totalEquip = 0, borrowedEquip = 0, remainingEquip = 0;
            if(equipData) {
                equipData.forEach(e => {
                    totalEquip += (e.total_quantity || 0);
                    borrowedEquip += (e.borrowed_quantity || 0);
                    remainingEquip += (e.remaining_quantity || 0);
                });
            }
            
            // Dependent counts (ADL proxy)
            const { data: adlData } = await supabaseClient.from('ph_adl_assessments').select('dependency_level');
            let socialCount = 0, homeCount = 0, bedCount = 0;
            if(adlData) {
                adlData.forEach(a => {
                    if(a.dependency_level === 'ติดสังคม') socialCount++;
                    if(a.dependency_level === 'ติดบ้าน') homeCount++;
                    if(a.dependency_level === 'ติดเตียง') bedCount++;
                });
            }
            
            return {
                elderly: elderlyCount || 0,
                disabled: disabledCount || 0,
                bedridden: bedriddenCount || 0,
                dependent: bedCount + homeCount, // proxy for dependent
                cg: cgCount || 0,
                cm: cmCount || 0,
                visitsThisMonth: visitCount || 0,
                equipment: { total: totalEquip, borrowed: borrowedEquip, remaining: remainingEquip },
                adlStats: { social: socialCount, home: homeCount, bed: bedCount }
            };
        } catch (error) {
            console.error("Error fetching executive stats:", error);
            return null;
        }
    },
    
    // -----------------------------------------
    // AI ENHANCEMENTS
    // -----------------------------------------
    
    getRiskPrediction(visitData) {
        // AI Concept: Detect sudden drops in vitals or ADL
        let risks = [];
        if(visitData.bmi && visitData.bmi < 18.5) risks.push('ความเสี่ยงขาดสารอาหาร (BMI ต่ำ)');
        if(visitData.blood_pressure) {
            const [sys, dia] = visitData.blood_pressure.split('/');
            if(parseInt(sys) > 160 || parseInt(dia) > 100) risks.push('ความเสี่ยงความดันโลหิตสูงวิกฤต');
        }
        return risks;
    },
    
    getCareRecommendation(patientCondition, adlLevel) {
        // AI Concept: Suggest equipment based on condition
        let recs = [];
        if(adlLevel === 'ติดเตียง') recs.push('แนะนำเบาะลมป้องกันแผลกดทับ');
        if(patientCondition && patientCondition.includes('หอบเหนื่อย')) recs.push('แนะนำเครื่องผลิตออกซิเจน');
        return recs;
    }
};

window.HealthcareService = HealthcareService;
