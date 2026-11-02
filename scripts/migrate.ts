import postgres from "postgres";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("❌ DATABASE_URL tidak ditemukan di .env atau .env.local");
  process.exit(1);
}

const sql = postgres(databaseUrl, { max: 1 });

async function migrateDirectly() {
  console.log("🚀 Memulai direct SQL migration...");
  
  // Pastikan tabel tracking migrasi internal ada
  await sql`
    CREATE TABLE IF NOT EXISTS "__direct_migrations" (
      "id" serial PRIMARY KEY,
      "name" text NOT NULL UNIQUE,
      "applied_at" timestamp DEFAULT now() NOT NULL
    );
  `;

  const drizzleDir = path.join(process.cwd(), "drizzle");
  if (!fs.existsSync(drizzleDir)) {
    console.error("❌ Folder drizzle tidak ditemukan.");
    process.exit(1);
  }

  const files = fs
    .readdirSync(drizzleDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const appliedRows = await sql`SELECT name FROM "__direct_migrations"`;
  const appliedSet = new Set(appliedRows.map((r: any) => r.name));

  let countApplied = 0;

  for (const file of files) {
    if (appliedSet.has(file)) {
      continue;
    }

    console.log(`\n⏳ Menjalankan migrasi: ${file}...`);
    const filePath = path.join(drizzleDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const statements = content.split("--> statement-breakpoint");

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;
      try {
        await sql.unsafe(trimmed);
      } catch (err: any) {
        // Abaikan jika tabel atau kolom sudah ada (idempotency check)
        if (
          err.code === "42701" || // duplicate_column
          err.code === "42P07" || // duplicate_table
          err.code === "42710"    // duplicate_object
        ) {
          console.warn(`   ⚠️ Peringatan (bisa diabaikan): ${err.message}`);
        } else {
          console.error(`   ❌ Gagal mengeksekusi statement: ${trimmed}`);
          throw err;
        }
      }
    }

    await sql`INSERT INTO "__direct_migrations" ("name") VALUES (${file})`;
    console.log(`✅ Selesai: ${file}`);
    countApplied++;
  }

  if (countApplied === 0) {
    console.log("\n✨ Semua migrasi SQL sudah up-to-date (tidak ada file baru).");
  } else {
    console.log(`\n🎉 Berhasil menerapkan ${countApplied} file migrasi SQL!`);
  }

  await sql.end();
  process.exit(0);
}

migrateDirectly().catch(async (e) => {
  console.error("\n❌ Fatal error saat migrasi:", e);
  await sql.end();
  process.exit(1);
});
