# Product Requirements Document (PRD)

## Aplikasi Checklist Kelengkapan Registrasi Peserta

Frontend Only

Next.js

Internal Application

Version 1.0

## 1. Project Overview

### 1.1 Nama aplikasi

Registration Checklist Management

### 1.2 Deskripsi

Aplikasi berbasis web untuk membantu petugas melakukan pemeriksaan kelengkapan dokumen dan persyaratan registrasi peserta kegiatan.

Admin dapat membuat workspace berdasarkan kegiatan, mengimpor data peserta dari Excel dengan format dinamis, mengatur template checklist, serta mendaftarkan petugas.

Petugas dapat login menggunakan akun Google, memilih workspace, mencari peserta, kemudian mengisi checklist kelengkapan registrasi.

Aplikasi menyediakan autosave lokal, indikator progres, status kelengkapan peserta, dan riwayat aktivitas.

### 1.3 Tujuan

- Mempermudah proses pemeriksaan kelengkapan registrasi.
- Mengurangi pemeriksaan manual menggunakan Excel atau kertas.
- Memungkinkan beberapa petugas mengerjakan peserta yang sama.
- Menyediakan konfigurasi checklist yang fleksibel.
- Mempermudah monitoring progres registrasi.
- Menyediakan export hasil pemeriksaan ke Excel.

### 1.4 Batasan proyek

PRD ini khusus untuk frontend application.

Termasuk:

- UI/UX dan navigasi.
- State management.
- LocalStorage autosave.
- Form dan validasi frontend.
- Excel parsing dan preview.
- Upload interface.
- Simulasi integrasi authentication dan API.
- Komponen reusable.

Tidak termasuk:

- Backend API.
- Implementasi database.
- Implementasi server-side authentication.
- Infrastruktur deployment.
- Implementasi object storage.
- Sinkronisasi multi-user secara backend.

Catatan: frontend tetap harus dirancang dengan kontrak API yang jelas agar backend dapat dikembangkan kemudian tanpa perlu merombak UI.

## 2. User Roles & Permissions

Terdapat dua role utama.

| Fitur                        | Admin | Petugas |
| ---------------------------- | ----- | ------- |
| Login Google                 | Ya    | Ya      |
| Membuat workspace            | Ya    | Tidak   |
| Mengedit workspace           | Ya    | Tidak   |
| Menghapus workspace          | Ya    | Tidak   |
| Import peserta               | Ya    | Tidak   |
| Import petugas               | Ya    | Tidak   |
| Mengatur template checklist  | Ya    | Tidak   |
| Mengubah checklist workspace | Ya    | Tidak   |
| Melihat semua peserta        | Ya    | Ya      |
| Mengisi checklist            | Ya    | Ya      |
| Mengubah checklist selesai   | Ya    | Ya      |
| Melihat audit log            | Ya    | Ya      |
| Export Excel                 | Ya    | Ya      |

Ketentuan akses:

- Admin ditentukan melalui role akun.
- Petugas terdaftar melalui daftar email yang diimpor atau ditempel.
- Petugas yang emailnya terdaftar otomatis diterima ketika login.
- Petugas yang tidak terdaftar melihat halaman akses ditolak.
- Semua petugas dalam workspace memiliki akses peserta yang sama.

## 3. Application Structure

### 3.1 Struktur navigasi

Application

&#x20;Dashboard

&#x20;Workspace

&#x20;Petugas

&#x20;Template Checklist

&#x20;Audit Log

&#x20;Profile

Menu ditampilkan berdasarkan role pengguna. Admin mendapatkan seluruh menu, sedangkan petugas mendapatkan menu operasional yang relevan.

### 3.2 Daftar halaman

| Halaman            | Route                       | Akses |
| ------------------ | --------------------------- | ----- |
| Login              | `/login`                    | Semua |
| Dashboard          | `/dashboard`                | Semua |
| Workspace          | `/workspaces`               | Semua |
| Workspace Detail   | `/workspaces/[id]`          | Semua |
| Create Workspace   | `/workspaces/create`        | Admin |
| Import Peserta     | `/workspaces/[id]/import`   | Admin |
| Checklist Settings | `/workspaces/[id]/settings` | Admin |
| Template Checklist | `/templates`                | Admin |
| Petugas            | `/officers`                 | Admin |
| Audit Log          | `/audit-logs`               | Semua |
| Profile            | `/profile`                  | Semua |

## 4. Core User Flow

### 4.1 Admin workflow

\#chatgpt-mermaid-\_r_li\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_li\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_li\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_li\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_li\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_li\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_li\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_li\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_li\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_li\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_li\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_li\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_li\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_li\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_li\_ p{margin:0;}#chatgpt-mermaid-\_r_li\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_li\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_li\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_li\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_li\_ .label text,#chatgpt-mermaid-\_r_li\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_li\_ .node rect,#chatgpt-mermaid-\_r_li\_ .node circle,#chatgpt-mermaid-\_r_li\_ .node ellipse,#chatgpt-mermaid-\_r_li\_ .node polygon,#chatgpt-mermaid-\_r_li\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_li\_ .rough-node .label text,#chatgpt-mermaid-\_r_li\_ .node .label text,#chatgpt-mermaid-\_r_li\_ .image-shape .label,#chatgpt-mermaid-\_r_li\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_li\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_li\_ .rough-node .label,#chatgpt-mermaid-\_r_li\_ .node .label,#chatgpt-mermaid-\_r_li\_ .image-shape .label,#chatgpt-mermaid-\_r_li\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_li\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_li\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_li\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_li\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_li\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_li\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_li\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_li\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_li\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_li\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_li\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_li\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_li\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_li\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_li\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_li\_ .icon-shape,#chatgpt-mermaid-\_r_li\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_li\_ .icon-shape p,#chatgpt-mermaid-\_r_li\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_li\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_li\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_li\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_li\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_li\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_li\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_li\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_li\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_li\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_li\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_li\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_li\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_li\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_li\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_li\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_li\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_li\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_li\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_li\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_li\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_li\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_li\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_li\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_li\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_li\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_li\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_li\_ .node rect,#chatgpt-mermaid-\_r_li\_ .node circle,#chatgpt-mermaid-\_r_li\_ .node ellipse,#chatgpt-mermaid-\_r_li\_ .node polygon,#chatgpt-mermaid-\_r_li\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_li\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_li\_ .mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_li\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_li\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_li\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Login GoogleDashboardCreate WorkspaceInput Nama Kegiatan danTanggalImport Peserta ExcelMapping KolomPreview dan ValidasiImport PesertaAtur Checklist WorkspaceImport Daftar PetugasWorkspace Aktif

### 4.2 Petugas workflow

\#chatgpt-mermaid-\_r_lp\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_lp\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_lp\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_lp\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_lp\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_lp\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_lp\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_lp\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_lp\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_lp\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_lp\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_lp\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_lp\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_lp\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_lp\_ p{margin:0;}#chatgpt-mermaid-\_r_lp\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_lp\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_lp\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_lp\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_lp\_ .label text,#chatgpt-mermaid-\_r_lp\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_lp\_ .node rect,#chatgpt-mermaid-\_r_lp\_ .node circle,#chatgpt-mermaid-\_r_lp\_ .node ellipse,#chatgpt-mermaid-\_r_lp\_ .node polygon,#chatgpt-mermaid-\_r_lp\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_lp\_ .rough-node .label text,#chatgpt-mermaid-\_r_lp\_ .node .label text,#chatgpt-mermaid-\_r_lp\_ .image-shape .label,#chatgpt-mermaid-\_r_lp\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_lp\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_lp\_ .rough-node .label,#chatgpt-mermaid-\_r_lp\_ .node .label,#chatgpt-mermaid-\_r_lp\_ .image-shape .label,#chatgpt-mermaid-\_r_lp\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_lp\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_lp\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_lp\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_lp\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_lp\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_lp\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_lp\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_lp\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_lp\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_lp\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_lp\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_lp\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_lp\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_lp\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_lp\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_lp\_ .icon-shape,#chatgpt-mermaid-\_r_lp\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_lp\_ .icon-shape p,#chatgpt-mermaid-\_r_lp\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_lp\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_lp\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_lp\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_lp\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_lp\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_lp\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_lp\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_lp\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_lp\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_lp\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_lp\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_lp\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_lp\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_lp\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_lp\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_lp\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_lp\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_lp\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_lp\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_lp\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_lp\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_lp\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_lp\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_lp\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_lp\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_lp\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_lp\_ .node rect,#chatgpt-mermaid-\_r_lp\_ .node circle,#chatgpt-mermaid-\_r_lp\_ .node ellipse,#chatgpt-mermaid-\_r_lp\_ .node polygon,#chatgpt-mermaid-\_r_lp\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_lp\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_lp\_ .mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_lp\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_lp\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_lp\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Login GoogleEmail Terdaftar?DashboardAkses DitolakPilih WorkspaceDaftar PesertaSearch PesertaPilih PesertaIsi ChecklistAutosave LocalSinkronisasi ServerStatus Peserta DiperbaruiYaTidak

### 4.3 Alur utama workspace

Workspace merupakan wadah seluruh aktivitas registrasi dalam satu kegiatan.

Contoh:

Pelatihan Kewirausahaan

Aktif

15–17 November 2026

# 120

Peserta

# 75

Lengkap

# 45

Belum lengkap

Progres kelengkapan

62,5%

Ilustrasi data dashboard, bukan data aktual.

Ketika workspace dibuka, aplikasi menampilkan:

- Sidebar kiri berisi daftar peserta.
- Panel kanan berisi checklist peserta yang dipilih.
- Header berisi informasi kegiatan.
- Indikator status dan autosave.
- Pencarian dan filter peserta.

## 5. Functional Requirements

### 5.1 Authentication

Menggunakan Google OAuth melalui Better Auth.

Frontend requirements:

- Tombol Login dengan Google.
- Menampilkan email dan foto profil pengguna.
- Menampilkan role pengguna.
- Loading state ketika login.
- Error state jika login gagal.
- Halaman akses ditolak untuk email tidak terdaftar.
- Tombol logout.

Acceptance criteria:

- Pengguna dapat memulai login menggunakan Google.
- UI membedakan Admin dan Petugas.
- Petugas yang belum terdaftar tidak dapat masuk ke halaman operasional.

Catatan: penerimaan petugas otomatis harus dikonfirmasi oleh backend. Frontend tidak boleh menganggap pengguna terotorisasi hanya berdasarkan LocalStorage.

### 5.2 Dashboard

Dashboard menampilkan ringkasan keseluruhan kegiatan.

Komponen:

- Total workspace.
- Workspace aktif.
- Total peserta.
- Peserta lengkap.
- Peserta belum lengkap.
- Peserta ditolak.
- Progres per workspace.
- Workspace terbaru.

Interaksi:

- Klik workspace untuk membuka detail.
- Filter berdasarkan tanggal kegiatan.
- Search workspace berdasarkan nama.

### 5.3 Workspace Management

Admin dapat membuat workspace.

Form workspace:

| Field              | Tipe     | Required |
| ------------------ | -------- | -------- |
| Nama kegiatan      | Text     | Ya       |
| Tanggal mulai      | Date     | Ya       |
| Tanggal selesai    | Date     | Ya       |
| Deskripsi          | Textarea | Tidak    |
| Template checklist | Select   | Tidak    |

Fitur:

- Create workspace.
- Edit workspace.
- Archive workspace.
- Delete workspace.
- Duplicate workspace.
- Search workspace.
- Filter workspace.

Ketentuan:

- Workspace harus memiliki nama kegiatan.
- Tanggal selesai tidak boleh lebih awal dari tanggal mulai.
- Workspace baru dapat menggunakan template global.
- Konfigurasi checklist yang digunakan workspace menjadi salinan independen dari template.

Penting: Perubahan template global tidak boleh otomatis mengubah checklist workspace yang sudah berjalan.

### 5.4 Participant Management

Setiap workspace mempunyai daftar peserta sendiri.

Layout utama:

[capterra.be](https://www.capterra.be/software/162481/weezevent?utm_source=chatgpt.com)

Panel kiri:

- Search peserta.
- Filter status.
- Daftar nama peserta.
- Nomor identitas sekunder jika tersedia.
- Badge status.
- Indikator progres checklist.

Panel kanan:

- Nama peserta.
- Informasi peserta.
- Daftar checklist.
- Status setiap checklist.
- Bukti upload.
- Keterangan.
- Status penyelesaian.

Filter peserta:

- Semua.
- Belum lengkap.
- Lengkap.
- Ditolak.

Fitur tambahan:

- Navigasi peserta sebelumnya/berikutnya.
- Menjaga peserta yang sedang dipilih ketika halaman diperbarui.
- Menampilkan jumlah peserta sesuai filter.
- Empty state jika tidak ada hasil pencarian.

### 5.5 Checklist Builder

Admin dapat mengelola template checklist global dan checklist khusus workspace.

[Form Builder | Create custom onboarding forms](https://images.openai.com/static-rsc-4/0Q8YA2ix9MEyI0pfvHZ9bZj2rGG67hLf_EnptqhA0xIhIodcrlCeLbF-KCNiJ6urFDxfiOsHoMmtyBqVp7g0zCx4M4pMTzQUbWn9dFCF9fCnLwJWKm8EjA6aeUtr4xC93iXreaCGgt_Pqfvk8QbdA69XpP8vnbjrPYR5rYZ-sas?purpose=inline)

[uniify.io](https://uniify.io/features/form-builder?utm_source=chatgpt.com)

Setiap checklist memiliki properti:

| Properti          | Deskripsi                 |
| ----------------- | ------------------------- |
| Label             | Nama item pemeriksaan     |
| Field Type        | Jenis input               |
| Required          | Wajib atau opsional       |
| Evidence          | Upload bukti              |
| Evidence Required | Bukti wajib atau opsional |
| Description       | Petunjuk pengisian        |
| Editable          | Bisa diedit atau tidak    |
| Regex             | Validasi pola input       |
| Options           | Pilihan select            |
| Order             | Urutan tampil             |
| Active            | Aktif/nonaktif            |

Tipe input yang didukung:

| Tipe     | Tampilan        |
| -------- | --------------- |
| Checkbox | Ya / Tidak      |
| Text     | Input teks      |
| Textarea | Teks panjang    |
| Number   | Angka           |
| Date     | Tanggal         |
| Select   | Dropdown        |
| Radio    | Pilihan tunggal |
| Email    | Email           |
| Phone    | Nomor telepon   |

Fitur builder:

- Tambah item.
- Edit item.
- Hapus item.
- Duplikasi item.
- Drag and drop untuk mengubah urutan.
- Aktif/nonaktifkan item.
- Preview hasil checklist.
- Pengaturan validasi.
- Pengaturan upload bukti.

Aturan status item:

| Status      | Kondisi                         |
| ----------- | ------------------------------- |
| Belum diisi | Tidak ada nilai                 |
| Lengkap     | Nilai valid dan memenuhi aturan |
| Ditolak     | Ditolak oleh petugas            |

Item opsional yang tidak diisi tidak menghalangi status peserta menjadi lengkap.

### 5.6 Checklist Participant Form

Ketika petugas memilih peserta, sistem menampilkan form checklist sesuai konfigurasi workspace.

Contoh:

Checklist Registrasi

Belum lengkap

Berkas Identitas

KTP tersedia

Upload foto KTP

Opsional

Upload bukti foto

JPG, PNG · Maksimal mengikuti konfigurasi

Data Kontak

Nomor telepon valid

Nomor telepon

Informasi Tambahan

Surat pernyataan tersedia

Keterangan

Autosave

Tersimpan lokal

Contoh visual interaksi checklist, bukan form operasional.

Ketentuan:

- Checklist muncul sesuai urutan konfigurasi.
- Petugas dapat mengisi item yang aktif.
- Bukti dapat diunggah jika item mendukung upload.
- Keterangan hanya muncul jika diaktifkan.
- Validasi dijalankan ketika input berubah atau kehilangan fokus.
- Item yang ditolak wajib mempunyai alasan penolakan.
- Perubahan checklist dapat dilakukan kembali kapan saja.
- Perubahan status peserta dihitung ulang setelah perubahan item.

### 5.7 Participant Status Engine

Status peserta dihitung berdasarkan hasil checklist.

| Status peserta | Aturan                                         |
| -------------- | ---------------------------------------------- |
| Belum lengkap  | Masih terdapat item wajib yang belum terpenuhi |
| Lengkap        | Seluruh item wajib terpenuhi                   |
| Ditolak        | Minimal terdapat satu item yang ditolak        |

Prioritas status: Ditolak → Belum lengkap → Lengkap.

Perlu dibedakan antara status item dan status peserta.

Contoh:

- 8 dari 10 item wajib terpenuhi: Belum lengkap.
- 10 dari 10 item wajib terpenuhi: Lengkap.
- Salah satu item ditolak: Ditolak.

## 6. Dynamic Excel Import Engine

Modul ini menjadi salah satu fitur utama aplikasi.

[Import files from Excel – Support](https://images.openai.com/static-rsc-4/dkHRnToJLSllhbHi6M0HoCVWz-sSxh_1WUip0vRpbVH8of24K4LpICX9QYwDDs5ZaO7mKKwJBC6XUxxdPO7wn3pcxGDbGJqlmJdM_TkokX-KgF0u4XriC6hdQ9Re-VHagdwIlup6Zf0adZMvrjldSUDRWU9jBDtEWFyJGk1lfHA?purpose=inline)

[support.monday.com](https://support.monday.com/hc/en-us/articles/360000219209-Import-files-from-Excel?utm_source=chatgpt.com)

### 6.1 Import workflow

\#chatgpt-mermaid-\_r_n7\_{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;fill:rgb(237, 237, 237);}@keyframes edge-animation-frame{from{stroke-dashoffset:0;}}@keyframes dash{to{stroke-dashoffset:0;}}#chatgpt-mermaid-\_r_n7\_ .edge-animation-slow{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 50s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_n7\_ .edge-animation-fast{stroke-dasharray:9,5!important;stroke-dashoffset:900;animation:dash 20s linear infinite;stroke-linecap:round;}#chatgpt-mermaid-\_r_n7\_ .error-icon{fill:rgb(48, 48, 48);}#chatgpt-mermaid-\_r_n7\_ .error-text{fill:rgb(237, 237, 237);stroke:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_n7\_ .edge-thickness-normal{stroke-width:1px;}#chatgpt-mermaid-\_r_n7\_ .edge-thickness-thick{stroke-width:3.5px;}#chatgpt-mermaid-\_r_n7\_ .edge-pattern-solid{stroke-dasharray:0;}#chatgpt-mermaid-\_r_n7\_ .edge-thickness-invisible{stroke-width:0;fill:none;}#chatgpt-mermaid-\_r_n7\_ .edge-pattern-dashed{stroke-dasharray:3;}#chatgpt-mermaid-\_r_n7\_ .edge-pattern-dotted{stroke-dasharray:2;}#chatgpt-mermaid-\_r_n7\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_n7\_ .marker.cross{stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_n7\_ svg{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:16px;}#chatgpt-mermaid-\_r_n7\_ p{margin:0;}#chatgpt-mermaid-\_r_n7\_ .label{font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_n7\_ .cluster-label text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_n7\_ .cluster-label span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_n7\_ .cluster-label span p{background-color:transparent;}#chatgpt-mermaid-\_r_n7\_ .label text,#chatgpt-mermaid-\_r_n7\_ span{fill:rgb(237, 237, 237);color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_n7\_ .node rect,#chatgpt-mermaid-\_r_n7\_ .node circle,#chatgpt-mermaid-\_r_n7\_ .node ellipse,#chatgpt-mermaid-\_r_n7\_ .node polygon,#chatgpt-mermaid-\_r_n7\_ .node path{fill:rgb(9, 23, 44);stroke:rgb(31, 78, 148);stroke-width:1px;}#chatgpt-mermaid-\_r_n7\_ .rough-node .label text,#chatgpt-mermaid-\_r_n7\_ .node .label text,#chatgpt-mermaid-\_r_n7\_ .image-shape .label,#chatgpt-mermaid-\_r_n7\_ .icon-shape .label{text-anchor:middle;}#chatgpt-mermaid-\_r_n7\_ .node .katex path{fill:#000;stroke:#000;stroke-width:1px;}#chatgpt-mermaid-\_r_n7\_ .rough-node .label,#chatgpt-mermaid-\_r_n7\_ .node .label,#chatgpt-mermaid-\_r_n7\_ .image-shape .label,#chatgpt-mermaid-\_r_n7\_ .icon-shape .label{text-align:center;}#chatgpt-mermaid-\_r_n7\_ .node.clickable{cursor:pointer;}#chatgpt-mermaid-\_r_n7\_ .root .anchor path{fill:rgb(175, 175, 175)!important;stroke-width:0;stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_n7\_ .arrowheadPath{fill:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_n7\_ .edgePath .path{stroke:rgb(175, 175, 175);stroke-width:1px;}#chatgpt-mermaid-\_r_n7\_ .flowchart-link{stroke:rgb(175, 175, 175);fill:none;}#chatgpt-mermaid-\_r_n7\_ .edgeLabel{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_n7\_ .edgeLabel p{background-color:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_n7\_ .edgeLabel rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_n7\_ .labelBkg{background-color:rgba(0, 0, 0, 0.5);}#chatgpt-mermaid-\_r_n7\_ .cluster rect{fill:rgb(48, 48, 48);stroke:rgba(255, 255, 255, 0.15);stroke-width:1px;}#chatgpt-mermaid-\_r_n7\_ .cluster text{fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_n7\_ .cluster span{color:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_n7\_ div.mermaidTooltip{position:absolute;text-align:center;max-width:200px;padding:2px;font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";font-size:12px;background:rgb(48, 48, 48);border:1px solid rgba(255, 255, 255, 0.15);border-radius:2px;pointer-events:none;z-index:100;}#chatgpt-mermaid-\_r_n7\_ .flowchartTitleText{text-anchor:middle;font-size:18px;fill:rgb(237, 237, 237);}#chatgpt-mermaid-\_r_n7\_ rect.text{fill:none;stroke-width:0;}#chatgpt-mermaid-\_r_n7\_ .icon-shape,#chatgpt-mermaid-\_r_n7\_ .image-shape{background-color:rgb(0, 0, 0);text-align:center;}#chatgpt-mermaid-\_r_n7\_ .icon-shape p,#chatgpt-mermaid-\_r_n7\_ .image-shape p{background-color:rgb(0, 0, 0);padding:2px;}#chatgpt-mermaid-\_r_n7\_ .icon-shape .label rect,#chatgpt-mermaid-\_r_n7\_ .image-shape .label rect{opacity:0.5;background-color:rgb(0, 0, 0);fill:rgb(0, 0, 0);}#chatgpt-mermaid-\_r_n7\_ .label-icon{display:inline-block;height:1em;overflow:visible;vertical-align:-0.125em;}#chatgpt-mermaid-\_r_n7\_ .node .label-icon path{fill:currentColor;stroke:revert;stroke-width:revert;}#chatgpt-mermaid-\_r_n7\_ .node .neo-node{stroke:rgb(31, 78, 148);}#chatgpt-mermaid-\_r_n7\_ [data-look="neo"].node rect,#chatgpt-mermaid-\_r_n7\_ [data-look="neo"].cluster rect,#chatgpt-mermaid-\_r_n7\_ [data-look="neo"].node polygon{stroke:url(#chatgpt-mermaid-\_r_n7\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_n7\_ [data-look="neo"].swimlane.cluster rect{filter:none;}#chatgpt-mermaid-\_r_n7\_ [data-look="neo"].node path{stroke:url(#chatgpt-mermaid-\_r_n7\_-gradient);stroke-width:1px;}#chatgpt-mermaid-\_r_n7\_ [data-look="neo"].node .outer-path{filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_n7\_ [data-look="neo"].node .neo-line path{stroke:rgb(31, 78, 148);filter:none;}#chatgpt-mermaid-\_r_n7\_ [data-look="neo"].node circle{stroke:url(#chatgpt-mermaid-\_r_n7\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_n7\_ [data-look="neo"].node circle .state-start{fill:#000000;}#chatgpt-mermaid-\_r_n7\_ [data-look="neo"].icon-shape .icon{fill:url(#chatgpt-mermaid-\_r_n7\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_n7\_ [data-look="neo"].icon-shape .icon-neo path{stroke:url(#chatgpt-mermaid-\_r_n7\_-gradient);filter:drop-shadow( 1px 2px 2px rgba(185,185,185,1));}#chatgpt-mermaid-\_r_n7\_ .node text{font-size:14px;font-weight:600;letter-spacing:normal;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_n7\_ .edgeLabels text{font-size:13px;font-weight:600;letter-spacing:-0.08px;fill:rgb(153, 206, 255);}#chatgpt-mermaid-\_r_n7\_ .node tspan[font-weight="normal"],#chatgpt-mermaid-\_r_n7\_ .edgeLabels tspan[font-weight="normal"]{font-weight:600;}#chatgpt-mermaid-\_r_n7\_ .edgeLabel .label rect{opacity:1;rx:13px;ry:13px;fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-width:1px;}#chatgpt-mermaid-\_r_n7\_ .node rect,#chatgpt-mermaid-\_r_n7\_ .node circle,#chatgpt-mermaid-\_r_n7\_ .node ellipse,#chatgpt-mermaid-\_r_n7\_ .node polygon,#chatgpt-mermaid-\_r_n7\_ .node path{fill:rgb(0, 40, 77);stroke:rgba(255, 255, 255, 0.1);stroke-width:1px;}#chatgpt-mermaid-\_r_n7\_ .node rect{rx:16px;ry:16px;}#chatgpt-mermaid-\_r_n7\_ .mermaid-decision .label-container{fill:rgb(0, 14, 26);stroke:rgb(26, 62, 95);stroke-dasharray:2,2;}#chatgpt-mermaid-\_r_n7\_ .edgePaths .flowchart-link{stroke:rgb(175, 175, 175);stroke-width:1px;stroke-linecap:round;stroke-linejoin:round;}#chatgpt-mermaid-\_r_n7\_ .marker{fill:rgb(175, 175, 175);stroke:rgb(175, 175, 175);}#chatgpt-mermaid-\_r_n7\_ :root{--mermaid-font-family:-apple-system-body,ui-sans-serif,-apple-system,system-ui,"Segoe UI",Helvetica,"Apple Color Emoji",Arial,sans-serif,"Segoe UI Emoji","Segoe UI Symbol";}Upload ExcelRead WorkbookSelect SheetDetect HeadersColumn MappingConfigure Field TypesConfigure ValidationData PreviewValidation ResultImport ConfirmationShow Error Per RowImport ModeImport CompleteValidInvalid

### 6.2 Supported file format

- `.xlsx`
- `.xls` jika library parser mendukung format yang dipilih.
- File Excel dengan beberapa sheet.
- Header tidak harus berada di baris pertama, dengan pilihan menentukan baris header.

### 6.3 Column Mapping

Admin menentukan hubungan kolom Excel dengan field peserta.

Contoh:

| Excel Header    | Field Peserta | Type  |
| --------------- | ------------- | ----- |
| Nama Lengkap    | Nama          | Text  |
| NIK Peserta     | NIK           | Text  |
| Email Aktif     | Email         | Email |
| HP              | Nomor HP      | Phone |
| Alamat Domisili | Alamat        | Text  |
| Foto Peserta    | Foto          | Image |

Sistem harus mendukung:

- Mapping manual.
- Auto-detection berdasarkan nama header.
- Mapping yang dapat diedit.
- Menyimpan konfigurasi mapping sebagai preset.
- Preview sebelum import.

### 6.4 Dynamic Field Configuration

Admin dapat menentukan tipe dan validasi untuk setiap kolom.

| Konfigurasi   | Contoh        |
| ------------- | ------------- |
| Type          | Text          |
| Required      | Ya            |
| Editable      | Ya            |
| Regex         | `^[0-9]{16}$` |
| Min Length    | 16            |
| Max Length    | 16            |
| Unique        | Ya            |
| Default Value | Kosong        |

Tipe data:

- Text
- Number
- Email
- Phone
- Date
- Image URL
- Boolean
- Select

Untuk gambar, frontend mendukung:

- Preview gambar.
- Validasi ekstensi.
- Validasi ukuran file.
- Placeholder jika gambar tidak tersedia.
- Upload gambar manual jika dibutuhkan.

Catatan: gambar yang di-embed di dalam Excel tidak selalu bisa dibaca langsung oleh library parsing spreadsheet. Dukungan ini harus diuji terhadap library yang dipilih. Alternatifnya menggunakan URL gambar atau upload terpisah.

### 6.5 Import Mode

Admin memilih salah satu:

Mode 1 — Tambah Peserta

- Menambahkan data baru.
- Tidak mengubah peserta lama.
- Menampilkan duplikasi berdasarkan field identitas yang dipilih.

Mode 2 — Update Peserta

- Mencocokkan peserta menggunakan NIK atau ID unik.
- Memperbarui field yang dipilih.
- Field kosong tidak otomatis menimpa data lama.
- Menampilkan preview perubahan sebelum konfirmasi.

### 6.6 Import Result

Setelah import, tampilkan:

- Total baris Excel.
- Berhasil diimport.
- Gagal diimport.
- Duplikat.
- Data tidak valid.
- Detail error berdasarkan baris dan kolom.

## 7. Officer Management

Admin dapat mendaftarkan petugas menggunakan dua metode.

Metode 1: Import Excel

Kolom utama:

- Nama petugas.
- Email.

Metode 2: Copy Paste

Contoh input:

```
petugas1@gmail.com
petugas2@gmail.com
petugas3@gmail.com
```

Fitur:

- Validasi format email.
- Deteksi duplikasi.
- Preview daftar petugas.
- Hapus petugas.
- Aktif/nonaktifkan petugas.
- Search berdasarkan nama atau email.

Ketentuan:

- Email menjadi identitas utama pencocokan login.
- Semua petugas dapat mengakses seluruh peserta dalam workspace.
- Tidak ada pembagian peserta berdasarkan petugas.
- Petugas yang sudah login akan memperoleh akses otomatis setelah emailnya cocok dengan daftar yang telah didaftarkan.

## 8. Autosave & Local Data Management

Ini merupakan fitur penting karena pengisian checklist dapat berlangsung lama.

### 8.1 Konsep penyimpanan

Frontend menggunakan LocalStorage untuk menyimpan draft checklist.

Alur:

1. Petugas membuka peserta.
2. Petugas mengubah nilai checklist.
3. State aplikasi diperbarui.
4. Perubahan disimpan ke LocalStorage.
5. UI menampilkan status tersimpan lokal.
6. Ketika integrasi backend tersedia, draft disinkronkan ke server.
7. Server mengonfirmasi penyimpanan permanen.

### 8.2 UI status autosave

| Status  | Tampilan              |
| ------- | --------------------- |
| Saving  | Menyimpan lokal...    |
| Saved   | Tersimpan lokal       |
| Pending | Menunggu sinkronisasi |
| Syncing | Menyinkronkan...      |
| Synced  | Tersimpan di server   |
| Error   | Gagal menyimpan       |

### 8.3 LocalStorage structure

Contoh struktur konseptual:

```
{
  "workspaceId": "workspace-001",
  "participantId": "participant-001",
  "updatedAt": "2026-11-01T10:00:00Z",
  "syncStatus": "pending",
  "checklist": {
    "item-001": {
      "value": true,
      "status": "complete",
      "notes": ""
    },
    "item-002": {
      "value": "08123456789",
      "status": "complete",
      "notes": ""
    }
  }
}
```

### 8.4 Ketentuan teknis

- Autosave menggunakan debounce.
- Draft harus dipisahkan berdasarkan workspace dan peserta.
- Data draft tidak boleh tertukar antar pengguna.
- Draft harus tetap tersedia setelah browser direfresh.
- Draft yang belum disinkronkan harus diberi indikator.
- Terdapat mekanisme retry ketika sinkronisasi gagal.
- Draft yang sudah tersinkronisasi dapat dibersihkan sesuai kebijakan retensi.

Batasan penting: LocalStorage tidak dapat menjamin penyimpanan permanen, sinkronisasi lintas perangkat, atau konsistensi data antarpetugas. Selain itu, bukti foto sebaiknya tidak disimpan sebagai Base64 di LocalStorage. Gunakan antrean upload dan penyimpanan file sementara yang sesuai, misalnya IndexedDB, sebelum upload ke object storage.

## 9. Audit Log Interface

Audit log ditampilkan sebagai riwayat aktivitas.

Kolom:

- Waktu.
- Nama petugas.
- Email petugas.
- Nama peserta.
- Item checklist.
- Perubahan sebelumnya.
- Perubahan sesudahnya.

Contoh:

| Waktu | Petugas   | Aktivitas         |
| ----- | --------- | ----------------- |
| 09:00 | Petugas A | Mengisi KTP       |
| 09:05 | Petugas B | Mengubah nomor HP |
| 09:10 | Petugas A | Menolak dokumen   |

Fitur:

- Search.
- Filter petugas.
- Filter workspace.
- Filter tanggal.
- Detail perubahan.
- Pagination.

Audit log merupakan tampilan frontend. Pencatatan riwayat yang dapat dipercaya harus dilakukan backend, bukan hanya dari browser.

## 10. Export Excel Interface

Admin dan petugas dapat mengunduh laporan berdasarkan workspace.

Pilihan export:

- Semua peserta.
- Peserta lengkap.
- Peserta belum lengkap.
- Peserta ditolak.

Format laporan:

| No | Nama      | NIK    | Status        | KTP | Foto  | Surat Pernyataan |
| -- | --------- | ------ | ------------- | --- | ----- | ---------------- |
| 1  | Peserta A | 123... | Lengkap       | Ya  | Ya    | Ya               |
| 2  | Peserta B | 456... | Belum lengkap | Ya  | Tidak | Ya               |

Ketentuan:

- Header mengikuti konfigurasi checklist.
- Export menyertakan tanggal export.
- Export mengikuti filter aktif jika pengguna memilih export berdasarkan filter.
- Data sensitif tidak boleh disertakan jika tidak diperlukan.

## 11. UI/UX Design Requirements

### 11.1 Design direction

Rekomendasi:

- Modern administrative dashboard.
- Minimalis dan profesional.
- Desktop-first, tetap responsive.
- Sidebar navigasi.
- Dominasi warna netral.
- Status menggunakan badge.
- Form checklist mudah digunakan dan tidak terlalu padat.

### 11.2 Workspace detail layout

[Task.Co -  Details Task Management Dashboard by Ananto Nugroho Putra for Korsa  on Dribbble](https://images.openai.com/static-rsc-4/TyvSbv-jJtUdRrTHINyMpRgwScprkQeShkIU8ddQHqN0q5h-k877ls5ttWqx2ERJN3aqwcbrt_wXr0DFu3YPUj0LyN03TnposkJbCp-F0ZisN9KJtoAX4WV0deVGiWUK_V3ye7-zI5t_Hwm9KVumpk97JljIbPOAu9CzhKU7Hf0?purpose=inline)

[dribbble.com](https://dribbble.com/shots/25650459-Task-Co-Details-Task-Management-Dashboard?utm_source=chatgpt.com)

Layout utama:

Nama Kegiatan

Workspace Aktif

Informasi kegiatan dan tanggal

Peserta

Andi Saputra

Lengkap

Budi Santoso

Belum lengkap

Citra Dewi

Belum lengkap

Detail Checklist

Andi Saputra

KTP

Nomor HP

Email

Tersimpan lokal

Sketsa konseptual pembagian panel aplikasi.

### 11.3 Responsive behavior

| Device  | Layout                                                       |
| ------- | ------------------------------------------------------------ |
| Desktop | Sidebar peserta dan panel checklist berdampingan             |
| Tablet  | Sidebar dapat diperkecil                                     |
| Mobile  | Daftar peserta dan detail checklist menjadi halaman terpisah |

### 11.4 UI states

Setiap halaman wajib mempunyai:

- Loading state.
- Empty state.
- Error state.
- Success state.
- Confirmation dialog.
- Disabled state.
- Skeleton loading.

## 12. Frontend Technical Architecture

### 12.1 Technology stack

| Teknologi        | Penggunaan                   |
| ---------------- | ---------------------------- |
| Next.js 16+      | Framework                    |
| TypeScript       | Type safety                  |
| Tailwind CSS     | Styling                      |
| shadcn/ui        | UI components                |
| Better Auth      | Authentication integration   |
| Zustand          | Global state management      |
| React Hook Form  | Form management              |
| Zod              | Schema validation            |
| TanStack Table   | Data tables                  |
| SheetJS (`xlsx`) | Excel parsing/export         |
| dnd-kit          | Drag and drop checklist      |
| date-fns         | Date handling                |
| Lucide React     | Icons                        |
| IndexedDB        | Draft dan antrean file lokal |

Versi dependency harus disesuaikan dengan kompatibilitas saat implementasi.

### 12.2 State management

Pembagian state:

| State                   | Penyimpanan           |
| ----------------------- | --------------------- |
| Authentication          | Auth session          |
| Active workspace        | Zustand               |
| Selected participant    | Zustand               |
| Checklist configuration | API cache             |
| Checklist form          | React Hook Form       |
| Local draft             | LocalStorage          |
| Pending file uploads    | IndexedDB             |
| Import wizard           | Local component state |
| UI preferences          | LocalStorage          |

### 12.3 Struktur folder Next.js

Rekomendasi menggunakan App Router.

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   ├── (dashboard)/
│   │   ├── dashboard/
│   │   ├── workspaces/
│   │   │   ├── page.tsx
│   │   │   ├── create/
│   │   │   └── [workspaceId]/
│   │   │       ├── page.tsx
│   │   │       ├── import/
│   │   │       └── settings/
│   │   ├── templates/
│   │   ├── officers/
│   │   ├── audit-logs/
│   │   └── profile/
│   └── layout.tsx
│
├── components/
│   ├── layout/
│   ├── dashboard/
│   ├── workspace/
│   ├── participant/
│   ├── checklist/
│   ├── import/
│   ├── officer/
│   ├── audit/
│   └── shared/
│
├── features/
│   ├── authentication/
│   ├── workspace/
│   ├── participant/
│   ├── checklist/
│   ├── excel-import/
│   ├── autosave/
│   ├── audit-log/
│   └── export/
│
├── hooks/
├── lib/
│   ├── auth/
│   ├── validators/
│   ├── excel/
│   ├── storage/
│   └── utils/
│
├── stores/
├── types/
└── constants/
```

Prinsip implementasi:

- Setiap fitur mempunyai komponen dan logic terpisah.
- Hindari satu komponen besar untuk seluruh halaman workspace.
- Gunakan reusable form components.
- Pisahkan business logic dari UI.
- Semua tipe data menggunakan TypeScript.
- Hindari hardcode data operasional.

## 13. Frontend Data Models

Walaupun database tidak termasuk dalam lingkup PRD ini, frontend membutuhkan struktur data yang konsisten.

### 13.1 Workspace

```
interface Workspace {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: "active" | "archived";
  templateId?: string;
  createdAt: string;
}
```

### 13.2 Participant

```
interface Participant {
  id: string;
  workspaceId: string;
  data: Record<string, unknown>;
  status: "complete" | "incomplete" | "rejected";
  createdAt: string;
  updatedAt: string;
}
```

### 13.3 Checklist Configuration

```
interface ChecklistItem {
  id: string;
  label: string;
  description?: string;

  type:
    | "checkbox"
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "select"
    | "radio"
    | "email"
    | "phone";

  required: boolean;
  editable: boolean;

  evidenceEnabled: boolean;
  evidenceRequired: boolean;

  validation?: {
    regex?: string;
    minLength?: number;
    maxLength?: number;
  };

  options?: string[];
  order: number;
  active: boolean;
}
```

### 13.4 Checklist Response

```
interface ChecklistResponse {
  id: string;
  participantId: string;
  checklistItemId: string;

  value: unknown;
  status: "complete" | "incomplete" | "rejected";

  notes?: string;
  evidence?: {
    name: string;
    url?: string;
    localId?: string;
  };

  updatedBy?: string;
  updatedAt?: string;
}
```

## 14. API Integration Contract

Implementasi backend tidak termasuk scope, tetapi frontend harus memiliki kontrak integrasi.

Berikut endpoint konseptual yang nantinya dibutuhkan:

| Method | Endpoint                                  | Fungsi           |
| ------ | ----------------------------------------- | ---------------- |
| GET    | `/api/workspaces`                         | List workspace   |
| POST   | `/api/workspaces`                         | Create workspace |
| GET    | `/api/workspaces/:id`                     | Detail workspace |
| PATCH  | `/api/workspaces/:id`                     | Update workspace |
| DELETE | `/api/workspaces/:id`                     | Delete workspace |
| GET    | `/api/workspaces/:id/participants`        | List peserta     |
| POST   | `/api/workspaces/:id/participants/import` | Import peserta   |
| PATCH  | `/api/participants/:id`                   | Update peserta   |
| GET    | `/api/workspaces/:id/checklists`          | Get checklist    |
| PUT    | `/api/participants/:id/checklist`         | Save checklist   |
| GET    | `/api/workspaces/:id/officers`            | List petugas     |
| POST   | `/api/workspaces/:id/officers/import`     | Import petugas   |
| GET    | `/api/audit-logs`                         | Audit log        |
| POST   | `/api/uploads`                            | Upload bukti     |
| GET    | `/api/workspaces/:id/export`              | Export laporan   |

Frontend harus mengakses API melalui service layer, bukan memanggil endpoint langsung dari setiap komponen.

Rekomendasi: Gunakan mock service terlebih dahulu sehingga seluruh UI dapat dikembangkan dan diuji sebelum backend tersedia.

## 15. Non-Functional Requirements

| Kategori        | Requirement                                                    |
| --------------- | -------------------------------------------------------------- |
| Performance     | Navigasi dan interaksi form responsif                          |
| Responsive      | Mendukung desktop, tablet, mobile                              |
| Accessibility   | Label input, keyboard navigation                               |
| Reliability     | Draft tidak hilang ketika halaman direfresh                    |
| Maintainability | Modular component architecture                                 |
| Validation      | Validasi client-side menggunakan Zod                           |
| Security        | Tidak menyimpan credential atau token sensitif di LocalStorage |
| File handling   | Validasi ukuran dan tipe file                                  |
| Error handling  | Pesan error yang mudah dipahami                                |
| Browser         | Chrome, Edge, Firefox modern                                   |

### 15.1 Keamanan frontend

Hal yang wajib diperhatikan:

1. Jangan menyimpan access token sensitif di LocalStorage.
2. Jangan menganggap role dari client sebagai otorisasi final.
3. Jangan menampilkan data yang tidak berhak diakses pengguna.
4. Validasi file sebelum upload.
5. Sanitasi tampilan data yang berasal dari Excel.
6. Hindari menampilkan NIK lengkap di daftar peserta jika tidak diperlukan.
7. Berikan konfirmasi sebelum menghapus data atau mengubah konfigurasi checklist.

## 16. Acceptance Criteria

Aplikasi dianggap memenuhi kebutuhan frontend apabila:

| ID    | Kriteria                                      | Prioritas |
| ----- | --------------------------------------------- | --------- |
| AC-01 | Pengguna dapat login melalui Google           | Must      |
| AC-02 | Dashboard menampilkan ringkasan workspace     | Must      |
| AC-03 | Admin dapat membuat workspace                 | Must      |
| AC-04 | Workspace menampilkan daftar peserta          | Must      |
| AC-05 | Peserta dapat dicari menggunakan search       | Must      |
| AC-06 | Admin dapat import Excel dinamis              | Must      |
| AC-07 | Admin dapat melakukan mapping kolom           | Must      |
| AC-08 | Import menampilkan preview dan validasi       | Must      |
| AC-09 | Admin dapat membuat template checklist        | Must      |
| AC-10 | Checklist dapat diurutkan                     | Must      |
| AC-11 | Petugas dapat mengisi checklist               | Must      |
| AC-12 | Form mendukung bukti upload opsional          | Must      |
| AC-13 | Autosave LocalStorage berjalan                | Must      |
| AC-14 | Indikator autosave ditampilkan                | Must      |
| AC-15 | Status peserta dihitung berdasarkan checklist | Must      |
| AC-16 | Admin dapat import petugas                    | Must      |
| AC-17 | Audit log dapat ditampilkan                   | Must      |
| AC-18 | Laporan dapat diexport Excel                  | Must      |
| AC-19 | Template dapat disesuaikan per workspace      | Must      |
| AC-20 | Semua halaman mendukung responsive layout     | Must      |

## 17. Scope Development

Untuk menghindari pengembangan yang melebar, saya menyarankan tiga tahap.

Phase 1 — Core Application

Prioritas tertinggi

- Login dan role-based UI.
- Dashboard.
- Workspace management.
- Import peserta dan mapping Excel.
- Participant management.
- Checklist builder.
- Checklist form.
- LocalStorage autosave.
- Status kelengkapan.

Phase 2 — Management Features

- Officer management.
- Import petugas.
- Audit log interface.
- Export Excel.
- Template checklist global.
- Duplicate workspace.
- Filter dan advanced search.

Phase 3 — Reliability & Integration

- Backend API integration.
- Sinkronisasi draft.
- Conflict handling antarpetugas.
- Upload object storage.
- Retry mekanisme.
- Error monitoring.
- Optimasi performa.

## 18. Out of Scope

Fitur berikut tidak termasuk dalam PRD frontend ini:

- Backend API development.
- Database schema dan migration.
- Server-side authorization.
- Implementasi Google OAuth di server.
- Server-side audit logging.
- Object storage infrastructure.
- Real-time collaboration.
- Notification email/WhatsApp.
- Mobile application native.
- Multi-tenant organization.
- Approval workflow bertingkat.

## 19. Keputusan Produk yang Perlu Dikunci Sebelum Development

Ada beberapa hal yang belum sepenuhnya ditentukan. Saya menyarankan keputusan berikut dijadikan default agar development tidak terhambat.

| No. | Hal                 | Rekomendasi                                                    |
| --- | ------------------- | -------------------------------------------------------------- |
| 1   | Identitas peserta   | NIK sebagai unique identifier                                  |
| 2   | Checklist workspace | Snapshot template saat workspace dibuat                        |
| 3   | Perubahan checklist | Berlaku untuk seluruh peserta, jawaban lama dipertahankan      |
| 4   | Penolakan item      | Wajib mengisi alasan penolakan                                 |
| 5   | Bukti foto          | Maksimal 5 file per item, dapat dikonfigurasi                  |
| 6   | Format Excel        | Mapping fleksibel dan bisa disimpan sebagai preset             |
| 7   | Import update       | Berdasarkan NIK, preview sebelum update                        |
| 8   | Status peserta      | Ditolak jika ada minimal satu item ditolak                     |
| 9   | Autosave            | LocalStorage untuk data ringan, IndexedDB untuk file sementara |
| 10  | Kolaborasi          | Semua petugas dapat mengedit, backend menangani konflik        |

Dua keputusan teknis penting:

- Karena semua petugas dapat mengerjakan peserta yang sama, LocalStorage saja tidak cukup. Dua petugas dapat memiliki draft berbeda. Backend nantinya harus menyediakan mekanisme versioning atau conflict resolution.
- Ketika checklist diubah setelah peserta lengkap, sistem perlu menghitung ulang status peserta. Jangan menghapus jawaban lama secara otomatis jika field dihapus atau diubah.

## 20. Definition of Done

Frontend dinyatakan selesai apabila:

- Seluruh halaman utama tersedia.
- Navigasi berdasarkan role berjalan.
- Seluruh form memiliki validasi.
- Import Excel berjalan dengan preview.
- Checklist dapat dikonfigurasi secara dinamis.
- Autosave lokal berjalan setelah refresh.
- Status peserta dihitung secara konsisten.
- Export Excel berjalan.
- Semua halaman mempunyai loading, empty, dan error state.
- Responsive layout berfungsi.
- Mock API dapat diganti dengan API backend melalui service layer.
- Tidak ada fitur inti yang hanya berupa tombol dekoratif tanpa fungsi.

## Rekomendasi final arsitektur

Next.js Frontend

App Router · TypeScript · Tailwind · shadcn/ui

State Management

Zustand · React Hook Form

Validation

Zod · Excel Parser

Local Storage

LocalStorage · IndexedDB

API Service

Mock API → Backend API

Backend (Future Integration)

Better Auth · PostgreSQL · Object Storage · Audit Log

Kesimpulan: Bangun frontend sebagai aplikasi yang sudah bisa didemonstrasikan dan diuji menggunakan mock data, tetapi sejak awal gunakan kontrak API dan struktur data yang siap diintegrasikan dengan backend.

Satu hal yang paling penting: jangan menjadikan LocalStorage sebagai database aplikasi. Ia hanya berfungsi sebagai penyelamat draft sementara. Data registrasi yang sesungguhnya harus disimpan di server.

PRD ini dapat dijadikan dasar pembuatan backlog development, desain Figma, dan implementasi Next.js.