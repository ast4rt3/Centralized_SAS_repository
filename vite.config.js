import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';
// import obfuscator from 'vite-plugin-javascript-obfuscator';

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
        scheduleManager: resolve(__dirname, 'apps/schedule-manager/index.html')
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        { src: 'systems.txt', dest: '.' },
        { src: 'version.txt', dest: '.' },
        { src: 'manifest.webmanifest', dest: '.' },
        { src: 'serviceWorker.js', dest: '.' },
        { src: 'env.js', dest: '.' },
        { src: '.htaccess', dest: '.' },
        { src: 'assets/*', dest: 'assets' },
        { src: 'src/utils', dest: '.' },
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
