import { createOpenAI } from "@ai-sdk/openai";
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";

import { env } from "~/env";
import { createCaller } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { db } from "~/server/db";
import { assessRiskForPhone } from "~/server/services/assessRisk";

const maia =
  env.MAIA_API_KEY && env.MAIA_BASE_URL
    ? createOpenAI({ apiKey: env.MAIA_API_KEY, baseURL: env.MAIA_BASE_URL })
    : null;

const KNOWLEDGE_BASE = `
KNOWLEDGE BASE (Gunakan ini sebagai acuan utama, jangan berhalusinasi):
- Hukum OJK terkait Debt Collector (DC): Penagihan hanya boleh pada pukul 08:00 - 20:00 waktu setempat.
- DC dilarang menggunakan kekerasan fisik maupun verbal, dan tidak boleh menagih ke pihak yang tidak berutang (seperti keluarga atau kontak darurat tanpa persetujuan).
- Jika nasabah merasa diancam atau dipermalukan, sarankan untuk melapor ke OJK (157) atau Polisi.
- Pinjaman legal wajib membatasi total denda + bunga maksimal 100% dari pokok pinjaman.
`;

const SYSTEM_PROMPT = [
  "Kamu adalah Nera, asisten finansial AI untuk mahasiswa Indonesia yang sedang mempertimbangkan pinjaman (pinjol, cicilan, dsb).",
  "Gaya bicara: santai tapi jelas, bahasa Indonesia sehari-hari, tanpa jargon keuangan. Balasan singkat (2-5 kalimat), bukan esai.",
  "Kalau mahasiswa menyebutkan angka pinjaman (nominal, bunga, biaya, tenor) dalam kalimat apapun, pakai tool assessLoanRisk — jangan hitung sendiri, jangan minta mereka pakai format command tertentu, ekstrak angkanya dari kalimat natural mereka.",
  "Kalau mereka bilang sudah menyisihkan uang hari ini untuk cicilan, pakai tool checkIn.",
  "Kalau mereka nanya progress/sisa tunggakan, pakai tool getTrackingStatus.",
  "Kalau mereka nanya alternatif/opsi selain pinjol, pakai tool listRecommendations.",
  "Untuk pertanyaan umum soal keuangan/pinjaman yang tidak butuh tool, jawab langsung dari pengetahuanmu — tapi jangan pernah mengarang skor risiko atau angka simulasi, itu HARUS lewat assessLoanRisk.",
  "Jangan pernah menyarankan mahasiswa untuk berhutang lebih banyak demi menutup utang yang ada — itu awal dari spiral utang.",
  KNOWLEDGE_BASE
].join(" ");

function fallbackReply(): string {
  return "Maaf, aku lagi nggak bisa mikir jernih sekarang (koneksi AI lagi bermasalah). Coba lagi sebentar lagi, ya.";
}

// Reuses tracking/recommendations' existing tRPC procedures via the
// server-side caller (see root.ts's own JSDoc example) instead of
// duplicating their logic — same reasoning as assessRiskForPhone being
// extracted for risk.assess, just via the caller pattern since those
// routers weren't refactored into standalone service functions.
async function buildCaller() {
  const ctx = await createTRPCContext({
    headers: new Headers({ "x-api-key": env.SHARED_API_KEY }),
  });
  return createCaller(ctx);
}

// Multi-turn: loads prior turns for this phone, appends the new user
// message, lets the model call tools as needed (assessLoanRisk persists a
// RiskEntry exactly like the old /cek command did), then persists both the
// user message and the assistant's reply so the next turn has context.
export async function chatWithCoach(phone: string, userMessage: string): Promise<string> {
  if (!maia) {
    return fallbackReply();
  }

  const history = await db.chatMessage.findMany({
    where: { phone },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const caller = await buildCaller();

  try {
    const result = await generateText({
      model: maia("deepseek-v4-flash"),
      system: SYSTEM_PROMPT,
      messages: [
        ...history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: userMessage },
      ],
      tools: {
        assessLoanRisk: tool({
          description:
            "Hitung skor risiko dan simulasi biaya total pinjaman berdasarkan nominal pokok, bunga per tahun (%), biaya layanan, dan tenor (bulan).",
          inputSchema: z.object({
            principal: z.number().int().positive().describe("Nominal pokok pinjaman, dalam Rupiah"),
            interestRatePct: z.number().nonnegative().describe("Bunga per tahun, dalam persen"),
            serviceFee: z.number().int().nonnegative().describe("Biaya layanan/admin, dalam Rupiah"),
            tenorMonths: z.number().int().positive().describe("Tenor cicilan, dalam bulan"),
          }),
          execute: async (input) => {
            try {
              return await assessRiskForPhone({ phone, ...input });
            } catch {
              return { error: "Profil belum lengkap — isi dulu Financial Survival Check di aplikasi Nera." };
            }
          },
        }),
        checkIn: tool({
          description: "Catat bahwa mahasiswa sudah menyisihkan uang untuk cicilan hari ini.",
          inputSchema: z.object({}),
          execute: async () => {
            try {
              await caller.tracking.checkIn({ phone, source: "app" });
              return await caller.tracking.status({ phone });
            } catch {
              return { error: "Belum ada pinjaman yang di-track." };
            }
          },
        }),
        getTrackingStatus: tool({
          description: "Ambil progress pelunasan pinjaman yang sedang di-track mahasiswa saat ini.",
          inputSchema: z.object({}),
          execute: async () => {
            const status = await caller.tracking.status({ phone });
            return status ?? { message: "Belum ada pinjaman yang di-track." };
          },
        }),
        listRecommendations: tool({
          description: "Daftar alternatif pendanaan yang lebih aman daripada pinjol (dana darurat kampus, koperasi, dsb).",
          inputSchema: z.object({}),
          execute: async () => caller.recommendations.list(),
        }),
      },
      stopWhen: stepCountIs(5),
    });

    const reply = result.text.trim() || fallbackReply();

    await db.chatMessage.createMany({
      data: [
        { phone, role: "user", content: userMessage },
        { phone, role: "assistant", content: reply },
      ],
    });

    return reply;
  } catch (error) {
    console.error("[chatWithCoach] MAIA call failed", error);
    return fallbackReply();
  }
}
