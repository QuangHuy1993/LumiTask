// Simple Node.js script to create an initial user with Prisma + PostgreSQL.
// Run with: `node scripts/create-user.cjs`

/* eslint-disable @typescript-eslint/no-var-requires */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "khongnhodau1993@gmail.com";
  const password = "Daohuy2003@@";
  const username = "khongnhodau1993";
  const fullName = "Đào Huy";

  console.log(`Đang khởi tạo tài khoản: ${email}...`);

  try {
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        fullName,
        isActive: true,
      },
    });

    console.log("-----------------------------------------");
    console.log("✅ Tạo tài khoản thành công!");
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log("-----------------------------------------");
  } catch (error) {
    if (error && error.code === "P2002") {
      console.error("❌ Lỗi: Email hoặc Username đã tồn tại trong hệ thống.");
    } else {
      console.error("❌ Lỗi khi tạo tài khoản:", error);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();

