"use client";

import { useState } from "react";
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

export function MediaPreviewModal({
  open,
  onOpenChange,
  url,
  title,
  type = "auto",
}: MediaPreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!url) return null;

  const isDrive = isGoogleDriveUrl(url);
  const isImage =
    type === "image" ||
    (type === "auto" && (isImageUrl(url) || /foto|gambar|image|ktp/i.test(title)));
  const isPdf =
    type === "file" ||
    (type === "auto" && (isPdfUrl(url) || /pdf|dokumen|berkas/i.test(title)));

  // Resolve best URL for preview
  let previewUrl = url;
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
            ) : (
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
            )}
            <DialogTitle className="text-xs sm:text-sm font-semibold truncate">
              {title || "Preview Berkas"}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-1.5 mr-7 sm:mr-8 shrink-0">
            {/* Desktop zoom & rotate controls (Hidden on mobile, mobile gets bottom floating bar) */}
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(url, "_blank")}
              className="h-7 sm:h-8 text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2 sm:px-3"
            >
              <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xs:inline">Buka Tab Baru</span>
              <span className="xs:hidden">Tab Baru</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Viewer Content */}
        <div className="flex-1 bg-muted/40 relative overflow-auto flex items-center justify-center p-2 sm:p-4 pb-16 sm:pb-4">
          {isImage ? (
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
          ) : (
            <iframe
              src={previewUrl}
              title={title}
              className="w-full h-full rounded border-0 bg-white shadow-xs"
              allow="autoplay"
            />
          )}
        </div>

        {/* Mobile Floating Bottom Controls Bar (khusus mobile layar sentuh) */}
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
