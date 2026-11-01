import {
  User,
  Workspace,
  FormTemplate,
  FormField,
  Participant,
  ParticipantStatus,
  Officer,
  AuditLog,
  ChecklistResponse,
} from "@/types/domain";

export const SEED_USERS: User[] = [
  {
    id: "user-admin",
    name: "Admin Utama",
    email: "admin@regicheck.id",
    role: "admin",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "user-officer-1",
    name: "Petugas Lapangan (Budi)",
    email: "petugas1@regicheck.id",
    role: "officer",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
  },
  {
    id: "user-unregistered",
    name: "Pengguna Luar (Belum Terdaftar)",
    email: "tamu@unknown.org",
    role: "officer",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80",
  },
];

export const SEED_TEMPLATES: FormTemplate[] = [
  {
    id: "tpl-pelatihan",
    name: "Standard Pelatihan Kewirausahaan & Profil",
    description: "Template form isian peserta pelatihan kewirausahaan UMKM",
    sampleColumns: [
      "Foto Profil",
      "NIK",
      "Nama Lengkap",
      "Email",
      "Nomor HP",
      "Asal Kota",
      "Nama Usaha",
      "Omset Bulanan"
    ],
    createdAt: "2026-10-01T08:00:00Z",
    updatedAt: "2026-10-01T08:00:00Z",
    items: [
      {
        id: "section-identitas",
        label: "Identitas & Profil Peserta",
        description: "Data diri utama peserta sesuai KTP dan profil usaha",
        type: "section",
        sourceType: "custom_field",
        required: false,
        editable: false,
        evidenceEnabled: false,
        evidenceRequired: false,
        order: 1,
        active: true,
      },
      {
        id: "field-foto",
        label: "Foto Profil Peserta",
        description: "Foto formal peserta untuk tanda pengenal kartu peserta",
        type: "image",
        sourceType: "excel_column",
        excelColumn: "Foto Profil",
        required: true,
        editable: true,
        evidenceEnabled: false,
        evidenceRequired: false,
        order: 2,
        active: true,
      },
      {
        id: "field-nik",
        label: "NIK (KTP)",
        description: "16 digit NIK resmi Dukcapil",
        type: "text",
        sourceType: "excel_column",
        excelColumn: "NIK",
        required: true,
        editable: true,
        evidenceEnabled: false,
        evidenceRequired: false,
        order: 3,
        active: true,
      },
      {
        id: "field-nama",
        label: "Nama Lengkap",
        description: "Nama sesuai KTP tanpa singkatan berlebih",
        type: "text",
        sourceType: "excel_column",
        excelColumn: "Nama Lengkap",
        required: true,
        editable: true,
        evidenceEnabled: false,
        evidenceRequired: false,
        order: 4,
        active: true,
      },
      {
        id: "item-hp-aktif",
        label: "Konfirmasi Nomor WhatsApp Aktif",
        description: "Nomor untuk koordinasi grup pelatihan",
        type: "phone",
        sourceType: "excel_column",
        excelColumn: "Nomor HP",
        required: true,
        editable: true,
        evidenceEnabled: false,
        evidenceRequired: false,
        validation: {
          regex: "^(08|\\+62)[0-9]{8,13}$",
        },
        order: 5,
        active: true,
      },
      {
        id: "section-usaha",
        label: "Profil Usaha UMKM",
        description: "Informasi bidang usaha dan estimasi omset bulanan peserta",
        type: "section",
        sourceType: "custom_field",
        required: false,
        editable: false,
        evidenceEnabled: false,
        evidenceRequired: false,
        order: 6,
        active: true,
      },
      {
        id: "item-kategori-usaha",
        label: "Kategori Usaha",
        description: "Bidang usaha yang dijalankan saat ini",
        type: "select",
        sourceType: "checklist_input",
        required: true,
        editable: true,
        evidenceEnabled: false,
        evidenceRequired: false,
        options: ["Kuliner / F&B", "Fashion & Tekstil", "Kerajinan Tangan (Craft)", "Jasa & Layanan", "Teknologi & Digital"],
        order: 7,
        active: true,
      },
      {
        id: "field-omset",
        label: "Omset Bulanan (Rp)",
        description: "Estimasi pendapatan usaha per bulan",
        type: "number",
        sourceType: "excel_column",
        excelColumn: "Omset Bulanan",
        required: false,
        editable: true,
        evidenceEnabled: false,
        evidenceRequired: false,
        order: 8,
        active: true,
      },
      {
        id: "section-berkas",
        label: "Verifikasi Berkas Fisik & Komitmen",
        description: "Pemeriksaan kelengkapan dokumen fisik di meja registrasi",
        type: "section",
        sourceType: "custom_field",
        required: false,
        editable: false,
        evidenceEnabled: false,
        evidenceRequired: false,
        order: 9,
        active: true,
      },
      {
        id: "item-ktp",
        label: "KTP Asli / Identitas Fisik",
        description: "Pastikan fisik KTP asli dicek langsung dan sesuai NIK",
        type: "checkbox",
        sourceType: "checklist_input",
        required: true,
        editable: true,
        evidenceEnabled: true,
        evidenceRequired: true,
        order: 10,
        active: true,
      },
      {
        id: "item-surat-pernyataan",
        label: "Surat Pernyataan Komitmen",
        description: "Ditandatangani di atas materai 10.000",
        type: "checkbox",
        sourceType: "checklist_input",
        required: true,
        editable: true,
        evidenceEnabled: true,
        evidenceRequired: false,
        order: 11,
        active: true,
      },
    ],
  },
  {
    id: "tpl-sertifikasi",
    name: "Sertifikasi Profesi Keahlian",
    description: "Form kelengkapan dokumen uji kompetensi",
    createdAt: "2026-10-05T09:00:00Z",
    updatedAt: "2026-10-05T09:00:00Z",
    items: [
      {
        id: "cert-ijazah",
        label: "Salinan Ijazah Terakhir",
        type: "checkbox",
        required: true,
        editable: true,
        evidenceEnabled: true,
        evidenceRequired: true,
        order: 1,
        active: true,
      },
      {
        id: "cert-cv",
        label: "Portofolio / CV Terbaru",
        type: "checkbox",
        required: true,
        editable: true,
        evidenceEnabled: true,
        evidenceRequired: true,
        order: 2,
        active: true,
      },
      {
        id: "cert-sk",
        label: "Surat Keterangan Bekerja",
        type: "checkbox",
        required: false,
        editable: true,
        evidenceEnabled: true,
        evidenceRequired: false,
        order: 3,
        active: true,
      },
    ],
  },
];

export const SEED_WORKSPACES: Workspace[] = [
  {
    id: "ws-kewirausahaan-2026",
    name: "Pelatihan Kewirausahaan UMKM 2026",
    description: "Kegiatan inkubasi dan pendampingan UMKM Batch 1",
    startDate: "2026-11-15",
    endDate: "2026-11-17",
    status: "active",
    templateId: "tpl-pelatihan",
    createdAt: "2026-10-10T10:00:00Z",
    updatedAt: "2026-10-10T10:00:00Z",
  },
  {
    id: "ws-sertifikasi-ti",
    name: "Uji Kompetensi Digital Marketing 2026",
    description: "Asesmen sertifikasi profesi nasional BNSP",
    startDate: "2026-11-20",
    endDate: "2026-11-22",
    status: "active",
    templateId: "tpl-sertifikasi",
    createdAt: "2026-10-12T14:30:00Z",
    updatedAt: "2026-10-12T14:30:00Z",
  },
  {
    id: "ws-arsip-2025",
    name: "Pelatihan Digital Talent Scholarship 2025 (Selesai)",
    description: "Program pelatihan tahun lalu",
    startDate: "2025-08-01",
    endDate: "2025-08-05",
    status: "archived",
    templateId: "tpl-pelatihan",
    createdAt: "2025-07-20T08:00:00Z",
    updatedAt: "2025-08-06T12:00:00Z",
  },
];

export const SEED_OFFICERS: Officer[] = [
  {
    id: "off-1",
    name: "Budi Santoso",
    email: "petugas1@regicheck.id",
    active: true,
    createdAt: "2026-10-10T10:00:00Z",
  },
  {
    id: "off-2",
    name: "Siti Rahma",
    email: "siti.rahma@regicheck.id",
    active: true,
    createdAt: "2026-10-10T10:05:00Z",
  },
  {
    id: "off-3",
    name: "Ahmad Fauzi",
    email: "ahmad.fauzi@regicheck.id",
    active: true,
    createdAt: "2026-10-10T10:05:00Z",
  },
  {
    id: "off-4",
    name: "Dewi Lestari",
    email: "dewi.lestari@regicheck.id",
    active: false,
    createdAt: "2026-10-11T09:00:00Z",
  },
];

// Generate sample participants for ws-kewirausahaan-2026
const NAMES = [
  "Andi Saputra", "Budi Santoso", "Citra Dewi", "Dedi Kurniawan", "Eka Pratiwi",
  "Fajar Nugraha", "Gita Gutawa", "Hendra Wijaya", "Indah Permata", "Joko Widodo",
  "Kartika Sari", "Lukman Hakim", "Maya Safitri", "Nurul Hidayah", "Oki Setiana",
  "Putra Pratama", "Qori Sandioriva", "Rian Ardianto", "Salsa Bila", "Taufik Hidayat"
];

export const SEED_PARTICIPANTS: Participant[] = [];
export const SEED_RESPONSES: ChecklistResponse[] = [];

// Seed 30 sample participants for demo
NAMES.forEach((name, idx) => {
  const pId = `part-${(idx + 1).toString().padStart(3, "0")}`;
  const nik = `3201${(100000000000 + idx * 7919).toString().slice(0, 12)}`;
  const phone = `081234567${(100 + idx).toString().slice(0, 3)}`;
  const email = `${name.toLowerCase().replace(/[^a-z]/g, "")}@gmail.com`;

  // status mix: first 10 complete, next 15 incomplete, 5 rejected
  let status: ParticipantStatus = "incomplete";
  if (idx < 10) status = "complete";
  else if (idx >= 25) status = "rejected";

  const avatars = [
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&auto=format&fit=crop&q=80"
  ];
  const photoUrl = avatars[idx % avatars.length];

  SEED_PARTICIPANTS.push({
    id: pId,
    workspaceId: "ws-kewirausahaan-2026",
    data: {
      "Foto Profil": photoUrl,
      "Nama Lengkap": name,
      "NIK": nik,
      "Email": email,
      "Nomor HP": phone,
      "Asal Kota": idx % 2 === 0 ? "Bandung" : "Jakarta",
      "Nama Usaha": `Karya ${name.split(" ")[0]} Mandiri`,
      "Omset Bulanan": (idx + 1) * 3500000,
    },
    status,
    createdAt: "2026-10-15T08:00:00Z",
    updatedAt: "2026-10-15T08:00:00Z",
  });

  // seed checklist response items
  if (status === "complete") {
    SEED_RESPONSES.push(
      {
        id: `resp-${pId}-1`,
        participantId: pId,
        checklistItemId: "item-ktp",
        value: true,
        status: "complete",
        evidence: [{ id: `ev-${pId}-1`, name: "ktp-scan.jpg", size: 245000, type: "image/jpeg" }],
        updatedBy: "petugas1@regicheck.id",
        updatedAt: "2026-10-16T10:00:00Z",
      },
      {
        id: `resp-${pId}-2`,
        participantId: pId,
        checklistItemId: "item-surat-pernyataan",
        value: true,
        status: "complete",
        updatedBy: "petugas1@regicheck.id",
        updatedAt: "2026-10-16T10:00:00Z",
      },
      {
        id: `resp-${pId}-3`,
        participantId: pId,
        checklistItemId: "item-hp-aktif",
        value: phone,
        status: "complete",
        updatedBy: "petugas1@regicheck.id",
        updatedAt: "2026-10-16T10:00:00Z",
      },
      {
        id: `resp-${pId}-4`,
        participantId: pId,
        checklistItemId: "item-kategori-usaha",
        value: "Kuliner",
        status: "complete",
        updatedBy: "petugas1@regicheck.id",
        updatedAt: "2026-10-16T10:00:00Z",
      }
    );
  } else if (status === "rejected") {
    SEED_RESPONSES.push(
      {
        id: `resp-${pId}-1`,
        participantId: pId,
        checklistItemId: "item-ktp",
        value: false,
        status: "rejected",
        notes: "Foto KTP buram dan NIK tidak terbaca jelas.",
        updatedBy: "petugas1@regicheck.id",
        updatedAt: "2026-10-16T11:00:00Z",
      }
    );
  } else {
    // incomplete: only filled 1 item
    SEED_RESPONSES.push(
      {
        id: `resp-${pId}-1`,
        participantId: pId,
        checklistItemId: "item-ktp",
        value: true,
        status: "complete",
        updatedBy: "petugas1@regicheck.id",
        updatedAt: "2026-10-16T11:30:00Z",
      }
    );
  }
});

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: "log-1",
    workspaceId: "ws-kewirausahaan-2026",
    timestamp: "2026-10-16T10:00:00Z",
    officerName: "Budi Santoso",
    officerEmail: "petugas1@regicheck.id",
    participantId: "part-001",
    participantName: "Andi Saputra",
    checklistItemId: "item-ktp",
    checklistItemLabel: "KTP / Identitas Resmi",
    action: "Verifikasi Berkas",
    previousValue: "Belum Diisi",
    newValue: "Lengkap (File Terlampir)",
  },
  {
    id: "log-2",
    workspaceId: "ws-kewirausahaan-2026",
    timestamp: "2026-10-16T11:00:00Z",
    officerName: "Budi Santoso",
    officerEmail: "petugas1@regicheck.id",
    participantId: "part-026",
    participantName: "Putra Pratama",
    checklistItemId: "item-ktp",
    checklistItemLabel: "KTP / Identitas Resmi",
    action: "Tolak Berkas",
    previousValue: "Belum Diisi",
    newValue: "Ditolak: Foto KTP buram",
  },
];

