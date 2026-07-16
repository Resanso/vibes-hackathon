import { createTRPCRouter, apiKeyProcedure } from "~/server/api/trpc";

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
}

// Placeholder seed data — no live institutional partners integrated yet.
// Swap/extend this list once real campus programs are confirmed.
const RECOMMENDATIONS: Recommendation[] = [
  {
    id: "dana-darurat-kampus",
    title: "Dana Darurat Kampus",
    description:
      "Bantuan dana darurat non-cicilan dari kampus untuk kebutuhan mendesak, biasanya lewat bagian kemahasiswaan.",
    category: "dana_darurat",
  },
  {
    id: "koperasi-mahasiswa",
    title: "Koperasi Mahasiswa",
    description:
      "Pinjaman dengan bunga jauh lebih rendah dari pinjol, dikelola bersama oleh mahasiswa untuk mahasiswa.",
    category: "koperasi",
  },
  {
    id: "cicilan-0-persen-kampus",
    title: "Cicilan 0% Platform Kampus",
    description:
      "Beberapa kampus punya kerja sama cicilan tanpa bunga untuk kebutuhan pendidikan (laptop, UKT, dsb).",
    category: "cicilan",
  },
  {
    id: "beasiswa-bantuan-bumn",
    title: "Beasiswa & Bantuan BUMN",
    description:
      "Program beasiswa atau bantuan biaya kuliah dari BUMN/pemerintah yang tidak perlu dikembalikan.",
    category: "beasiswa",
  },
  {
    id: "pinjaman-lunak-alumni",
    title: "Pinjaman Lunak Yayasan Alumni",
    description:
      "Sejumlah yayasan alumni menyediakan pinjaman lunak dengan bunga rendah dan tenor fleksibel untuk mahasiswa aktif.",
    category: "pinjaman_lunak",
  },
];

export const recommendationsRouter = createTRPCRouter({
  list: apiKeyProcedure.query(() => {
    return RECOMMENDATIONS;
  }),
});
