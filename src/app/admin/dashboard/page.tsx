import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardData } from "@/db/queries/dashboard";
import { DashboardClient } from "./dashboard-client";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — Infograf Store Admin",
};

export default async function AdminDashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/admin/dashboard");
  }

  const data = await getDashboardData(7);

  return <DashboardClient data={data} />;
}
