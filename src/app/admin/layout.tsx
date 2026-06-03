import { authorize } from "@/lib/auth-helpers";
import { AdminSidebar } from "./admin-sidebar";
import { AdminHeader } from "./admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await authorize("ADMIN");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
