/**
 * src/main.jsx — Entry point Vite untuk build produksi.
 *
 * File ini hanya dipakai saat build dengan Vite (npm run build).
 * Untuk no-build deployment, gunakan Dashboard.html langsung.
 *
 * Semua file component yang ada menggunakan pola window globals.
 * vite.config.js menyuntikkan React import + shim resolusi globals
 * ke setiap JSX file secara otomatis saat build — file sumber tidak diubah.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

// Buat React tersedia sebagai global agar kode legacy (const {useState} = React) bekerja
window.React = React;
window.ReactDOM = ReactDOM;

// Non-JSX files — load berurutan (window globals yang mereka set dibutuhkan file berikutnya)
import '../config.js';       // window.DASHBOARD_CONFIG
import '../data.js';         // window.MOCK_DATA
import '../data-loader.js';  // window.DataLoader

// JSX component files — vite.config.js menyuntikkan React import + global shims secara otomatis
import '../tweaks-panel.jsx';   // window.useTweaks, TweaksPanel, dll.
import '../components.jsx';     // window.Icon, Avatar, RadarChart, dll.
import '../tab-overview.jsx';   // window.OverviewTab
import '../tab-pengajar.jsx';   // window.PerPengajarTab
import '../tab-others.jsx';     // window.DimensiTab, PerGenderTab, PerJenjangTab
import '../tab-ai.jsx';         // window.AIInsightTab
import '../app.jsx';            // App shell + ReactDOM.createRoot()
