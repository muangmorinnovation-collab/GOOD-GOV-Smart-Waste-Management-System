// assets/js/supabase-client.js
// Supabase Client Initialization
// Requires importing the Supabase JS library via CDN in your HTML files before this script:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

// Derived from the JWT payload ref: 'gyerfzrbfczrdxzbkjyt'
const SUPABASE_URL = 'https://hghfomccjuuvolqwaehj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnaGZvbWNjanV1dm9scXdhZWhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5ODcyNDcsImV4cCI6MjA5NjU2MzI0N30.MHkjzusAZEBVG2ouRVPrI_wqwdVZMXpsJzJLtTcRYcQ';

let supabaseClient = null;

// Initialize only if the library is loaded and keys are provided
if (typeof window.supabase !== 'undefined' && SUPABASE_URL) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
    });
    console.log("Supabase Client Initialized.");
} else {
    console.warn("Supabase library not loaded or credentials not provided. Running in UI-only mode.");
}

// Example Mock Functions for Frontend Logic if Supabase is not configured
const mockAuth = {
    login: async (email, password) => {
        // Mock successful login
        console.warn("Using mock auth login. Supabase is not configured.");
        return { data: { user: { id: 1, email: email, user_metadata: { full_name: 'สมชาย ใจดี' } } }, error: null };
    },
    logout: async () => {
        return { error: null };
    }
};

// Global Auth Functions Wrapper
const authService = {
    login: async (email, password) => {
        if (!supabaseClient) return mockAuth.login(email, password);
        return await supabaseClient.auth.signInWithPassword({ email, password });
    },
    logout: async () => {
        if (!supabaseClient) return mockAuth.logout();
        return await supabaseClient.auth.signOut();
    },
    getUser: async () => {
        if (!supabaseClient) return null;
        const { data: { user } } = await supabaseClient.auth.getUser();
        return user;
    }
};
