import React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary" | "warning";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  isLoading = false,
}: ConfirmDialogProps) {
  const getButtonStyles = () => {
    switch (confirmVariant) {
      case "danger":
        return "bg-[#c5221f] hover:bg-[#a51d24] text-white shadow-xs";
      case "warning":
        return "bg-[#b06000] hover:bg-[#8f4e00] text-white shadow-xs";
      default:
        return "bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] shadow-xs";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-[#feefc3] text-[#b06000] mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-xs text-[#495057] leading-relaxed">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#dee2e6]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-medium text-[#495057] hover:bg-[#e9ecef] rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50 ${getButtonStyles()}`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
