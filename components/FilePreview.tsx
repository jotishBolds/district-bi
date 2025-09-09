"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Download, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  documentType: string;
  isVerified: boolean;
}

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document;
  applicationId: string;
}

const FilePreviewModal = ({
  isOpen,
  onClose,
  document,
  applicationId,
}: FilePreviewModalProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFileExtension = (fileName: string) => {
    return fileName.toLowerCase().split(".").pop();
  };

  const isImage = (fileName: string) => {
    const ext = getFileExtension(fileName);
    return ["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "");
  };

  const isPDF = (fileName: string) => {
    const ext = getFileExtension(fileName);
    return ext === "pdf";
  };

  const loadPreview = async () => {
    if (previewUrl) return; // Already loaded

    setLoading(true);
    setError(null);

    try {
      // Use the new permanent file serving endpoint (no expiration)
      // This endpoint streams files directly from S3 without expiration issues
      const permanentUrl = `/api/documents/${document.id}/file`;
      setPreviewUrl(permanentUrl);
    } catch (err) {
      console.error("Error loading file preview:", err);
      setError("Failed to load file preview");
      toast.error("Failed to load file preview");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      // Use the permanent file serving endpoint with download flag
      const downloadUrl = `/api/documents/${document.id}/file?download=true`;

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.fileName;
      window.document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(link);

      toast.success("File downloaded successfully");
    } catch (err) {
      console.error("Error downloading file:", err);
      toast.error("Failed to download file");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Load preview when modal opens
  useEffect(() => {
    if (isOpen && !previewUrl && !loading) {
      loadPreview();
    }
  }, [isOpen, previewUrl, loading]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <span className="truncate">{document.fileName}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground text-left">
            <span>Size: {formatFileSize(document.fileSize)}</span>
            <span>Type: {document.documentType.replace("_", " ")}</span>
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                document.isVerified
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {document.isVerified ? "Verified" : "Pending Verification"}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          {loading && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Loading preview...
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-red-600 mb-4">{error}</p>
                <Button onClick={loadPreview} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {previewUrl && !loading && (
            <div className="flex-1 min-h-0">
              {isImage(document.fileName) && (
                <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
                  <img
                    src={previewUrl}
                    alt={document.fileName}
                    className="max-w-full max-h-full object-contain"
                    style={{ maxHeight: "60vh" }}
                  />
                </div>
              )}

              {isPDF(document.fileName) && (
                <div className="h-full">
                  <iframe
                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full border-0 rounded-lg"
                    style={{ minHeight: "60vh" }}
                    title={document.fileName}
                  />
                </div>
              )}

              {!isImage(document.fileName) && !isPDF(document.fileName) && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Preview not available for this file type
                    </p>
                    <Button onClick={handleDownload}>
                      <Download className="h-4 w-4 mr-2" />
                      Download to View
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
          <Button onClick={handleDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface FilePreviewButtonProps {
  document: Document;
  applicationId: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export const FilePreviewButton = ({
  document,
  applicationId,
  variant = "ghost",
  size = "sm",
  className = "",
}: FilePreviewButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        className={className}
        title={`Preview ${document.fileName}`}
      >
        <Eye className="h-4 w-4" />
        {size !== "icon" && <span className="ml-1">Preview</span>}
      </Button>

      <FilePreviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        document={document}
        applicationId={applicationId}
      />
    </>
  );
};

export default FilePreviewModal;
