import { authorize } from "@/lib/auth-helpers";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authorize: only ADMIN can access /admin
  await authorize("ADMIN");

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center px-6 bg-background">
          <h2 className="text-sm font-medium">Pannello di amministrazione</h2>
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
