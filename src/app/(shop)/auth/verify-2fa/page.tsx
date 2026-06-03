import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Verify2FAClient } from "./verify-2fa-client";

export default async function Verify2FAPage() {
  const session = await auth();

  // If not logged in, go to login
  if (!session?.user) {
    redirect("/auth/login");
  }

  // If no 2FA needed, go to dashboard
  if (!session.user.needsTotp) {
    redirect(session.user.role === "ADMIN" ? "/admin/dashboard" : "/");
  }

  return <Verify2FAClient userRole={session.user.role} />;
}
