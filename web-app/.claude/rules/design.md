## Technical implementation

- Token warna &amp; tipografi dari token plan didaftarkan di `src/styles/globals.css`

  lewat blok `@theme`, bukan di-hardcode di className:

```css

  @theme {

    --color-ink: #1a1a1a;

    --color-accent: #...;

    --font-display: "...", sans-serif;

  }

```

- Pakai lewat utility class yang dihasilkan otomatis `bg-accent`, `text-ink`,

  `font-display`) — bukan `bg-[#1a1a1a]` arbitrary value berulang-ulang.

- Sebelum menambah komponen baru, cek pola styling yang sudah ada di

  `src/app/_components/post.tsx` supaya konsisten dengan yang sudah dipakai.

## Self-critique

Setelah token plan ditulis, review sendiri sebelum coding: kalau ada bagian yang

terasa seperti jawaban generik untuk brief serupa apapun (bukan pilihan yang

spesifik ke produk ini), revisi dan sebutkan apa yang diubah dan kenapa.

## Quality floor (tambahan)

* Kontras teks terhadap background memenuhi WCAG AA minimal (4.5:1 untuk teks normal).

## Kalau brand/produk belum ditentukan

Repo ini belum punya arah produk yang jelas (lihat bagian Brand reference di bawah).

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