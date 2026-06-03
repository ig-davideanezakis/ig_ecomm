import { authorize } from "@/lib/auth-helpers";
import { getDashboardData } from "@/db/queries/dashboard";
import { DashboardClient } from "./dashboard-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — Infograf Store Admin",
};

export default async function AdminDashboardPage() {
  // Authorize: ADMIN role + 2FA check
  await authorize("ADMIN");

  const data = await getDashboardData(7);

  return <DashboardClient data={data} />;
}
