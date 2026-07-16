import type { PrismaClient } from "../../generated/prisma/index.js";
import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "baileys";

// Baileys' own `useMultiFileAuthState` is explicitly flagged "DO NOT USE IN
// PROD" by the current docs (inefficient file I/O, not durable across
// redeploys). This mirrors its shape but persists through Postgres via
// Prisma instead — a well-known community adapter pattern, not a novel
// design. Only WhatsappCreds/WhatsappSignalKey are touched here: infra state
// for the connection itself, never business data (that always goes through
// backend's API).
const CREDS_ROW_ID = 1;

function serialize(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, BufferJSON.replacer));
}

function deserialize<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value), BufferJSON.reviver) as T;
}

export async function useDbAuthState(prisma: PrismaClient): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const credsRow = await prisma.whatsappCreds.findUnique({
    where: { id: CREDS_ROW_ID },
  });

  const creds: AuthenticationCreds = credsRow
    ? deserialize(credsRow.data)
    : initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: Record<string, SignalDataTypeMap[typeof type]> = {};

          await Promise.all(
            ids.map(async (id) => {
              const row = await prisma.whatsappSignalKey.findUnique({
                where: { category_id: { category: type, id } },
              });

              if (!row) return;

              let value = deserialize<SignalDataTypeMap[typeof type]>(row.data);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(
                  value as object,
                ) as SignalDataTypeMap[typeof type];
              }
              data[id] = value;
            }),
          );

          return data;
        },
        set: async (data) => {
          const tasks: Promise<unknown>[] = [];

          for (const category of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
            const categoryData = data[category];
            if (!categoryData) continue;

            for (const id of Object.keys(categoryData)) {
              const value = categoryData[id];
              const key = { category, id };

              tasks.push(
                value
                  ? prisma.whatsappSignalKey.upsert({
                      where: { category_id: key },
                      create: { ...key, data: serialize(value) },
                      update: { data: serialize(value) },
                    })
                  : prisma.whatsappSignalKey
                      .delete({ where: { category_id: key } })
                      .catch(() => undefined),
              );
            }
          }

          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await prisma.whatsappCreds.upsert({
        where: { id: CREDS_ROW_ID },
        create: { id: CREDS_ROW_ID, data: serialize(creds) },
        update: { data: serialize(creds) },
      });
    },
  };
}
