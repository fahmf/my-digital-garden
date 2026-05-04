import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Semua nama yang di-expose ke window oleh components.jsx dan tweaks-panel.jsx
const COMPONENT_GLOBALS = [
  'Icon', 'Avatar', 'Sparkline', 'BarChart', 'LineChart', 'RadarChart', 'ProgressRing',
  'scoreClass', 'scoreColor', 'fmtScore', 'fmtInt', 'relTime', 'avatarColor',
  'useTweaks', 'TweaksPanel', 'TweakSection', 'TweakRow',
  'TweakSlider', 'TweakToggle', 'TweakRadio', 'TweakSelect',
  'TweakText', 'TweakNumber', 'TweakColor', 'TweakButton',
];

// Nama tab components yang di-expose ke window oleh masing-masing tab file
const TAB_GLOBALS = [
  'OverviewTab', 'PerPengajarTab',
  'DimensiTab', 'PerGenderTab', 'PerJenjangTab',
  'AIInsightTab',
  'aggByPengajar', 'computeAgg', 'distribution',
];

// Helper globals dari tab-overview.jsx yang dipakai tab lain
const OVERVIEW_HELPERS = ['aggByPengajar', 'computeAgg', 'distribution'];

export default defineConfig({
  plugins: [
    // Plugin ini meng-inject React import + window-global compat shim ke setiap JSX file
    // sehingga file JSX existing (yang menggunakan pola globals) bisa diproses Vite
    // TANPA mengubah file sumber asli.
    {
      name: 'dashboard-global-compat',
      enforce: 'pre',
      transform(code, id) {
        if (!id.endsWith('.jsx') || id.includes('node_modules')) return null;

        // Inject React import (dibutuhkan Vite classic JSX runtime)
        let header = `import React from 'react';\n`;

        const base = path.basename(id);

        if (base === 'app.jsx') {
          // app.jsx butuh semua globals: component + tab
          const all = [...COMPONENT_GLOBALS, ...TAB_GLOBALS];
          header += all.map(g =>
            `if (typeof ${g} === 'undefined') var ${g} = window.${g};`
          ).join('\n') + '\n';
        } else if (/^tab-(overview|pengajar|others|ai)\.jsx$/.test(base)) {
          // Tab files butuh component globals dari components.jsx & tweaks-panel.jsx
          header += COMPONENT_GLOBALS.map(g =>
            `if (typeof ${g} === 'undefined') var ${g} = window.${g};`
          ).join('\n') + '\n';
          // tab-pengajar & tab-others juga pakai helper dari tab-overview
          if (base !== 'tab-overview.jsx') {
            header += OVERVIEW_HELPERS.map(g =>
              `if (typeof ${g} === 'undefined') var ${g} = window.${g};`
            ).join('\n') + '\n';
          }
        }

        return { code: header + code, map: null };
      },
    },
    // Plugin React dengan classic runtime agar `const {useState} = React` tetap bekerja
    react({ jsxRuntime: 'classic' }),
  ],

  root: '.',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'index.html',
    },
  },

  server: {
    open: '/index.html',
  },
});
