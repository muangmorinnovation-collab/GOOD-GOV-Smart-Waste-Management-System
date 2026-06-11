/* ========================================
   THAI ADDRESS DATA MODULE
   Province → District → Sub-district cascading
   Uses public API from thai-province-data
   ======================================== */

const ThaiAddress = (() => {
    const CACHE_KEY = 'sgov_thai_address_cache';
    const API_BASE = 'https://raw.githubusercontent.com/kongvut/thai-province-data/master/api/latest';

    let provinces = [];
    let districts = [];
    let subdistricts = [];
    let loaded = false;

    // =======================================
    // Load data from API or cache
    // =======================================
    async function loadData() {
        if (loaded) return true;

        // Try cache first
        try {
            const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
            if (cached && cached.ts && (Date.now() - cached.ts < 7 * 24 * 3600 * 1000)) {
                provinces = cached.p;
                districts = cached.d;
                subdistricts = cached.s;
                loaded = true;
                return true;
            }
        } catch { /* ignore */ }

        // Fetch from API
        try {
            const res = await fetch(`${API_BASE}/province_with_district_and_sub_district.json`);
            if (!res.ok) throw new Error('API Error');

            const data = await res.json();
            
            // Flatten the nested data into 3 arrays
            provinces = [];
            districts = [];
            subdistricts = [];

            data.forEach(p => {
                provinces.push({ id: p.id, name_th: p.name_th });
                
                if (p.districts) {
                    p.districts.forEach(d => {
                        districts.push({ id: d.id, name_th: d.name_th, province_id: p.id });
                        
                        if (d.sub_districts) {
                            d.sub_districts.forEach(s => {
                                subdistricts.push({ 
                                    id: s.id, 
                                    name_th: s.name_th, 
                                    amphure_id: d.id, // Keeping amphure_id for backwards compatibility with existing methods
                                    zip_code: s.zip_code 
                                });
                            });
                        }
                    });
                }
            });

            // Cache data
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    ts: Date.now(),
                    p: provinces,
                    d: districts,
                    s: subdistricts
                }));
            } catch (e) {
                console.warn('Storage limit reached, caching skipped');
            }
            
            loaded = true;
            return true;
        } catch (error) {
            console.error('Failed to load Thai Address data:', error);
            // Fallback: use built-in minimal data
            loadFallbackData();
            loaded = true;
            return true;
        }
    }

    // =======================================
    // Fallback data (key provinces only)
    // =======================================
    function loadFallbackData() {
        provinces = [
            {id:1,name_th:'กรุงเทพมหานคร'},{id:2,name_th:'สมุทรปราการ'},{id:3,name_th:'นนทบุรี'},
            {id:4,name_th:'ปทุมธานี'},{id:5,name_th:'พระนครศรีอยุธยา'},{id:6,name_th:'อ่างทอง'},
            {id:7,name_th:'ลพบุรี'},{id:8,name_th:'สิงห์บุรี'},{id:9,name_th:'ชัยนาท'},
            {id:10,name_th:'สระบุรี'},{id:11,name_th:'ชลบุรี'},{id:12,name_th:'ระยอง'},
            {id:13,name_th:'จันทบุรี'},{id:14,name_th:'ตราด'},{id:15,name_th:'ฉะเชิงเทรา'},
            {id:16,name_th:'ปราจีนบุรี'},{id:17,name_th:'นครนายก'},{id:18,name_th:'สระแก้ว'},
            {id:19,name_th:'นครราชสีมา'},{id:20,name_th:'บุรีรัมย์'},{id:21,name_th:'สุรินทร์'},
            {id:22,name_th:'ศรีสะเกษ'},{id:23,name_th:'อุบลราชธานี'},{id:24,name_th:'ยโสธร'},
            {id:25,name_th:'ชัยภูมิ'},{id:26,name_th:'อำนาจเจริญ'},{id:27,name_th:'หนองบัวลำภู'},
            {id:28,name_th:'ขอนแก่น'},{id:29,name_th:'อุดรธานี'},{id:30,name_th:'เลย'},
            {id:31,name_th:'หนองคาย'},{id:32,name_th:'มหาสารคาม'},{id:33,name_th:'ร้อยเอ็ด'},
            {id:34,name_th:'กาฬสินธุ์'},{id:35,name_th:'สกลนคร'},{id:36,name_th:'นครพนม'},
            {id:37,name_th:'มุกดาหาร'},{id:38,name_th:'เชียงใหม่'},{id:39,name_th:'ลำพูน'},
            {id:40,name_th:'ลำปาง'},{id:41,name_th:'อุตรดิตถ์'},{id:42,name_th:'แพร่'},
            {id:43,name_th:'น่าน'},{id:44,name_th:'พะเยา'},{id:45,name_th:'เชียงราย'},
            {id:46,name_th:'แม่ฮ่องสอน'},{id:47,name_th:'นครสวรรค์'},{id:48,name_th:'อุทัยธานี'},
            {id:49,name_th:'กำแพงเพชร'},{id:50,name_th:'ตาก'},{id:51,name_th:'สุโขทัย'},
            {id:52,name_th:'พิษณุโลก'},{id:53,name_th:'พิจิตร'},{id:54,name_th:'เพชรบูรณ์'},
            {id:55,name_th:'ราชบุรี'},{id:56,name_th:'กาญจนบุรี'},{id:57,name_th:'สุพรรณบุรี'},
            {id:58,name_th:'นครปฐม'},{id:59,name_th:'สมุทรสาคร'},{id:60,name_th:'สมุทรสงคราม'},
            {id:61,name_th:'เพชรบุรี'},{id:62,name_th:'ประจวบคีรีขันธ์'},{id:63,name_th:'นครศรีธรรมราช'},
            {id:64,name_th:'กระบี่'},{id:65,name_th:'พังงา'},{id:66,name_th:'ภูเก็ต'},
            {id:67,name_th:'สุราษฎร์ธานี'},{id:68,name_th:'ระนอง'},{id:69,name_th:'ชุมพร'},
            {id:70,name_th:'สงขลา'},{id:71,name_th:'สตูล'},{id:72,name_th:'ตรัง'},
            {id:73,name_th:'พัทลุง'},{id:74,name_th:'ปัตตานี'},{id:75,name_th:'ยะลา'},
            {id:76,name_th:'นราธิวาส'},{id:77,name_th:'บึงกาฬ'}
        ];
        districts = [];
        subdistricts = [];
    }

    // =======================================
    // Getters
    // =======================================
    function getProvinces() {
        return provinces.map(p => ({ id: p.id, name: p.name_th })).sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }

    function getDistricts(provinceId) {
        return districts
            .filter(d => d.province_id === provinceId)
            .map(d => ({ id: d.id, name: d.name_th }))
            .sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }

    function getSubdistricts(districtId) {
        return subdistricts
            .filter(s => s.amphure_id === districtId)
            .map(s => ({ id: s.id, name: s.name_th, zipCode: s.zip_code }))
            .sort((a, b) => a.name.localeCompare(b.name, 'th'));
    }

    function getProvinceName(id) {
        const p = provinces.find(p => p.id === id);
        return p ? p.name_th : '';
    }

    function getDistrictName(id) {
        const d = districts.find(d => d.id === id);
        return d ? d.name_th : '';
    }

    function getSubdistrictName(id) {
        const s = subdistricts.find(s => s.id === id);
        return s ? s.name_th : '';
    }

    // =======================================
    // Populate select elements
    // =======================================
    function populateProvinces(selectEl, placeholder = '-- เลือกจังหวัด --') {
        selectEl.innerHTML = `<option value="">${placeholder}</option>`;
        getProvinces().forEach(p => {
            selectEl.innerHTML += `<option value="${p.id}">${p.name}</option>`;
        });
    }

    function populateDistricts(selectEl, provinceId, placeholder = '-- เลือกอำเภอ --') {
        selectEl.innerHTML = `<option value="">${placeholder}</option>`;
        if (!provinceId) return;
        getDistricts(parseInt(provinceId)).forEach(d => {
            selectEl.innerHTML += `<option value="${d.id}">${d.name}</option>`;
        });
    }

    function populateSubdistricts(selectEl, districtId, placeholder = '-- เลือกตำบล --') {
        selectEl.innerHTML = `<option value="">${placeholder}</option>`;
        if (!districtId) return;
        getSubdistricts(parseInt(districtId)).forEach(s => {
            selectEl.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
    }

    // =======================================
    // Public API
    // =======================================
    return {
        loadData,
        getProvinces,
        getDistricts,
        getSubdistricts,
        getProvinceName,
        getDistrictName,
        getSubdistrictName,
        populateProvinces,
        populateDistricts,
        populateSubdistricts,
        isLoaded: () => loaded
    };
})();
