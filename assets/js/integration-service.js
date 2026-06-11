/**
 * integration-service.js — Data Integration Engine
 * Smart Governance Municipality Platform
 */
const IntegrationService = {
    MATCH_METHODS: ['citizen_id','tr14','name_match','house_number','duplicate_check'],
    SUPPORTED_SOURCES: ['Excel','CSV','Google Sheets','Supabase','ChildDev Module','Waste Fee System','Water Utility System'],

    async importExcel(file) {
        return new Promise((resolve,reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    if(typeof XLSX === 'undefined') { reject('SheetJS library not loaded'); return; }
                    const wb = XLSX.read(e.target.result, {type:'binary'});
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json(ws, {header:1});
                    resolve({rows:data, headers:data[0]||[], rowCount:data.length-1});
                } catch(err) { reject(err); }
            };
            reader.readAsBinaryString(file);
        });
    },

    async importCSV(file) {
        return new Promise((resolve,reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const lines = e.target.result.split('\n').filter(l=>l.trim());
                const headers = lines[0].split(',').map(h=>h.trim());
                const rows = lines.slice(1).map(l => l.split(',').map(c=>c.trim()));
                resolve({rows, headers, rowCount:rows.length});
            };
            reader.readAsText(file,'UTF-8');
        });
    },

    matchRecords(sourceRows, fieldMapping) {
        const results = { matched:[], unmatched:[], duplicates:[], qualityScore:0 };
        let matchCount = 0;
        sourceRows.forEach((row,i) => {
            const citizenId = row[fieldMapping.citizen_id];
            const name = row[fieldMapping.name];
            const houseNo = row[fieldMapping.house_number];
            let matched = false, method = '';

            if(citizenId && citizenId.length === 13) { matched=true; method='citizen_id'; }
            else if(name) { matched=true; method='name_match'; }
            else if(houseNo) { matched=true; method='house_number'; }

            if(matched) { matchCount++; results.matched.push({row:i+1, data:row, method}); }
            else { results.unmatched.push({row:i+1, data:row}); }
        });
        results.qualityScore = sourceRows.length > 0 ? Math.round((matchCount/sourceRows.length)*100) : 0;
        return results;
    },

    detectDuplicates(records) {
        const seen = new Map();
        const duplicates = [];
        records.forEach((r,i) => {
            const key = r.citizen_id || `${r.first_name}_${r.last_name}_${r.house_number}`;
            if(seen.has(key)) { duplicates.push({original:seen.get(key), duplicate:i, key}); }
            else { seen.set(key,i); }
        });
        return duplicates;
    },

    calculateDataQuality(records) {
        if(!records.length) return {score:0, issues:[]};
        const issues = [];
        let filled = 0, total = 0;
        const fields = ['citizen_id','first_name','last_name','house_number','village_no'];
        records.forEach(r => {
            fields.forEach(f => { total++; if(r[f]) filled++; else issues.push(`Row missing ${f}`); });
        });
        return { score: Math.round((filled/total)*100), issues: issues.slice(0,20) };
    },

    resolveConflict(existing, incoming, strategy='incoming_wins') {
        if(strategy === 'incoming_wins') return {...existing, ...incoming};
        if(strategy === 'existing_wins') return {...incoming, ...existing};
        // merge_non_empty: keep existing non-empty, fill from incoming
        const merged = {...existing};
        Object.keys(incoming).forEach(k => { if(!merged[k] && incoming[k]) merged[k]=incoming[k]; });
        return merged;
    },

    async logIntegration(source, method, count, status, message) {
        if(!supabaseClient) { console.log('Integration log (mock):',source,status); return; }
        await supabaseClient.from('dd_integration_logs').insert([{
            source_system:source, match_method:method, record_count:count, status, message
        }]);
    },

    async getIntegrationHistory() {
        if(!supabaseClient) return [];
        const {data} = await supabaseClient.from('dd_integration_logs').select('*').order('created_at',{ascending:false}).limit(50);
        return data||[];
    },

    // Future ML stubs
    async runMLScoring() { return {status:'stub', message:'ML scoring architecture prepared'}; },
    async buildCitizenDigitalProfile() { return {status:'stub', message:'Digital profile architecture prepared'}; }
};
