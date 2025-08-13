import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, Info } from "lucide-react";

interface NotificationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type: "success" | "error" | "warning" | "info";
}

const icons = {
  success: <CheckCircle className="h-6 w-6 text-green-600" />,
  error: <XCircle className="h-6 w-6 text-red-600" />,
  warning: <AlertCircle className="h-6 w-6 text-yellow-600" />,
  info: <Info className="h-6 w-6 text-blue-600" />,
};

const titleColors = {
  success: "text-green-800",
  error: "text-red-800",
  warning: "text-yellow-800",
  info: "text-blue-800",
};

export function NotificationDialog({
  isOpen,
  onClose,
  title,
  message,
  type,
}: NotificationDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {icons[type]}
            <DialogTitle className={titleColors[type]}>{title}</DialogTitle>
          </div>
          <DialogDescription className="text-left">{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onClose} className="w-full">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
