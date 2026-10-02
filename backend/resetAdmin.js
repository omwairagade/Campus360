import bcrypt from "bcrypt";
import dotenv from "dotenv";
import prisma from "./src/lib/prisma.js";

dotenv.config();

const email = "admin@campus360.com";
const password = "Admin@123";

try {
  const passwordHash = await bcrypt.hash(password, 10);

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: {
        email,
      },
      data: {
        passwordHash,
        role: "ADMIN",
        isActive: true,
        mustChangePassword: false,
      },
    });

    console.log("=================================");
    console.log("ADMIN PASSWORD RESET SUCCESSFUL");
    console.log("=================================");
  } else {
    await prisma.user.create({
      data: {
        firstName: "System",
        lastName: "Admin",
        email,
        passwordHash,
        role: "ADMIN",
        isActive: true,
        mustChangePassword: false,
      },
    });

    console.log("=================================");
    console.log("ADMIN ACCOUNT CREATED SUCCESSFULLY");
    console.log("=================================");
  }

  console.log("Email:", email);
  console.log("Password:", password);
  console.log("Role: ADMIN");
} catch (error) {
  console.error("ADMIN RESET ERROR:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}