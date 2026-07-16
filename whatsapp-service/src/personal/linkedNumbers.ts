import type { PrismaClient } from "../../generated/prisma/index.js";

// Session id for a student's personal WhatsApp number, linked purely for
// teror-detection monitoring — distinct from the bot's own session
// (connection.ts's BOT_SESSION_ID).
export function studentSessionId(phone: string): string {
  return `student:${phone}`;
}

export async function upsertLinkedNumber(prisma: PrismaClient, phone: string) {
  return prisma.linkedNumber.upsert({
    where: { phone },
    create: { phone, sessionId: studentSessionId(phone), status: "pending" },
    update: {},
  });
}

export async function setLinkedNumberStatus(
  prisma: PrismaClient,
  phone: string,
  status: "pending" | "connected" | "logged_out",
) {
  await prisma.linkedNumber.update({
    where: { phone },
    data: { status },
  });
}

export async function listActiveLinkedNumbers(prisma: PrismaClient) {
  return prisma.linkedNumber.findMany({
    where: { status: { in: ["pending", "connected"] } },
  });
}
