import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "lg",
}: ModalProps) {
  if (!isOpen) return null;

  const maxWidthClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#212529]/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-white border border-[#dee2e6] rounded-2xl w-full ${maxWidthClass} p-6 space-y-4 shadow-xl relative max-h-[90vh] overflow-y-auto text-[#212529]`}
      >
        <div className="flex items-start justify-between border-b border-[#dee2e6] pb-3">
          <div>
            <h3 className="text-base font-bold text-[#212529] tracking-tight">{title}</h3>
            {description && <p className="text-xs text-[#6c757d] mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-[#6c757d] hover:text-[#212529] p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="pt-1">{children}</div>
      </div>
    </div>
  );
}
