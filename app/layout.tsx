import type { Metadata } from "next";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brightloop | Subscription Management",
  description: "Unified subscription management platform for handling plans, recurring billing, invoicing, payments, and revenue analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="bg-[#f8f9fa] text-[#212529] antialiased min-h-screen">
        <AuthProvider>
          {children}
          <Toaster position="top-right" richColors theme="light" />
        </AuthProvider>
      </body>
    </html>
  );
}
