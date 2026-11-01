"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Image as ImageIcon,
  Download,
} from "lucide-react";
import {
  isGoogleDriveUrl,
  isPdfUrl,
  isImageUrl,
  getGoogleDrivePreviewUrl,
  getGoogleDriveThumbnailUrl,
} from "@/lib/domain/drive-detector";

interface MediaPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
  type?: "image" | "file" | "auto";
}

/**
 * Mengonversi Base64 string atau data URI ke Blob Object URL
 * agar bisa dibaca langsung oleh native PDF Viewer browser tanpa limitasi data-URI.
 */
function base64ToBlobUrl(base64Data: string, mimeType = "application/pdf"): string | null {
  try {
    let cleanBase64 = base64Data.trim();
    if (cleanBase64.startsWith("data:")) {
      const commaIndex = cleanBase64.indexOf(",");
      if (commaIndex !== -1) {
        cleanBase64 = cleanBase64.substring(commaIndex + 1);
      }
    }
    // Hapus whitespace dan newline
    cleanBase64 = cleanBase64.replace(/\s/g, "");

    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteNumbers], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error("Gagal mengonversi Base64 ke Blob URL:", err);
    return null;
  }
}

export function MediaPreviewModal({
  open,
  onOpenChange,
  url,
  title,
  type = "auto",
}: MediaPreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Otomatis convert Base64 PDF / data URI menjadi Blob URL jika terdeteksi
  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return;
    }

    const trimmed = url.trim();
    const isDataUriPdf = /^data:application\/pdf/i.test(trimmed);
    const isRawBase64Pdf = /^JVBERi0/i.test(trimmed); // %PDF- magic number in base64

    if (isDataUriPdf || isRawBase64Pdf) {
      const generated = base64ToBlobUrl(trimmed, "application/pdf");
      setBlobUrl(generated);
      return () => {
        if (generated) {
          URL.revokeObjectURL(generated);
        }
      };
    } else {
      setBlobUrl(null);
    }
  }, [url]);

  if (!url) return null;

  const effectiveUrl = blobUrl || url;
  const isDrive = isGoogleDriveUrl(url);

  // Penentuan tipe konten secara spesifik
  const isPdf =
    type === "file" ||
    blobUrl !== null ||
    isPdfUrl(url) ||
    (!isDrive && (url.startsWith("data:application/pdf") || url.startsWith("JVBERi0") || /pdf|dokumen|berkas/i.test(title)));

  const isImage =
    type === "image" ||
    (type === "auto" && !isPdf && (isImageUrl(url) || /foto|gambar|image|ktp/i.test(title)));

  // Resolve preview URL sesuai provider
  let previewUrl = effectiveUrl;
  if (isDrive) {
    if (isImage) {
      previewUrl = getGoogleDriveThumbnailUrl(url, 1600);
    } else {
      previewUrl = getGoogleDrivePreviewUrl(url);
    }
  }

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) handleReset();
        onOpenChange(val);
      }}
    >
      <DialogContent className="!w-full !max-w-full !h-full !max-h-full sm:!max-w-4xl sm:!h-[85vh] sm:!max-h-[85vh] !p-0 !rounded-none sm:!rounded-xl flex flex-col gap-0 overflow-hidden bg-background !top-0 !left-0 !translate-x-0 !translate-y-0 sm:!top-1/2 sm:!left-1/2 sm:!-translate-x-1/2 sm:!-translate-y-1/2">
        {/* Header Bar */}
        <DialogHeader className="p-3 sm:p-4 border-b border-border flex flex-row items-center justify-between space-y-0 shrink-0 bg-card">
          <div className="flex items-center gap-2 overflow-hidden min-w-0 pr-2">
            {isImage ? (
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
            ) : isPdf ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40 hidden xs:inline">
                  PDF
                </span>
              </div>
            ) : (
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
            )}
            <DialogTitle className="text-xs sm:text-sm font-semibold truncate">
              {title || (isPdf ? "Pratinjau Dokumen PDF" : "Preview Berkas")}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-1.5 mr-7 sm:mr-8 shrink-0">
            {/* Desktop zoom & rotate controls (Khusus gambar) */}
            {isImage && (
              <div className="hidden sm:flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomOut}
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground w-12 text-center font-mono">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomIn}
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleRotate}
                  title="Rotate"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Tombol Unduh untuk Dokumen PDF Langsung */}
            {isPdf && !isDrive && (
              <a
                href={effectiveUrl}
                download={title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 sm:h-8 text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2 sm:px-3"
                  title="Unduh File PDF"
                >
                  <Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span className="hidden xs:inline">Unduh PDF</span>
                  <span className="xs:hidden">Unduh</span>
                </Button>
              </a>
            )}

            {/* Tombol Buka Tab Baru */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(effectiveUrl, "_blank")}
              className="h-7 sm:h-8 text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2 sm:px-3"
              title="Buka dokumen di tab browser baru"
            >
              <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">Buka Tab Baru</span>
              <span className="xs:hidden">Tab Baru</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Viewer Content (Conditional Berdasarkan Tipe) */}
        <div className="flex-1 bg-muted/40 relative overflow-hidden flex items-center justify-center p-2 sm:p-4 pb-16 sm:pb-4">
          {isImage ? (
            /* 1. Tipe Gambar / Foto */
            <div className="overflow-auto w-full h-full flex items-center justify-center">
              <div className="transition-transform duration-150 ease-out flex items-center justify-center min-h-full w-full">
                <img
                  src={previewUrl}
                  alt={title}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: "center center",
                  }}
                  className="max-h-[75vh] sm:max-h-[70vh] max-w-full object-contain rounded shadow-sm select-none"
                />
              </div>
            </div>
          ) : isDrive ? (
            /* 2. Tipe Google Drive Embed (Docs, Sheets, Slides, Drive PDF) */
            <iframe
              src={previewUrl}
              title={title}
              className="w-full h-full rounded border-0 bg-white shadow-xs"
              allow="autoplay"
            />
          ) : isPdf ? (
            /* 3. Langsung dalam bentuk PDF Viewer */
            <div className="w-full h-full flex flex-col relative">
              <object
                data={`${previewUrl}#toolbar=1&navpanes=0`}
                type="application/pdf"
                className="w-full h-full rounded border-0 bg-white shadow-xs min-h-[60vh] sm:min-h-[70vh]"
              >
                {/* Fallback jika browser/device tidak support inline plugin PDF */}
                <div className="flex flex-col items-center justify-center p-6 sm:p-10 text-center space-y-4 h-full bg-card rounded-lg border border-border">
                  <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <h4 className="font-semibold text-sm sm:text-base text-foreground">
                      {title || "Dokumen PDF"}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Browser tidak mendukung pratinjau inline PDF secara langsung di layar ini. Anda dapat membukanya langsung di tab baru atau mengunduh dokumen.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => window.open(effectiveUrl, "_blank")}
                      className="gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Buka di Tab Baru
                    </Button>
                    <a
                      href={effectiveUrl}
                      download={title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Download className="w-3.5 h-3.5" />
                        Unduh PDF
                      </Button>
                    </a>
                  </div>
                </div>
              </object>
            </div>
          ) : (
            /* 4. Default URL Frame (Fallback umum tanpa sandbox pembatas) */
            <iframe
              src={previewUrl}
              title={title}
              className="w-full h-full rounded border-0 bg-white shadow-xs"
              allow="autoplay"
            />
          )}
        </div>

        {/* Mobile Floating Bottom Controls Bar (khusus mobile gambar) */}
        {isImage && (
          <div className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-background/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-lg">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleZoomOut}
              title="Perkecil"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-[11px] font-mono text-muted-foreground px-1 min-w-[40px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleZoomIn}
              title="Perbesar"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <div className="h-4 w-px bg-border mx-0.5" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleRotate}
              title="Putar 90°"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[11px] px-2 rounded-full"
              onClick={handleReset}
              title="Reset Zoom"
            >
              Reset
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
