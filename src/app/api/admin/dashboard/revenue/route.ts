import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRevenueData } from "@/db/queries/dashboard";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(365, Math.max(1, parseInt(searchParams.get("days") ?? "7", 10)));

  const data = await getRevenueData(days);

  return NextResponse.json({ data });
}
