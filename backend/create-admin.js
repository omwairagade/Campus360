import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client.ts";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

const adminEmail = "admin@campus360.com";
const adminPassword = "Admin@Campus360123";

try {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: adminEmail,
    },
  });

  if (existingUser) {
    console.log("A user with this email already exists.");

    if (existingUser.role !== "ADMIN") {
      console.log(
        `Existing user role is ${existingUser.role}. No changes were made.`
      );
    } else {
      console.log("This account is already an ADMIN account.");
    }
  } else {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.create({
      data: {
        firstName: "Campus360",
        lastName: "Admin",
        email: adminEmail,
        passwordHash: hashedPassword,
        role: "ADMIN",
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    console.log("========================================");
    console.log("ADMIN ACCOUNT CREATED SUCCESSFULLY");
    console.log("========================================");
    console.log(admin);
    console.log("----------------------------------------");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log("----------------------------------------");
  }
} catch (error) {
  console.error("Failed to create admin:", error);
} finally {
  await prisma.$disconnect();
}