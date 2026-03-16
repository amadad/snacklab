import type { ReactNode } from "react";
import AdminLogin from "@/components/AdminLogin";
import { isAdminAuthenticatedForCurrentRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authed = await isAdminAuthenticatedForCurrentRequest();

  if (!authed) {
    return <AdminLogin />;
  }

  return <>{children}</>;
}
