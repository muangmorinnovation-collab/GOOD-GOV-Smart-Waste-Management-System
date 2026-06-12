/* ========================================
   LINE LOGIN AUTH MODULE
   Smart Governance Municipality Platform
   ========================================
   
   Flow:
   1. User clicks "Login with LINE" → redirected to LINE OAuth
   2. LINE redirects back with ?code=xxx&state=xxx
   3. We exchange code for token (mock/real) and get LINE profile
   4. Check if LINE userId already registered (localStorage)
      - YES → auto-login, redirect to citizen-portal.html
      - NO  → show registration modal to collect citizen data
   5. After registration → save to localStorage, redirect to citizen-portal.html
   
   Storage keys:
   - sgov_line_users       : { [lineUserId]: { ...registrationData } }
   - sgov_citizen_session   : { lineUserId, lineName, ... } (current session)
*/

const LineAuth = (() => {
    // =======================================
    // LINE Login App Config
    // Replace these with your real LINE Login Channel credentials
    // =======================================
    const CONFIG = {
        CHANNEL_ID: '2010346499',                    // ← Replace with your LINE Login Channel ID
        CHANNEL_SECRET: 'f6507ee7ad88069a100c450e7c419265',                          // ← นำ Channel Secret ของ LINE มาวางตรงนี้ (ถ้าไม่ใช้ Edge Function)
        REDIRECT_URI: window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'index.html',
        SCOPE: 'profile openid email',
        STATE_KEY: 'sgov_line_state',
        USERS_KEY: 'sgov_line_users',
        SESSION_KEY: 'sgov_citizen_session',
        LOGIN_LOG_KEY: 'sgov_login_log',
        // Forced to false to ensure real LINE Auth redirect happens even on localhost/file protocols
        DEMO_MODE: false
    };

    // =======================================
    // Generate random state for CSRF protection
    // =======================================
    function generateState() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }

    // =======================================
    // Initiate LINE Login
    // Demo mode: simulate locally
    // Production: redirect to LINE OAuth
    // =======================================
    function initiateLogin() {
        if (window.location.protocol === 'file:') {
            alert("ข้อผิดพลาด: ไม่สามารถใช้งาน LINE Login ผ่านการเปิดไฟล์โดยตรง (file://) ได้\n\nกรุณารันผ่าน Web Server เช่น VS Code Live Server (http://localhost:5500/index.html) แล้วไปเพิ่ม Callback URL ใน LINE Developers ให้ตรงกันครับ");
            document.getElementById('lineLoginBtn').disabled = false;
            document.getElementById('lineLoginBtn').innerHTML = '<i class="fa-brands fa-line me-2 fa-lg"></i>เข้าสู่ระบบด้วย LINE';
            return;
        }

        if (CONFIG.DEMO_MODE) {
            // --- DEMO MODE: simulate LINE callback locally ---
            const demoCode = 'demo_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
            const state = generateState();
            sessionStorage.setItem(CONFIG.STATE_KEY, state);
            // Simulate redirect back with code & state
            const url = new URL(window.location.pathname, window.location.origin);
            url.searchParams.set('code', demoCode);
            url.searchParams.set('state', state);
            window.location.href = url.toString();
            return;
        }

        // --- PRODUCTION: redirect to LINE OAuth (without Supabase) ---
        const state = generateState();
        sessionStorage.setItem(CONFIG.STATE_KEY, state);

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: CONFIG.CHANNEL_ID,
            redirect_uri: CONFIG.REDIRECT_URI,
            state: state,
            scope: CONFIG.SCOPE,
            bot_prompt: 'aggressive'
        });

        window.location.href = `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`;
    }

    // =======================================
    // Handle OAuth callback (parse URL params)
    // =======================================
    function handleCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
            console.error('LINE Login Error:', error, params.get('error_description'));
            return { success: false, error: params.get('error_description') || error };
        }

        if (!code) {
            return { success: false, error: null }; // Not a callback, normal page load
        }

        // Verify state for CSRF protection
        const savedState = sessionStorage.getItem(CONFIG.STATE_KEY);
        if (state !== savedState) {
            console.error('State mismatch! Possible CSRF attack.');
            return { success: false, error: 'การยืนยันตัวตนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง' };
        }

        sessionStorage.removeItem(CONFIG.STATE_KEY);

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);

        return { success: true, code: code };
    }

    // =======================================
    // Exchange code for profile
    // Demo mode: generate consistent mock profile
    // Production: call your backend API
    // =======================================
    async function getLineProfile(result) {
        const code = typeof result === 'string' ? result : (result && result.code);
        if (!code) return null;

        if (CONFIG.DEMO_MODE) {
            // Generate a consistent userId per browser (so "returning user" works)
            const browserId = navigator.userAgent.length.toString(36) + screen.width + screen.height;
            let hash = 0;
            for (let i = 0; i < browserId.length; i++) {
                hash = ((hash << 5) - hash) + browserId.charCodeAt(i);
                hash |= 0;
            }
            const mockId = 'Udemo' + Math.abs(hash).toString(16).padStart(12, '0');
            return {
                userId: mockId,
                displayName: 'LINE Demo User',
                pictureUrl: 'https://ui-avatars.com/api/?name=LINE+User&background=06C755&color=fff&size=200&bold=true',
                email: null
            };
        }

        // --- PRODUCTION: call Supabase Edge Function to exchange code → token → profile ---
        if (typeof supabaseClient !== 'undefined' && supabaseClient) {
            try {
                const { data, error } = await supabaseClient.functions.invoke('line-auth', {
                    body: { code: code, redirect_uri: CONFIG.REDIRECT_URI, client_id: CONFIG.CHANNEL_ID }
                });

                if (!error && data && data.profile) {
                    return data.profile;
                } else {
                    console.warn("Edge Function failed or returned no profile. Falling back to next method.", error);
                }
            } catch (err) {
                console.warn("Edge Function network error. Falling back to next method.", err);
            }
        }

        // --- PRODUCTION: call Vercel Serverless Function ---
        if (CONFIG.CHANNEL_SECRET) {
            try {
                const res = await fetch('/api/line-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        code: code,
                        redirect_uri: CONFIG.REDIRECT_URI,
                        client_id: CONFIG.CHANNEL_ID,
                        client_secret: CONFIG.CHANNEL_SECRET
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.profile) {
                        return data.profile;
                    }
                } else {
                    const errorData = await res.json().catch(() => ({}));
                    console.warn("Vercel API failed:", res.status, errorData);
                    if (window.location.hostname.includes('vercel.app')) {
                        alert("เกิดข้อผิดพลาด: " + (errorData.description || errorData.details || errorData.error || `HTTP ${res.status}`));
                        return null;
                    }
                }
            } catch(e) {
                console.warn("Vercel API network error", e);
            }
        }

        // Fallback to mock profile if all fail (usually for local development without Vercel CLI)
        if (window.location.hostname.includes('vercel.app')) {
            // Do not fallback on production! 
            alert("ไม่สามารถดึงข้อมูลจาก LINE ได้ กรุณาตรวจสอบการตั้งค่า LINE Login Channel หรือ Vercel API");
            return null;
        }

        console.log("Using Mock Profile Fallback (Local Development)");
        const browserId = navigator.userAgent.length.toString(36) + screen.width + screen.height;
        let hash = 0;
        for (let i = 0; i < browserId.length; i++) {
            hash = ((hash << 5) - hash) + browserId.charCodeAt(i);
            hash |= 0;
        }
        const mockId = 'Ufallback' + Math.abs(hash).toString(16).padStart(12, '0');
        return {
            userId: mockId,
            displayName: 'LINE User (Fallback)',
            pictureUrl: 'https://ui-avatars.com/api/?name=LINE+User&background=06C755&color=fff&size=200&bold=true',
            email: null
        };
    }

    // =======================================
    // Session management
    // =======================================
    function createSession(userData) {
        const session = {
            ...userData,
            loginAt: new Date().toISOString()
        };
        localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(session));
        logLogin(userData.lineUserId, userData.lineName);
        return session;
    }

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(CONFIG.SESSION_KEY));
        } catch {
            return null;
        }
    }

    function clearSession() {
        localStorage.removeItem(CONFIG.SESSION_KEY);
    }

    function isLoggedIn() {
        return !!getSession();
    }

    // =======================================
    // Login log
    // =======================================
    function logLogin(lineUserId, lineName) {
        try {
            const logs = JSON.parse(localStorage.getItem(CONFIG.LOGIN_LOG_KEY)) || [];
            logs.push({
                lineUserId,
                lineName,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent
            });
            // Keep last 100 logs
            if (logs.length > 100) logs.splice(0, logs.length - 100);
            localStorage.setItem(CONFIG.LOGIN_LOG_KEY, JSON.stringify(logs));
        } catch {
            // Silent fail for logging
        }
    }

    // =======================================
    // Validate Thai National ID (13 digits)
    // =======================================
    function validateNationalId(id) {
        if (!/^\d{13}$/.test(id)) return false;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(id[i]) * (13 - i);
        }
        const check = (11 - (sum % 11)) % 10;
        return check === parseInt(id[12]);
    }

    // =======================================
    // Validate phone number (Thai format)
    // =======================================
    function validatePhone(phone) {
        return /^0[0-9]{8,9}$/.test(phone.replace(/[-\s]/g, ''));
    }

    // =======================================
    // Validate email
    // =======================================
    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    // =======================================
    // Check if national ID already used by another LINE account
    // =======================================
    function isNationalIdTaken(nationalId, excludeLineUserId = null) {
        const users = getAllUsers();
        for (const [uid, user] of Object.entries(users)) {
            if (uid !== excludeLineUserId && user.nationalId === nationalId) {
                return true;
            }
        }
        return false;
    }

    // =======================================
    // Public API
    // =======================================
    return {
        CONFIG,
        initiateLogin,
        handleCallback,
        getLineProfile,
        createSession,
        getSession,
        clearSession,
        isLoggedIn,
        validateNationalId,
        validatePhone,
        validateEmail,
        isNationalIdTaken,
        logLogin
    };
})();
