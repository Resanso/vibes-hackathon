import "dotenv/config";

import { PrismaClient } from "../../generated/prisma/index.js";
import { logger } from "../connection.js";
import { linkPersonalNumber } from "../personal/linkPersonalNumber.js";

// One-time manual pairing step for a student's personal number — QR scanning
// can't be automated or verified by an agent, so this is run by hand:
//   npm run link:number -- <phone, no leading + or 0>
const phone = process.argv[2];

if (!phone) {
  console.error("Usage: npm run link:number -- <phone-without-plus-or-leading-zero>");
  process.exit(1);
}

const prisma = new PrismaClient();

linkPersonalNumber(prisma, phone).catch((error: unknown) => {
  logger.error({ error }, "Failed to start personal-number linking session");
  process.exit(1);
});
