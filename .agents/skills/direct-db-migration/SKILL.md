---
name: direct-db-migration
description: Use this skill whenever database migrations need to be applied in this project. Automatically runs Drizzle generate followed by direct script migration (`npm run db:migrate:direct`) avoiding Drizzle-kit internal shadow table issues.
---

# Direct DB Migration Skill

Gunakan alur ini setiap kali ada perubahan pada `src/lib/db/schema.ts` di proyek ini.

## Langkah-langkah Migrasi:

1. **Update Schema**: Edit `src/lib/db/schema.ts`.
2. **Generate SQL File**:
   ```bash
   npm run db:generate
   ```
3. **Migrate Secara Langsung**:
   Jalankan script custom migrator yang mengeksekusi statement SQL langsung via postgres client dan menangani idempotency:
   ```bash
   npm run db:migrate:direct
   ```

Script `scripts/migrate.ts` membaca semua file `.sql` di folder `drizzle/` secara urut, mengeksekusi `statement-breakpoint`, merekam nama file di tabel `__direct_migrations`, serta mengabaikan error jika kolom/tabel sudah pernah dibuat sebelumnya.
