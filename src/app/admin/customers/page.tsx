"use client";

import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  phone: string | null;
  totp_enabled: boolean;
  emailVerified: string | null;
  created_at: string;
}

const ROLE_OPTIONS = ["CUSTOMER", "STAFF", "ADMIN"] as const;
const ROLE_COLORS: Record<string, string> = {
  CUSTOMER: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  STAFF: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ADMIN: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit", month: "2-digit", year: "numeric",
  }).format(new Date(d));
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("CUSTOMER");
  const [editName, setEditName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("CUSTOMER");
  const [error, setError] = useState("");

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    const json = await res.json();
    if (json.users) setUsers(json.users);
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setEditRole(u.role);
    setEditName(u.name ?? "");
    setError("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setError("");
    const res = await fetch(`/api/admin/users/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: editRole, name: editName || null }),
    });
    const json = await res.json();
    if (json.user) {
      setUsers((prev) => prev.map((u) => (u.id === editingId ? { ...u, ...json.user } : u)));
      setEditingId(null);
    } else {
      setError(json.error ?? "Errore durante il salvataggio.");
    }
  };

  const deleteUser = async (id: string, email: string) => {
    if (!confirm(`Eliminare l'utente ${email}?`)) return;
    setError("");
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.deleted) {
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } else {
      setError(json.error ?? "Errore durante l'eliminazione.");
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, name: newName || null, role: newRole }),
    });
    const json = await res.json();
    if (json.user) {
      setUsers((prev) => [json.user, ...prev]);
      setShowCreate(false);
      setNewEmail("");
      setNewName("");
      setNewRole("CUSTOMER");
    } else {
      setError(json.error ?? "Errore durante la creazione.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Utenti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestisci gli utenti e i loro ruoli.
          </p>
        </div>
        <button
          onClick={() => { setShowCreate(!showCreate); setError(""); }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {showCreate ? "Annulla" : "+ Nuovo utente"}
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <form onSubmit={createUser} className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">Nuovo utente</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email *"
              required
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome (opzionale)"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Crea utente
          </button>
        </form>
      )}

      {/* Users table */}
      {loading ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Caricamento...</div>
      ) : users.length === 0 ? (
        <div className="text-sm text-muted-foreground py-12 text-center">Nessun utente trovato.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Ruolo</th>
                <th className="px-4 py-3 font-medium">2FA</th>
                <th className="px-4 py-3 font-medium">Registrato</th>
                <th className="px-4 py-3 font-medium text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {editingId === u.id ? (
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="rounded border border-input bg-background px-2 py-1 text-xs"
                        autoFocus
                      >
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? ""}`}>
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.totp_enabled
                      ? <span className="text-green-600 dark:text-green-400 text-xs font-medium">✓ Attivo</span>
                      : <span className="text-muted-foreground text-xs">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {formatDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === u.id ? (
                      <div className="flex justify-end gap-1">
                        <button onClick={saveEdit} className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:opacity-90">Salva</button>
                        <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs rounded border border-border hover:bg-muted">Annulla</button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => startEdit(u)}
                          className="px-2 py-1 text-xs rounded border border-border hover:bg-muted transition-colors"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => deleteUser(u.id, u.email)}
                          className="px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Elimina
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t text-xs text-muted-foreground">
            {users.length} utente{users.length !== 1 ? "i" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
