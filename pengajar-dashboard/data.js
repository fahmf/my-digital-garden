// Mock data generator for I'dad Lughawi STDIIS evaluation dashboard
// Mirrors the real Google Sheet structure: Form Responses 1, Pengajar, Rekap

(function() {
  const PENGAJAR = [
    { name: "Ariangga Ramadhansyah, S.Ag.", gender: "L", initials: "AR" },
    { name: "Muhammad Fahrurrozi, B.A., M.H.", gender: "L", initials: "MF" },
    { name: "Muhammad Qozwaeni, S.Pd., M.Pd.", gender: "L", initials: "MQ" },
    { name: "Muhammad Rinaldo, B.A., M.H.", gender: "L", initials: "MR" },
    { name: "Muhammad Yusriel Amien, S.Ag.", gender: "L", initials: "MY" },
    { name: "Farchan Mu'aziz, S.H.", gender: "L", initials: "FM" },
    { name: "Zakaria, S.Pd.I.", gender: "L", initials: "ZK" },
    { name: "Ni'mazzad Al-Bahiy", gender: "L", initials: "NA" },
    { name: "Abdullah Hakim, Lc.", gender: "L", initials: "AH" },
    { name: "Hasan Mubarok, S.Pd.I.", gender: "L", initials: "HM" },
    { name: "Ibrahim Faiz, M.A.", gender: "L", initials: "IF" },
    { name: "Yusuf Mahendra, S.Ag.", gender: "L", initials: "YM" },
    { name: "Umar Tsabit, Lc., M.A.", gender: "L", initials: "UT" },
    { name: "Khalid Hidayat, S.Pd.", gender: "L", initials: "KH" },
    { name: "Ridho Aulia, S.Ag.", gender: "L", initials: "RA" },
    { name: "Salman Abdurrahman, B.A.", gender: "L", initials: "SA" },
    { name: "Ainun Nur Hasanah, S.Ag.", gender: "P", initials: "AN" },
    { name: "Al'Aina'ul Mardhiyah, S.Ag.", gender: "P", initials: "AM" },
    { name: "Lubna, S.Pd.I.", gender: "P", initials: "LU" },
    { name: "Fatimah Az-Zahra, S.Ag.", gender: "P", initials: "FZ" },
    { name: "Khadijah Rahma, M.Pd.", gender: "P", initials: "KR" },
    { name: "Maryam Salsabila, S.Pd.I.", gender: "P", initials: "MS" },
    { name: "Aisyah Nabila, Lc.", gender: "P", initials: "AY" },
    { name: "Hafsah Mumtaz, S.Ag.", gender: "P", initials: "HF" },
    { name: "Zainab Hanifah, M.A.", gender: "P", initials: "ZH" },
    { name: "Ruqayyah Salma, S.Pd.", gender: "P", initials: "RQ" },
    { name: "Ummu Habibah, B.A.", gender: "P", initials: "UH" },
  ];

  const KELAS_PUTRA = ["I'LL-pa-A", "I'LL-pa-B", "I'LL-pa-C", "I'LL-pa-D", "I'LP-pa-A", "I'LP-pa-B", "I'LP-pa-C"];
  const KELAS_PUTRI = ["I'LL-pi-A", "I'LL-pi-B", "I'LL-pi-C", "I'LP-pi-A", "I'LP-pi-B"];
  const MATKUL = ["Fahmul Masmu' & Ta'bir", "Fahmul Masmu' & Kitabah", "Qiraah", "Nahwu", "Sharaf", "Mufrodat"];

  const DIMENSIONS = [
    { key: "penguasaan", label: "Penguasaan Materi", short: "Penguasaan", col: "Skor Penguasaan Materi" },
    { key: "tugas_membantu", label: "Tugas Membantu", short: "Tugas", col: "Skor Tugas Membantu" },
    { key: "bhs_arab", label: "Penggunaan Bahasa Arab", short: "Bhs Arab", col: "Skor Penggunaan Bahasa Arab" },
    { key: "tugas_koreksi", label: "Tugas & Koreksi", short: "Koreksi", col: "Skor Tugas" },
    { key: "cara_mengajar", label: "Cara Mengajar", short: "Mengajar", col: "Skor Cara Mengajar" },
    { key: "suasana", label: "Suasana Kelas", short: "Suasana", col: "Skor Suasana Kelas" },
    { key: "profesional", label: "Profesionalitas", short: "Profesional", col: "Skor Profesionalitas" },
  ];

  const PERIODES = [
    { id: "2024-2", label: "Genap 24/25", start: "2025-04-15", end: "2025-05-15", expected: 580, active: false },
    { id: "2025-1", label: "Gasal 25/26", start: "2025-11-01", end: "2025-11-25", expected: 620, active: true, current: true },
  ];

  // Seedable PRNG for repeatability
  let seed = 42;
  function rand() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  function randInt(a, b) { return Math.floor(rand() * (b - a + 1)) + a; }
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
  function gauss(mean, sd) {
    let u = 1 - rand(), v = rand();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Per-pengajar baseline skill (75-95) so some are stronger than others
  const baselines = {};
  PENGAJAR.forEach((p, i) => {
    // create a spread so we have clear top/bottom
    const range = [70, 75, 78, 80, 82, 84, 86, 88, 90, 92, 95];
    baselines[p.name] = range[i % range.length] + (rand() * 4 - 2);
  });

  // Per-pengajar dimension weakness (each pengajar has 1-2 weak dimensions)
  const weaknesses = {};
  PENGAJAR.forEach(p => {
    const w = {};
    DIMENSIONS.forEach(d => w[d.key] = (rand() * 8 - 4));
    // bias one dimension lower
    const weakDim = DIMENSIONS[Math.floor(rand() * DIMENSIONS.length)].key;
    w[weakDim] = -8 - rand() * 4;
    weaknesses[p.name] = w;
  });

  // Score buckets (matching real form)
  const SCORE_LABELS = {
    100: ["Sangat menguasai & sangat mudah dipahami", "Sangat membantu", "Sangat konsisten, tidak pernah berbahasa selain Arab",
          "Selalu dikoreksi & sangat membantu", "Sangat menarik & bervariasi", "Sangat nyaman & mendukung diskusi", "Sangat profesional"],
    80:  ["Menguasai & mudah dipahami", "Membantu", "Konsisten, sangat jarang berbahasa selain Arab",
          "Sering dikoreksi & membantu", "Menarik & tidak monoton", "Nyaman & cukup mendukung", "Profesional"],
    60:  ["Cukup menguasai", "Cukup membantu", "Kadang berbahasa selain Arab",
          "Kadang dikoreksi", "Biasa saja", "Cukup nyaman", "Cukup profesional"],
    40:  ["Kurang menguasai", "Kurang membantu", "Sering berbahasa selain Arab",
          "Jarang dikoreksi", "Kurang menarik", "Kurang nyaman", "Kurang profesional"],
  };

  // Saran/feedback corpus per theme
  const POSITIVE = [
    "Penjelasan beliau sangat sistematis dan mudah dipahami, terutama saat menjelaskan kaidah nahwu yang rumit.",
    "Sering memberikan contoh kontekstual sehingga mudah diingat dan diaplikasikan.",
    "Beliau sangat sabar membimbing saat kami salah dalam pelafalan atau menjawab.",
    "Suasana kelas hidup karena beliau aktif mengajak diskusi dan tanya jawab.",
    "Memberikan tugas debat dan presentasi menggunakan bahasa Arab yang sangat melatih kemampuan berbicara.",
    "Konsisten menggunakan bahasa Arab di kelas, ini sangat membantu kami untuk terbiasa.",
    "Beliau menggunakan media seperti video dan permainan yang membuat pembelajaran tidak membosankan.",
    "Tepat waktu, materi selalu siap, dan tidak pernah terlambat masuk kelas.",
    "Memotivasi kami untuk tidak takut salah saat berbicara bahasa Arab.",
    "Cara menjelaskan beliau sangat jelas, tidak terlalu cepat, dan suara terdengar di seluruh kelas.",
    "Sering menyelipkan kisah-kisah inspiratif yang relevan dengan materi.",
    "Memberikan koreksi yang membangun dan tidak menjatuhkan.",
    "Variatif dalam metode mengajar, tidak hanya ceramah saja.",
    "Membuat suasana kelas seperti keluarga, nyaman untuk bertanya hal-hal mendasar.",
    "Sangat menguasai materi sampai ke akar-akarnya, kami percaya dengan jawaban beliau.",
  ];
  const SARAN = [
    "Mohon agar tugas tidak diberikan terlalu banyak di akhir pekan, karena bertabrakan dengan mata kuliah lain.",
    "Saran agar pengajar lebih sering memutar audio penutur asli untuk melatih istima'.",
    "Saya berharap pengajar sesekali memperlambat tempo bicara, terutama saat menjelaskan kaidah baru.",
    "Mohon agar koreksi tugas dikembalikan lebih cepat, agar kami bisa belajar dari kesalahan.",
    "Saya berharap ada lebih banyak praktik berbicara di kelas, bukan hanya teori.",
    "Mohon untuk lebih tegas terhadap mahasiswa yang ramai sendiri di belakang kelas.",
    "Saran saya agar kuis diberikan lebih rutin, mingguan misalnya, agar kami konsisten belajar.",
    "Saya harap pengajar tidak terlalu sering menggunakan bahasa Indonesia, karena membuat kami malas mencoba bahasa Arab.",
    "Mohon agar slide presentasi dibagikan setelah kelas, untuk kami baca ulang.",
    "Saya berharap pengajar sesekali menggunakan permainan atau ice-breaker agar suasana lebih hidup.",
    "Mohon untuk memperhatikan mahasiswa yang duduk di belakang, kadang kurang terdengar.",
    "Saran agar materi disampaikan tidak terlalu cepat, banyak yang belum sempat mencatat.",
    "Saya harap ada sesi konsultasi di luar jam kelas untuk mahasiswa yang tertinggal.",
    "Mohon untuk lebih sering melakukan simulasi percakapan sehari-hari.",
    "Saya berharap pengajar memberikan contoh dari kitab klasik agar kami terbiasa dengan teks aslinya.",
    "Mohon untuk memberikan feedback individual, bukan hanya umum di depan kelas.",
    "Saran saya agar tugas hafalan dikurangi dan diganti dengan praktik aplikasi.",
    "Saya berharap pengajar tidak terburu-buru mengakhiri kelas, sering bel sudah bunyi tapi materi belum selesai.",
    "Mohon untuk lebih memperhatikan rotasi giliran berbicara, kadang yang aktif itu-itu saja.",
    "Saya harap pengajar memberi waktu lebih untuk tanya jawab di akhir kelas.",
  ];
  const POSITIVE_SHORT = [
    "Sangat sabar.",
    "Penjelasan jelas dan runtut.",
    "Bahasa Arab beliau fasih sekali.",
    "Tepat waktu.",
    "Banyak ice-breaker, kelas tidak membosankan.",
    "Tegas tapi adil.",
    "Sudah sangat baik, jazakallahu khairan.",
    "Beliau guru terbaik semester ini.",
    "Variatif dalam mengajar.",
    "Suara lantang, semua kebagian dengar.",
    "Tugas-tugasnya bermanfaat.",
  ];
  const SARAN_SHORT = [
    "Tidak ada saran, sudah sangat baik.",
    "Mohon lebih pelan saat menjelaskan.",
    "Tugas jangan terlalu banyak.",
    "Lebih sering kuis.",
    "Mohon koreksi lebih cepat.",
    "Lebih banyak praktik berbicara.",
    "Sudah baik, lanjutkan.",
    "Mohon tepat waktu masuk kelas.",
    "Slide mohon dibagikan.",
    "Tidak ada.",
    "Alhamdulillah sudah maksimal.",
  ];

  function pickScore(base, dimAdjust) {
    const target = base + dimAdjust + gauss(0, 6);
    if (target >= 92) return 100;
    if (target >= 75) return 80;
    if (target >= 55) return 60;
    if (target >= 35) return 40;
    return 20;
  }

  function pickLabel(score, dimIdx) {
    if (score === 100) return SCORE_LABELS[100][dimIdx] || SCORE_LABELS[100][0];
    if (score === 80) return SCORE_LABELS[80][dimIdx] || SCORE_LABELS[80][0];
    if (score === 60) return SCORE_LABELS[60][dimIdx] || SCORE_LABELS[60][0];
    return SCORE_LABELS[40][dimIdx] || SCORE_LABELS[40][0];
  }

  function makeResponse(periode, pengajar, ts) {
    const isPutra = pengajar.gender === "L" ? rand() < 0.55 : rand() < 0.45;
    // (in real data, mahasiswa pi only review pi pengajar usually but we mix)
    const jk = isPutra ? "Laki-laki" : "Perempuan";
    const kelas = isPutra ? pick(KELAS_PUTRA) : pick(KELAS_PUTRI);
    const matkul = pick(MATKUL);
    const base = baselines[pengajar.name];
    const w = weaknesses[pengajar.name];

    const scores = {};
    DIMENSIONS.forEach((d, i) => {
      scores[d.col] = pickScore(base, w[d.key]);
    });
    const avg = DIMENSIONS.reduce((s, d) => s + scores[d.col], 0) / DIMENSIONS.length;

    // 60% chance of writing positive, 40% chance of writing saran
    const wrotePositive = rand() < 0.62;
    const wroteSaran = rand() < 0.48;
    const positive = wrotePositive ? (rand() < 0.5 ? pick(POSITIVE) : pick(POSITIVE_SHORT)) : "";
    const saran = wroteSaran ? (rand() < 0.5 ? pick(SARAN) : pick(SARAN_SHORT)) : "";

    return {
      timestamp: ts,
      periode: periode.id,
      jk,
      kelasPutra: isPutra ? kelas : "",
      matkulPutra: isPutra ? matkul : "",
      kelasPutri: isPutra ? "" : kelas,
      matkulPutri: isPutra ? "" : matkul,
      pengajar: pengajar.name,
      jenjang: kelas.startsWith("I'LL") ? "ILL" : "ILP",
      gender: isPutra ? "pa" : "pi",
      kelas,
      matkul,
      scores,
      avg,
      positive,
      saran,
      // rating labels
      labels: DIMENSIONS.reduce((o, d, i) => { o[d.key] = pickLabel(scores[d.col], i); return o; }, {}),
    };
  }

  // Generate responses
  const responses = [];
  PERIODES.forEach(per => {
    const start = new Date(per.start).getTime();
    const end = new Date(per.end).getTime();
    PENGAJAR.forEach(p => {
      // slight per-period drift
      const periodAdjust = per.id === "2024-1" ? -3 : per.id === "2024-2" ? -1.5 : 0;
      const respCount = randInt(15, 32);
      for (let i = 0; i < respCount; i++) {
        const ts = new Date(start + rand() * (end - start));
        const r = makeResponse(per, p, ts.toISOString());
        // apply period drift to scores
        DIMENSIONS.forEach(d => {
          r.scores[d.col] = Math.max(20, Math.min(100, r.scores[d.col] + periodAdjust));
        });
        r.avg = DIMENSIONS.reduce((s, d) => s + r.scores[d.col], 0) / DIMENSIONS.length;
        responses.push(r);
      }
    });
  });

  // Sort by timestamp
  responses.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Pretend last 5 came in within last hour (for live monitor)
  const now = new Date();
  for (let i = 1; i <= 5; i++) {
    const r = responses[responses.length - i];
    r.timestamp = new Date(now.getTime() - i * 9 * 60 * 1000).toISOString();
  }

  window.MOCK_DATA = {
    PENGAJAR,
    KELAS_PUTRA,
    KELAS_PUTRI,
    MATKUL,
    DIMENSIONS,
    PERIODES,
    responses,
    SCORE_LABELS,
  };
})();
