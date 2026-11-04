# Regi Check - Project Guide for Claude Code

## Arsitektur Proyek

Aplikasi web **Registration Checklist Management** berbasis Next.js 16.4.3 dengan App Router. Aplikasi ini adalah **frontend-only** yang mengandalkan backend API yang saat ini sedang dikembangkan.

### Struktur Folder

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth routes (login, access-denied, pending-approval)
│   ├── (dashboard)/       # Protected dashboard routes
│   │   ├── workspaces/[id]/  # Workspace detail pages (import, export, settings, sheet-sync, appscript-sync)
│   │   ├── templates/     # Form template management
│   │   ├── officers/      # Officer management
│   │   ├── audit-logs/    # Audit log viewer
│   │   └── profile/       # User profile
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── layout/           # Layout components (app-header)
│   ├── shared/           # Shared UI components (status-badge, media-preview-modal, etc.)
│   └── ui/               # shadcn/ui components
├── features/             # Feature-specific components and hooks
├── lib/                  # Core utilities and clients
│   ├── api/             # API client layer
│   ├── db/              # Drizzle ORM schema and queries
│   ├── storage/         # LocalStorage and IndexedDB helpers
│   ├── domain/          # Domain logic (status engine, etc.)
│   └── utils.ts         # Shared utilities (cn helper)
├── stores/               # Zustand state management
├── types/                # TypeScript types
│   └── domain.ts        # Domain-specific type definitions
└── meta/                 # Metadata and configuration
```

### Tech Stack

| Kategori | Teknologi |
|----------|-----------|
| Framework | Next.js 16.4.3 (App Router) |
| UI Library | React 19.3.0 + shadcn/ui 0.3.1 |
| Styling | Tailwind CSS 4 + Turbopack |
| Forms | React Hook Form 7.91 + Zod 4.6 |
| State | Zustand 5.0 |
| Database ORM | Drizzle ORM 0.45.4 (PostgreSQL) |
| Table | TanStack Table 9.3 |
| Excel | SheetJS (xlsx) 0.18 |
| Auth | Better Auth 1.7 |
| Icons | Lucide React |
| Charts | Recharts 3.8 |

### State Management Patterns

1. **Zustand** - Global state (workspaces, officers, ui state)
2. **LocalStorage** - Autosave checklist draft per workspace
3. **IndexedDB** - Offline drafts dan file queue untuk evidence upload

## Aturan Coding

### TypeScript Conventions

- **Strict mode enabled** (`strict: true` in tsconfig.json)
- Path aliases: `@/*` → `./src/*`
- All types defined in `src/types/domain.ts`
- Use explicit types for function parameters and return values

### Component Patterns

1. **shadcn/ui first** - Gunakan komponen shadcn/ui yang sudah ada
2. **Feature components** - Komponen spesifik fitur di `src/features/`
3. **Shared components** - Komponen reusable di `src/components/shared/`
4. **Server-side components** - Default, use `"use client"` only when needed

### Naming Conventions

- Components: `PascalCase` (e.g., `WorkspaceForm.tsx`)
- Hooks: `useCamelCase` (e.g., `useWorkspaceForm()`)
- Types: `PascalCase` (e.g., `Workspace`, `ChecklistResponse`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)
- API endpoints: `camelCase` (e.g., `/api/workspaces`)

### Error Handling

- API client (`src/lib/api/client.ts`) handles HTTP errors with automatic error parsing
- Display user-friendly error messages, show technical details in console
- Use try-catch untuk async operations yang critical
- IndexedDB fallback untuk offline operations

### Form Validation

- Zod schemas untuk semua form validation
- React Hook Form untuk form state management
- Server-side validation always required for any data mutation

## Database & Migrations

### Database Schema

PostgreSQL via Drizzle ORM. Schema located di `src/lib/db/schema.ts`.

**Main Tables:**
- `user` - Better Auth users
- `session`, `account`, `verification` - Better Auth tables
- `workspace` - Checklist workspaces
- `form_template`, `form_field` - Template system
- `participant` - Registration participants
- `checklist_response` - Participant responses
- `officer` - Officer accounts
- `audit_log` - Audit trail
- `sheet_sync_log`, `appscript_sync_log` - Sync history

### Migration Commands

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Generate migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:migrate:direct` | Run migration script directly (scripts/migrate.ts) |
| `npm run db:push` | Push schema to database (development only) |
| `npm run db:studio` | Open Drizzle Studio |

### Rules

- **Never** modify existing migrations
- Run `npm run db:generate` after schema changes
- Review generated migration before committing
- Use `db:push` only untuk development, bukan production

## Security Standards

### Authentication & Authorization

- Better Auth untuk Google OAuth login
- Session-based authentication via cookies
- Role-based access: `admin` vs `officer`
- Protected routes di `(dashboard)` folder
- Public routes di `(auth)` folder

### API Security

- Input validation dengan Zod schemas
- SQL injection prevention via Drizzle ORM parameterized queries
- XSS prevention via React's automatic escaping
- File upload validation (type, size limits)

### Data Protection

- Evidence files stored di Supabase S3-compatible storage
- Participants data encrypted at rest (PostgreSQL)
- Audit logs untuk tracking semua changes

### Environment Variables

Required (copy `.env.example` to `.env`):
```
DATABASE_URL=postgresql://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
SUPABASE_URL=...
SUPABASE_KEY=...
```

## Testing Instructions

### Current Testing Setup

- **No dedicated test framework** yet (Jest/Vitest not configured)
- Manual testing required untuk semua fitur

### Manual Testing Checklist

Before committing:
- [ ] Test di local development (`npm run dev`)
- [ ] Test form validation (valid & invalid inputs)
- [ ] Test offline mode (disconnect network)
- [ ] Test role-based access (admin vs officer)
- [ ] Test import/export Excel flows
- [ ] Test Google Sheets sync
- [ ] Test file upload (evidence)

### Running Tests

```bash
# Development server
npm run dev

# Production build
npm run build

# Linting
npm run lint
```

### Adding Tests

When adding tests:
- Unit tests: Vitest di `src/__tests__/`
- Integration tests: Playwright/Cypress
- Test files: `*.test.tsx` atau `*.spec.tsx`

## Items That Require Approval

### Changes That Need User Confirmation

1. **Database Schema Changes**
   - Adding/modifying tables
   - Adding/modifying columns
   - Changing constraints or relationships

2. **Authentication/Authorization Changes**
   - Modifying auth flow
   - Changing role permissions
   - Adding new auth providers

3. **Production Deployments**
   - Any production environment changes
   - Database migrations di production
   - Environment variable changes

4. **Third-Party Service Changes**
   - Adding new external dependencies
   - Changing Google Sheets/AppScript configuration
   - Modifying Supabase/S3 storage settings

5. **Breaking Changes**
   - API endpoint changes
   - Data model changes
   - UI flow changes

## Development Workflow

### New Feature Flow

1. Branch: `git checkout -b feature/your-feature`
2. Implement: Follow coding conventions
3. Test: Manual testing checklist
4. Commit: `git add . && git commit -m "feat: description"`
5. Push: `git push -u origin feature/your-feature`
6. PR: Create pull request with description

### Code Review Checklist

- [ ] Follows project conventions
- [ ] TypeScript types defined
- [ ] Error handling implemented
- [ ] No console errors/warnings
- [ ] Manual testing passed
- [ ] No hardcoded secrets
- [ ] API validation added

### Debugging Tips

- Check browser console untuk frontend errors
- Check terminal untuk backend errors
- Drizzle Studio: `npm run db:studio` untuk inspect database
- Use `navigator.onLine` untuk check offline status
- IndexedDB: gunakan browser DevTools → Application → IndexedDB
