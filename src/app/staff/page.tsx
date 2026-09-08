import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Area Staff — Infograf Store",
};

export default function StaffPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Area Staff</h1>
      <p className="text-muted-foreground">
        Questa sezione è in costruzione: non ci sono ancora strumenti dedicati al ruolo STAFF.
      </p>
    </div>
  );
}
