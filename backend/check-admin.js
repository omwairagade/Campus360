import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client.ts";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

try {
  const users = await prisma.user.findMany({
    where: {
      role: "ADMIN",
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });

  console.log("ADMIN USERS:");
  console.log(users);
} catch (error) {
  console.error("Error checking admin users:", error);
} finally {
  await prisma.$disconnect();
}
