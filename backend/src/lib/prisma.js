import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { PrismaClient } from "../generated/prisma/client.ts";
import { PrismaPg } from "@prisma/adapter-pg";

// ============================================================
// LOAD BACKEND .ENV
// ============================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

// ============================================================
// CHECK DATABASE URL
// ============================================================

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not configured in backend/.env"
  );
}

// ============================================================
// PRISMA POSTGRESQL ADAPTER
// ============================================================

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

// ============================================================
// PRISMA CLIENT
// ============================================================

const prisma = new PrismaClient({
  adapter,
});

export default prisma;