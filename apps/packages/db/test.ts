import "dotenv/config";
import { prisma } from "./src/client.js";

console.log("DATABASE_URL:", process.env.DATABASE_URL);

async function test() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");

    const userCount = await prisma.user.count();
    console.log("User count:", userCount);

    await prisma.$disconnect();
  } catch (error: any) {
    console.error("❌ Database connection failed:");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Full error:", error);
  }
}

test();
