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

    // ---- Init ----
    function init() {
        initMobileSidebar();
        wrapTables();
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
