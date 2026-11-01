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
      <DialogContent className="max-w-4xl h-[85vh] p-0 flex flex-col gap-0 overflow-hidden bg-background">
        {/* Header Bar */}
        <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2 overflow-hidden pr-4">
            {isImage ? (
              <ImageIcon className="w-5 h-5 text-primary shrink-0" />
            ) : (
              <FileText className="w-5 h-5 text-primary shrink-0" />
            )}
            <DialogTitle className="text-sm font-semibold truncate">
              {title || "Preview Berkas"}
            </DialogTitle>
          </div>

          <div className="flex items-center gap-1.5 mr-6">
            {/* Image zoom controls */}
            {isImage && (
              <>
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
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(url, "_blank")}
              className="h-8 text-xs gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Buka di Tab Baru
            </Button>
          </div>
        </DialogHeader>

        {/* Viewer Content */}
        <div className="flex-1 bg-muted/40 relative overflow-auto flex items-center justify-center p-4">
          {isImage ? (
            <div className="transition-transform duration-150 ease-out flex items-center justify-center min-h-full">
              <img
                src={previewUrl}
                alt={title}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: "center center",
                }}
                className="max-h-[70vh] max-w-full object-contain rounded shadow-sm select-none"
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
      </DialogContent>
    </Dialog>
  );
}
