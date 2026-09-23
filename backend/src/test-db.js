import prisma from "./lib/prisma.js";

try {
  await prisma.$connect();
  console.log("✅ Campus360 database connected successfully!");
} catch (error) {
  console.error("❌ Database connection failed:");
  console.error(error);
} finally {
  await prisma.$disconnect();
}