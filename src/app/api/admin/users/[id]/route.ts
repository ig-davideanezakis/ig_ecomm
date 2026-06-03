import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pool } from "@/lib/db";

/**
 * PATCH /api/admin/users/[id]
 * Update a user's role, name, or email. ADMIN only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { role, name, email } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "ID utente mancante." }, { status: 400 });
  }

  // Build dynamic SET clause
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 0;

  if (role !== undefined) {
    const validRoles = ["CUSTOMER", "STAFF", "ADMIN"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: "Ruolo non valido." }, { status: 400 });
    }
    idx++;
    fields.push(`role = $${idx}`);
    values.push(role);
  }
  if (name !== undefined) {
    idx++;
    fields.push(`name = $${idx}`);
    values.push(name || null);
  }
  if (email !== undefined) {
    idx++;
    fields.push(`email = $${idx}`);
    values.push(email);
  }

  if (fields.length === 0) {
    return NextResponse.json(
      { error: "Nessun campo da aggiornare." },
      { status: 400 },
    );
  }

  idx++;
  values.push(id);

  const result = await pool.query(
    `UPDATE "user" SET ${fields.join(", ")} WHERE id = $${idx} RETURNING id, email, name, role, totp_enabled, created_at`,
    values,
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
  }

  return NextResponse.json({ user: result.rows[0] });
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user. ADMIN only.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID utente mancante." }, { status: 400 });
  }

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json(
      { error: "Non puoi eliminare il tuo account." },
      { status: 400 },
    );
  }

  const result = await pool.query(
    `DELETE FROM "user" WHERE id = $1 RETURNING id, email`,
    [id],
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });
  }

  return NextResponse.json({ deleted: result.rows[0] });
}
