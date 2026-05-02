import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/Centralized_SAS_repository/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        accountManager: resolve(__dirname, 'apps/account-manager/index.html'),
        attendanceScanner: resolve(__dirname, 'apps/attendance-scanner/index.html'),
        attendanceViewer: resolve(__dirname, 'apps/attendance-viewer/index.html'),
        fileHub: resolve(__dirname, 'apps/file-hub/index.html'),
        landingTemplate: resolve(__dirname, 'apps/landing-template/index.html'),
        mailer: resolve(__dirname, 'apps/mailer/index.html'),
        masterlistManager: resolve(__dirname, 'apps/masterlist-manager/index.html'),
        scheduleManager: resolve(__dirname, 'apps/schedule-manager/index.html')
      }
    }
  }
});
