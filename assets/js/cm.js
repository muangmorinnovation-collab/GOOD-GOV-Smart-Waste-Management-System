/**
 * cm.js - Service and Logic for Care Managers
 */

const CMService = {
    async getCMList() {
        const { data, error } = await supabaseClient.from('ph_cm_staff').select('*').order('first_name', { ascending: true });
        if(error) throw error;
        return data;
    },
    
    async getPendingVisits() {
        const { data, error } = await supabaseClient.from('ph_care_visits')
            .select(`*, 
                cg:cg_id(first_name, last_name),
                patient:patient_member_id(first_name, last_name, citizen_id)
            `)
            .eq('status', 'รอดำเนินการ')
            .order('created_at', { ascending: false });
        if(error) throw error;
        return data;
    },
    
    async reviewVisit(visitId, status, comment, cmId) {
        const { error } = await supabaseClient.from('ph_care_visits').update({
            status: status,
            cm_comment: comment,
            cm_id: cmId,
            cm_review_date: new Date().toISOString()
        }).eq('id', visitId);
        if(error) throw error;
        return true;
    },
    
    // Equipment Inventory
    async getEquipmentInventory() {
        const { data, error } = await supabaseClient.from('ph_medical_equipments').select('*').order('category', { ascending: true });
        if(error) throw error;
        return data;
    },
    
    async addEquipmentRequest(reqData) {
        const { error } = await supabaseClient.from('ph_equipment_requests').insert(reqData);
        if(error) throw error;
        return true;
    }
};

window.CMService = CMService;
