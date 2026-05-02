import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import obfuscator from 'vite-plugin-javascript-obfuscator';

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
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'systems.json', dest: '.' },
        { src: 'version.json', dest: '.' },
        { src: 'manifest.json', dest: '.' },
        { src: 'serviceWorker.js', dest: '.' },
        { src: 'assets/*', dest: 'assets' }
      ]
    }),
    obfuscator({
      include: ['**/env*.js'], // Only target the generated env.js chunk
      exclude: [/node_modules/],
      apply: 'build',
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1,
        numbersToExpressions: true,
        simplify: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 1
      }
    })
  ]
});
