/**
 * responsive.js
 * Smart Governance — Global Responsive Interactions
 * Handles: sidebar toggle, mobile interactions, resize events
 */

(function () {
    'use strict';

    // ---- Sidebar Toggle (Hamburger) ----
    function initMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const btn = document.getElementById('sidebarCollapse');
        if (!sidebar || !btn) return;

        // Create overlay if not exists
        let overlay = document.getElementById('sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }

        // Toggle handler (replace existing to avoid duplicates)
        btn.removeEventListener('click', toggleSidebar);
        btn.addEventListener('click', toggleSidebar);

        overlay.removeEventListener('click', closeSidebar);
        overlay.addEventListener('click', closeSidebar);

        // Close sidebar on ESC key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && sidebar.classList.contains('active')) {
                closeSidebar();
            }
        });

        // Close sidebar when navigating on mobile
        sidebar.querySelectorAll('a[href]').forEach(function (link) {
            link.addEventListener('click', function () {
                if (window.innerWidth < 992) {
                    closeSidebar();
                }
            });
        });
    }

    function toggleSidebar() {
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.toggle('active');
        if (overlay) overlay.classList.toggle('active');
    }

    function closeSidebar() {
        var sidebar = document.getElementById('sidebar');
        var overlay = document.getElementById('sidebar-overlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    // ---- Close sidebar on window resize to desktop ----
    function handleResize() {
        if (window.innerWidth >= 992) {
            closeSidebar();
        }
    }

    // ---- Wrap tables for mobile scroll ----
    function wrapTables() {
        document.querySelectorAll('.page-content table.table').forEach(function (table) {
            // Skip already wrapped
            if (table.parentElement.classList.contains('table-container')) return;

            var wrapper = document.createElement('div');
            wrapper.className = 'table-container';
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
    }

    // ---- Dynamic PWA setup ----
    async function setupDynamicPWA() {
        try {
            let settings = JSON.parse(localStorage.getItem('waste_settings') || '{}');
            
            // If local storage doesn't have the logo, try fetching from Supabase
            if (!settings.org_logo && typeof supabaseClient !== 'undefined' && supabaseClient) {
                try {
                    const { data } = await supabaseClient.from('waste_settings').select('org_logo, org_name').limit(1).single();
                    if (data) {
                        settings.org_logo = data.org_logo;
                        settings.org_name = data.org_name;
                        // Cache it locally so we don't have to fetch again
                        localStorage.setItem('waste_settings', JSON.stringify({ ...settings, ...data }));
                    }
                } catch (err) {
                    console.warn('Could not fetch PWA settings from Supabase:', err);
                }
            }

            const defaultLogo = 'assets/img/garuda.png';
            const orgLogo = settings.org_logo || defaultLogo;
            const orgName = settings.org_name || 'GOOD GOV';

            const manifestStr = JSON.stringify({
                "name": orgName,
                "short_name": orgName,
                "start_url": "./index.html",
                "display": "standalone",
                "background_color": "#0f1f3d",
                "theme_color": "#1a56db",
                "icons": [
                    {
                        "src": orgLogo,
                        "sizes": "192x192",
                        "type": "image/png",
                        "purpose": "any maskable"
                    },
                    {
                        "src": orgLogo,
                        "sizes": "512x512",
                        "type": "image/png",
                        "purpose": "any maskable"
                    }
                ]
            });
            const manifestUrl = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(manifestStr);

            let manifestLink = document.querySelector('link[rel="manifest"]');
            if (!manifestLink) {
                manifestLink = document.createElement('link');
                manifestLink.rel = 'manifest';
                document.head.appendChild(manifestLink);
            }
            manifestLink.href = manifestUrl;

            let stdIcon = document.querySelector('link[rel="icon"]');
            if (!stdIcon) {
                stdIcon = document.createElement('link');
                stdIcon.rel = 'icon';
                document.head.appendChild(stdIcon);
            }
            stdIcon.href = orgLogo;

            let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
            if (!appleIcon) {
                appleIcon = document.createElement('link');
                appleIcon.rel = 'apple-touch-icon';
                document.head.appendChild(appleIcon);
            }
            appleIcon.href = orgLogo;

            let themeMeta = document.querySelector('meta[name="theme-color"]');
            if (!themeMeta) {
                themeMeta = document.createElement('meta');
                themeMeta.name = 'theme-color';
                document.head.appendChild(themeMeta);
            }
            themeMeta.content = '#1a56db';
        } catch(e) {
            console.error('Failed to setup dynamic PWA', e);
        }
    }

    // ---- Init ----
    function init() {
        initMobileSidebar();
        wrapTables();
        setupDynamicPWA();
        window.addEventListener('resize', handleResize);
    }

    // Run on DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also re-init after dynamic sidebar build (app.js builds sidebar on DOMContentLoaded)
    var origBuildSidebar = window.buildSidebar;
    if (typeof origBuildSidebar === 'function') {
        window.buildSidebar = function () {
            origBuildSidebar.apply(this, arguments);
            initMobileSidebar();
        };
    }
})();
