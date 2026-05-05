/**
 * SAS Application Bridge v2.1
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
        console.warn("⚠️ No configuration found. Sub-app may be running standalone. Attempting to load env.js...");
        
        // Attempt to load env.js from domain root or repo root
        const isGitHubPages = window.location.hostname.includes('github.io');
        const repoName = 'Centralized_SAS_repository';
        const rootPath = isGitHubPages ? `/${repoName}/env.js` : '/env.js';
        
        const script = document.createElement('script');
        script.src = rootPath;
        script.onload = () => console.log("✅ env.js loaded successfully from root.");
        script.onerror = () => console.error("❌ Failed to load env.js from " + rootPath);
        document.head.appendChild(script);
    }

    // 2. Dynamic Path Resolution (Robust Version)
    const currentPath = window.location.pathname;
    const parts = currentPath.split('/');
    const lastPart = parts[parts.length - 1];
    
    let subAppDir = (lastPart === "" || lastPart.includes('.'))
        ? parts.slice(0, -1).join('/') + '/'
        : currentPath + '/';

    subAppDir = subAppDir.replace(/\/+/g, '/');

    const base = document.createElement('base');
    base.href = window.location.origin + subAppDir;
    document.head.prepend(base);
    
    console.log(`📍 Base Path Set: ${base.href}`);

    // 3. Global SAS Helpers
    window.SAS = {
        version: "2.1.0",
        resolvePath: function(path) {
            const isGitHubPages = window.location.hostname.includes('github.io');
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
