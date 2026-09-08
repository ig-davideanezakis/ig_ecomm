import { authorize } from "@/lib/auth-helpers";
import { StaffHeader } from "./staff-header";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await authorize("STAFF");

  return (
    <div className="flex min-h-screen flex-col">
      <StaffHeader />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
