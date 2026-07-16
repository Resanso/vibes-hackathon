# Design principles (shared, platform-agnostic)

Berlaku untuk semua sub-project UI di repo ini (web, mobile, dsb). Implementasi teknis
per-platform (nama token CSS/StyleSheet/ThemeData, cara pakai di komponen) ada di
`.claude/rules/design.md` masing-masing sub-project — misalnya
`mobile-app/.claude/rules/design.md` untuk NativeWind (belum ada, dibuat saat mobile-app
mulai punya screen). `backend` API-only, jadi tidak punya rules desain sendiri. File ini
hanya berisi prinsip yang tidak berubah lintas platform.

## Hindari default AI-generated look

Jangan otomatis jatuh ke pola yang overused kecuali diminta eksplisit:

- Krem/off-white + font serif + aksen terracotta/rust
- Background gelap + aksen neon/glow (ungu-di-atas-hitam, cyan-di-atas-hitam)
- Layout "broadsheet newspaper" (garis tebal, drop cap, blok teks multi-kolom)

Kalau tidak diminta salah satu dari ini, pilih arah lain secara sadar.

## Token plan sebelum coding

Sebelum menulis kode UI apapun, buat token plan singkat:

- **Palet warna**: 4-6 hex bernama dengan intent jelas (bukan sekadar "primary/secondary").
- **Peran tipografi**: typeface per peran — display, body, utility — jangan pakai satu font untuk semua.
- **Konsep layout**: satu kalimat tentang ide struktural (grid, asimetri, densitas) sebelum menyentuh markup.
- **Signature element**: satu elemen visual yang disengaja dan mudah dikenali (bentuk, pola gerak, komponen khas) yang jadi fingerprint produk ini.

Detail implementasi token (format CSS variable, StyleSheet, ThemeData, dsb) mengikuti
aturan teknis di sub-project masing-masing.

## Self-critique

Setelah token plan ditulis, review sendiri sebelum coding: kalau ada bagian yang
terasa seperti jawaban generik untuk brief serupa apapun (bukan pilihan yang
spesifik ke produk ini), revisi dan sebutkan apa yang diubah dan kenapa.

## Brand tokens (locked)

Nera (`mobile-app`) has a **final** brand identity — colors and typography
below are locked, not a starting point. The "Token plan sebelum coding" step
above no longer means re-deriving color/font choices for `mobile-app`; what's
still open per screen is only the **layout concept** and **signature
element**. Canonical files: `mobile-app/src/theme/colors.ts` +
`typography.ts` (raw values, for non-className consumers like SVG props) and
`mobile-app/tailwind.config.js` (className-based styling — `bg-primary`,
`font-display text-display`, etc.) — both hard-code the same values and must
stay in sync; see the comments in those files for why they aren't derived
from one shared source.

**Colors:**

| Name | Hex | Intent |
| --- | --- | --- |
| primary | `#6C5CE7` | primary actions, brand accent |
| secondary | `#4EA8FF` | secondary accent, focus rings |
| success | `#22C55E` | low-risk / positive status |
| warning | `#FBBF24` | medium-risk / caution status |
| error | `#EF4444` | high-risk status only — never the default for every risk state, see the "Kalau brand/produk belum ditentukan" tone note and `product-context.md`'s privacy/tone principle |
| neutral | `#0F172A` | body text, borders, dark UI elements |

**Typography** — Poppins, one weight per role (loaded via
`@expo-google-fonts/poppins`, each weight is its own font family name in
React Native, not a `fontWeight` value):

| Role | Weight | Size | Used for |
| --- | --- | --- | --- |
| display (H1) | Poppins Bold | 32px | main headline per screen |
| heading (H2) | Poppins SemiBold | 24px | sub-section headings |
| body | Poppins Regular | 16px | regular content text |

**Icons**: outline/line style, rounded stroke — `lucide-react-native` (its
icons are outline by default, no filled variant to accidentally pick).

Reusable components already built to these tokens: `PrimaryButton`,
`SecondaryButton`, `RiskScoreGauge`, `StatusToast` in
`mobile-app/src/components/`.

## Banned patterns

- Numbered markers seperti `01 / 02 / 03` sebagai label section dekoratif — hanya
  pakai kalau kontennya memang urutan/proses nyata (langkah, daftar berurutan).
  Jangan pakai hanya supaya terlihat "didesain".

## Quality floor

- Kontras teks terhadap background memenuhi WCAG AA minimal (4.5:1 untuk teks normal).
- Responsive sampai ke lebar viewport mobile.
- Keyboard focus state terlihat di semua elemen interaktif.
- Hormati `prefers-reduced-motion` — animasi non-esensial di-gate oleh preferensi ini.

## Kalau brand/produk belum ditentukan

Repo ini belum punya arah produk yang jelas untuk sub-project yang bersangkutan.

Kalau diminta membuat UI tanpa konteks produk lebih lanjut:

1. JANGAN diam-diam menebak subjek generik ("aplikasi produktivitas modern" atau
   sejenisnya) lalu langsung membuat token plan dari situ.

2. Pin dulu satu subjek konkret secara eksplisit dalam responsmu: satu kalimat
   tentang produk ini untuk siapa dan tugas utamanya apa — sebagai asumsi yang
   dinyatakan, bukan diam-diam.

3. Tanyakan ke user kalau task-nya besar (halaman baru/fitur baru). Untuk
   perubahan kecil (tweak spacing, ganti warna satu tombol), lanjutkan dengan
   asumsi yang sudah ada di token plan sebelumnya — jangan minta konfirmasi ulang
   tiap kali.

## Referensi brand/design system

<!-- Tidak ditemukan design system atau brand guideline di repo ini saat ditulis.
     Isi manual kalau ada, misal:
     - Figma file: <link>
     - Brand guide: <link atau path>
     - Design tokens source: <path> -->
