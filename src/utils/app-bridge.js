/**
 * SAS Application Bridge v2
 * Standardizes configuration sharing and path resolution between the Portal and Sub-apps.
 */
(function() {
    console.log("🚀 SAS App Bridge Initializing...");

    // 1. Resolve Configuration
    // Priority: window.parent.ENV -> window.ENV -> localStorage
    window.ENV = window.parent.ENV || window.ENV || null;

    if (!window.ENV) {
        try {
            const saved = localStorage.getItem('sas_env_config');
            if (saved && saved !== "undefined") {
                window.ENV = JSON.parse(saved);
            }
        } catch(e) {
            console.error("❌ Failed to parse environment from localStorage:", e);
        }
    }

    if (window.ENV) {
        console.log("✅ Configuration Inherited from Portal");
    } else {
        console.warn("⚠️ No configuration found. Sub-app may be running standalone.");
    }

    // 2. Dynamic Path Resolution (Robust Version)
    const currentPath = window.location.pathname;
    const parts = currentPath.split('/');
    const lastPart = parts[parts.length - 1];
    
    // If the last segment is empty (ends in /) or contains a dot (is a file), 
    // the directory is everything up to the last slash.
    // Otherwise, the whole path is the directory.
    let subAppDir = (lastPart === "" || lastPart.includes('.'))
        ? parts.slice(0, -1).join('/') + '/'
        : currentPath + '/';

    // Ensure double slashes are cleaned up
    subAppDir = subAppDir.replace(/\/+/g, '/');

    const base = document.createElement('base');
    base.href = window.location.origin + subAppDir;
    document.head.prepend(base);
    
    console.log(`📍 Base Path Set: ${base.href}`);
    console.log(`🔍 Script resolution test: ${new URL('filehub_gdrive.js', base.href).href}`);

    // 3. Helper to load scripts properly (optional but safer)
    window.SAS = {
        version: "2.0.0",
        resolvePath: function(path) {
            // If path starts with /, it's relative to the domain root.
            // On GH Pages, we need to prepend the repo name if it's missing.
            if (path.startsWith('/') && isGitHubPages && !path.startsWith('/Centralized_SAS_repository')) {
                return '/Centralized_SAS_repository' + path;
            }
            return path;
        },
        loadScript: function(src) {
            return new Promise((resolve, reject) => {
                const s = document.createElement('script');
                s.src = this.resolvePath(src);
                s.onload = resolve;
                s.onerror = reject;
                document.body.appendChild(s);
            });
        }
    };
})();
