import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
// import obfuscator from 'vite-plugin-javascript-obfuscator';

function envJsPlugin() {
  let env;
  return {
    name: 'env-js-plugin',
    configResolved(config) {
      const loaded = loadEnv(config.mode, process.cwd(), 'VITE_');
      env = { ...process.env, ...loaded };
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url.endsWith('env.js')) {
          res.setHeader('Content-Type', 'application/javascript');
          res.end(`window.ENV = ${JSON.stringify({
            BACKEND_GAS_URL: env.VITE_BACKEND_GAS_URL,
            GAS_PROJECT_EDIT_URL: env.VITE_GAS_PROJECT_EDIT_URL,
            CLOUDINARY_CLOUD_NAME: env.VITE_CLOUDINARY_CLOUD_NAME,
            CLOUDINARY_UPLOAD_PRESET: env.VITE_CLOUDINARY_UPLOAD_PRESET,
            SUPABASE_URL: env.VITE_SUPABASE_URL,
            SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
            YOUTUBE_PROXY_URL: env.VITE_YOUTUBE_PROXY_URL,
            SYSTEM_THEME: env.VITE_SYSTEM_THEME,
            TV_AUDIO_ENABLED: env.VITE_TV_AUDIO_ENABLED === 'true',
            TV_THEATER_MODE: env.VITE_TV_THEATER_MODE === 'true',
            systems: [
              { id: "attendance-scanner", name: "Attendance Scanner", url: "apps/attendance-scanner/index.html", section: "Attendance", roles: ["admin", "scanner"] },
              { id: "schedule-manager", name: "Schedule Manager", url: "apps/schedule-manager/index.html", section: "Attendance", roles: ["admin"] },
              { id: "attendance-viewer", name: "Attendance Tracker", url: "apps/attendance-viewer/index.html", section: "Attendance", roles: ["admin"] },
              { id: "nbsc-mailer", name: "NBSC Mailer", url: "apps/mailer/index.html", section: "Communications", roles: ["admin"] },
              { id: "lost-and-found", name: "Lost and Found", url: "https://lost-and-found-liart-seven.vercel.app/", section: "General Services", roles: ["admin"] },
              { id: "borrowers-log", name: "Borrowers Log", url: "https://borrowers-log.vercel.app/login", section: "General Services", roles: ["admin"] },
              { id: "masterlist-manager", name: "Masterlist Data Manager", url: "apps/masterlist-manager/index.html", section: "Data Management", roles: ["admin"] },
              { id: "account-manager", name: "Account Approvals", url: "apps/account-manager/index.html", section: "Data Management", roles: ["admin"] },
              { id: "file-hub", name: "File Hub", url: "apps/file-hub/index.html", section: "Personal", roles: ["admin", "user", "scanner", "uploader", "superadmin"] },
              { id: "uploader-management", name: "Content Upload", url: "#uploader-management", section: "Data Management", roles: ["admin", "superadmin", "uploader"] },
              { id: "service-manager", name: "Service Manager", url: "apps/service-manager/index.html", section: "Data Management", roles: ["admin"] }
            ]
          }, null, 2)};`);
          return;
        }
        next();
      });
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'env.js',
        source: `window.ENV = ${JSON.stringify({
          BACKEND_GAS_URL: env.VITE_BACKEND_GAS_URL,
          GAS_PROJECT_EDIT_URL: env.VITE_GAS_PROJECT_EDIT_URL,
          CLOUDINARY_CLOUD_NAME: env.VITE_CLOUDINARY_CLOUD_NAME,
          CLOUDINARY_UPLOAD_PRESET: env.VITE_CLOUDINARY_UPLOAD_PRESET,
          SUPABASE_URL: env.VITE_SUPABASE_URL,
          SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
          YOUTUBE_PROXY_URL: env.VITE_YOUTUBE_PROXY_URL,
          SYSTEM_THEME: env.VITE_SYSTEM_THEME,
          TV_AUDIO_ENABLED: env.VITE_TV_AUDIO_ENABLED === 'true',
          TV_THEATER_MODE: env.VITE_TV_THEATER_MODE === 'true',
          systems: [
            { id: "attendance-scanner", name: "Attendance Scanner", url: "apps/attendance-scanner/index.html", section: "Attendance", roles: ["admin", "scanner"] },
            { id: "schedule-manager", name: "Schedule Manager", url: "apps/schedule-manager/index.html", section: "Attendance", roles: ["admin"] },
            { id: "attendance-viewer", name: "Attendance Tracker", url: "apps/attendance-viewer/index.html", section: "Attendance", roles: ["admin"] },
            { id: "nbsc-mailer", name: "NBSC Mailer", url: "apps/mailer/index.html", section: "Communications", roles: ["admin"] },
            { id: "lost-and-found", name: "Lost and Found", url: "https://lost-and-found-liart-seven.vercel.app/", section: "General Services", roles: ["admin"] },
            { id: "borrowers-log", name: "Borrowers Log", url: "https://borrowers-log.vercel.app/login", section: "General Services", roles: ["admin"] },
            { id: "masterlist-manager", name: "Masterlist Data Manager", url: "apps/masterlist-manager/index.html", section: "Data Management", roles: ["admin"] },
            { id: "account-manager", name: "Account Approvals", url: "apps/account-manager/index.html", section: "Data Management", roles: ["admin"] },
            { id: "file-hub", name: "File Hub", url: "apps/file-hub/index.html", section: "Personal", roles: ["admin", "user", "scanner", "uploader", "superadmin"] },
            { id: "uploader-management", name: "Content Upload", url: "#uploader-management", section: "Data Management", roles: ["admin", "superadmin", "uploader"] },
            { id: "service-manager", name: "Service Manager", url: "apps/service-manager/index.html", section: "Data Management", roles: ["admin"] }
          ]
        }, null, 2)};`
      });
    }
  };
}

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        accountManager: resolve(__dirname, 'apps/account-manager/index.html'),
        attendanceScanner: resolve(__dirname, 'apps/attendance-scanner/index.html'),
        attendanceViewer: resolve(__dirname, 'apps/attendance-viewer/index.html'),
        documents: resolve(__dirname, 'apps/docs/index.html'),
        fileHub: resolve(__dirname, 'apps/file-hub/index.html'),
        landingTemplate: resolve(__dirname, 'apps/landing-template/index.html'),
        mailer: resolve(__dirname, 'apps/mailer/index.html'),
        masterlistManager: resolve(__dirname, 'apps/masterlist-manager/index.html'),
        scheduleManager: resolve(__dirname, 'apps/schedule-manager/index.html'),
        analytics: resolve(__dirname, 'apps/analytics/index.html')
      }
    }
  },
  plugins: [
    envJsPlugin(),
    viteStaticCopy({
      targets: [
        { src: 'systems.txt', dest: '.' },
        { src: 'version.txt', dest: '.' },
        { src: 'manifest.json', dest: '.' },
        { src: 'serviceWorker.js', dest: '.' },
        { src: '.htaccess', dest: '.' },
        { src: 'assets/', dest: '.' },
        { src: 'src/utils', dest: '.' },
        { src: 'src/core/global-presence.js', dest: '.' },
        { src: ['apps/**/*', '!apps/**/index.html'], dest: '.' }
      ]
    }),
    // obfuscator({
    //   // include: [/env\.js$/], 
    //   exclude: [/node_modules/, /env\.js$/],
    //   apply: 'build',
    //   options: {
    //     compact: true,
    //     controlFlowFlattening: true,
    //     controlFlowFlatteningThreshold: 1,
    //     numbersToExpressions: true,
    //     simplify: true,
    //     stringArray: true,
    //     stringArrayEncoding: ['base64'],
    //     stringArrayThreshold: 1,
    //     renameProperties: false
    //   }
    // })
  ]
});
