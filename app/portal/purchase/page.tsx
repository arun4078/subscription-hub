"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CustomerPortalPurchaseRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/portal/plans");
  }, [router]);

  return (
    <div className="p-8 text-center text-xs text-[#6c757d]">
      Redirecting to Customer Plans Store...
    </div>
  );
}

