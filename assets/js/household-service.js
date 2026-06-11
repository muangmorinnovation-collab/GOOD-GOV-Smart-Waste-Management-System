/**
 * household-service.js — Household CRUD Service
 * Smart Governance Municipality Platform
 */
const HouseholdService = {
    async createHousehold(data) {
        if(!supabaseClient) { console.warn('Mock: createHousehold'); return {id:'mock-new',success:true}; }
        const {data:result,error} = await supabaseClient.from('dd_households').insert([data]).select().single();
        if(error) throw error; return result;
    },
    async updateHousehold(id, data) {
        if(!supabaseClient) return {success:true};
        const {error} = await supabaseClient.from('dd_households').update(data).eq('id',id);
        if(error) throw error; return {success:true};
    },
    async deleteHousehold(id) {
        if(!supabaseClient) return {success:true};
        const {error} = await supabaseClient.from('dd_households').delete().eq('id',id);
        if(error) throw error; return {success:true};
    },
    async getAllHouseholds(page=1, limit=50) {
        if(!supabaseClient) return {data:[], count:0};
        const from=(page-1)*limit, to=from+limit-1;
        const {data,count,error} = await supabaseClient.from('dd_households').select('*',{count:'exact'}).range(from,to).order('village_no').order('house_number');
        if(error) throw error; return {data:data||[],count:count||0};
    },
    // Members
    async linkMember(householdId, memberData) {
        if(!supabaseClient) return {id:'mock-member',success:true};
        memberData.household_id = householdId;
        const {data,error} = await supabaseClient.from('dd_household_members').insert([memberData]).select().single();
        if(error) throw error; return data;
    },
    async updateMember(id, data) {
        if(!supabaseClient) return {success:true};
        const {error} = await supabaseClient.from('dd_household_members').update(data).eq('id',id);
        if(error) throw error; return {success:true};
    },
    async unlinkMember(id) {
        if(!supabaseClient) return {success:true};
        const {error} = await supabaseClient.from('dd_household_members').delete().eq('id',id);
        if(error) throw error; return {success:true};
    },
    async getMembers(householdId) {
        if(!supabaseClient) return [];
        const {data} = await supabaseClient.from('dd_household_members').select('*').eq('household_id',householdId).order('is_head',{ascending:false});
        return data||[];
    },
    async calculateHouseholdStats(householdId) {
        if(!supabaseClient) return;
        await supabaseClient.rpc('dd_calculate_household_stats',{p_household_id:householdId});
    },
    // Specialized records
    async ensureMemberExists(info) {
        if(!supabaseClient) return 'mock-member';
        
        let householdId = null;
        let {data: hData} = await supabaseClient.from('dd_households').select('id')
            .eq('house_number', info.house_number)
            .eq('village_no', info.village_no);
            
        if (hData && hData.length > 0) {
            householdId = hData[0].id;
        } else {
            let {data: newH} = await supabaseClient.from('dd_households').insert([{
                house_number: info.house_number,
                village_no: info.village_no,
                village_name: info.village_name || ''
            }]).select().single();
            if(newH) householdId = newH.id;
        }
        
        if(!householdId) throw new Error("Cannot create household");
        
        const memberData = {
            household_id: householdId,
            prefix: info.prefix,
            first_name: info.first_name,
            last_name: info.last_name,
            age: info.age,
            birth_date: info.birth_date || null,
            gender: info.gender,
            citizen_id: info.citizen_id,
            is_head: false
        };
        const {data: newM, error} = await supabaseClient.from('dd_household_members').insert([memberData]).select().single();
        if(error) throw error;
        return newM.id;
    },
    async saveElderly(memberId, data) {
        if(!supabaseClient) return {success:true};
        data.household_member_id = memberId;
        const {data: existing} = await supabaseClient.from('dd_elderly').select('id').eq('household_member_id', memberId).single();
        let error;
        if (existing) {
            ({error} = await supabaseClient.from('dd_elderly').update(data).eq('id', existing.id));
        } else {
            ({error} = await supabaseClient.from('dd_elderly').insert([data]));
        }
        if(error) throw error; return {success:true};
    },
    async saveDisabled(memberId, data) {
        if(!supabaseClient) return {success:true};
        data.household_member_id = memberId;
        const {data: existing} = await supabaseClient.from('dd_disabled_persons').select('id').eq('household_member_id', memberId).single();
        let error;
        if (existing) {
            ({error} = await supabaseClient.from('dd_disabled_persons').update(data).eq('id', existing.id));
        } else {
            ({error} = await supabaseClient.from('dd_disabled_persons').insert([data]));
        }
        if(error) throw error; return {success:true};
    },
    async saveBedridden(memberId, data) {
        if(!supabaseClient) return {success:true};
        data.household_member_id = memberId;
        const {data: existing} = await supabaseClient.from('dd_bedridden_patients').select('id').eq('household_member_id', memberId).single();
        let error;
        if (existing) {
            ({error} = await supabaseClient.from('dd_bedridden_patients').update(data).eq('id', existing.id));
        } else {
            ({error} = await supabaseClient.from('dd_bedridden_patients').insert([data]));
        }
        if(error) throw error; return {success:true};
    },
    async saveNewborn(memberId, data) {
        if(!supabaseClient) return {success:true};
        data.household_member_id = memberId;
        const {data: existing} = await supabaseClient.from('dd_newborns').select('id').eq('household_member_id', memberId).single();
        let error;
        if (existing) {
            ({error} = await supabaseClient.from('dd_newborns').update(data).eq('id', existing.id));
        } else {
            ({error} = await supabaseClient.from('dd_newborns').insert([data]));
        }
        if(error) throw error; return {success:true};
    },
    async savePoorHousehold(householdId, data) {
        if(!supabaseClient) return {success:true};
        data.household_id = householdId;
        const {data: existing} = await supabaseClient.from('dd_poor_households').select('id').eq('household_id', householdId).single();
        let error;
        if (existing) {
            ({error} = await supabaseClient.from('dd_poor_households').update(data).eq('id', existing.id));
        } else {
            ({error} = await supabaseClient.from('dd_poor_households').insert([data]));
        }
        if(error) throw error; return {success:true};
    },
    async saveScholar(memberId, data) {
        if(!supabaseClient) return {success:true};
        data.household_member_id = memberId;
        const {data: existing} = await supabaseClient.from('dd_community_scholars').select('id').eq('household_member_id', memberId).single();
        let error;
        if (existing) {
            ({error} = await supabaseClient.from('dd_community_scholars').update(data).eq('id', existing.id));
        } else {
            ({error} = await supabaseClient.from('dd_community_scholars').insert([data]));
        }
        if(error) throw error; return {success:true};
    },
    async saveLeader(memberId, data) {
        if(!supabaseClient) return {success:true};
        data.household_member_id = memberId;
        const {data: existing} = await supabaseClient.from('dd_leaders_volunteers').select('id').eq('household_member_id', memberId).single();
        let error;
        if (existing) {
            ({error} = await supabaseClient.from('dd_leaders_volunteers').update(data).eq('id', existing.id));
        } else {
            ({error} = await supabaseClient.from('dd_leaders_volunteers').insert([data]));
        }
        if(error) throw error; return {success:true};
    },
    // Specialized queries
    async getElderlyList() {
        if(!supabaseClient) return [];
        const {data} = await supabaseClient.from('dd_elderly').select('*,dd_household_members(household_id,prefix,first_name,last_name,age,gender,citizen_id,dd_households(id,house_number,village_no,village_name))').order('created_at', {ascending: false});
        return data||[];
    },
    async getDisabledList() {
        if(!supabaseClient) return [];
        const {data} = await supabaseClient.from('dd_disabled_persons').select('*,dd_household_members(household_id,prefix,first_name,last_name,age,gender,citizen_id,dd_households(id,house_number,village_no,village_name))').order('created_at', {ascending: false});
        return data||[];
    },
    async getBedriddenList() {
        if(!supabaseClient) return [];
        const {data} = await supabaseClient.from('dd_bedridden_patients').select('*,dd_household_members(household_id,prefix,first_name,last_name,age,gender,citizen_id,dd_households(id,house_number,village_no,village_name))').order('created_at', {ascending: false});
        return data||[];
    },
    async getNewbornList() {
        if(!supabaseClient) return [];
        const {data} = await supabaseClient.from('dd_newborns').select('*,dd_household_members(household_id,prefix,first_name,last_name,age,gender,citizen_id,dd_households(id,house_number,village_no,village_name))').order('created_at', {ascending: false});
        return data||[];
    },
    async getPoorList() {
        if(!supabaseClient) return [];
        const {data} = await supabaseClient.from('dd_poor_households').select('*,dd_households(house_number,village_no,village_name,owner_name,total_members)');
        return data||[];
    },
    async getScholarList() {
        if(!supabaseClient) return [];
        const {data} = await supabaseClient.from('dd_community_scholars').select('*,dd_household_members(prefix,first_name,last_name,age,gender,dd_households(house_number,village_no,village_name))');
        return data||[];
    },
    async getLeaderList() {
        if(!supabaseClient) return [];
        const {data} = await supabaseClient.from('dd_leaders_volunteers').select('*,dd_household_members(prefix,first_name,last_name,age,gender,dd_households(house_number,village_no,village_name))');
        return data||[];
    }
};
