"use client";

import { useState, useEffect } from "react";

const SETTING_FIELDS = [
  { key: "store_name", label: "Nome negozio", type: "text" },
  { key: "store_tagline", label: "Tagline / descrizione", type: "textarea" },
  { key: "store_email", label: "Email", type: "text" },
  { key: "store_phone", label: "Telefono", type: "text" },
  { key: "store_address", label: "Indirizzo", type: "text" },
  { key: "footer_categories_title", label: "Titolo sezione Categorie (footer)", type: "text" },
  { key: "footer_info_title", label: "Titolo sezione Info (footer)", type: "text" },
  { key: "footer_contacts_title", label: "Titolo sezione Contatti (footer)", type: "text" },
  { key: "footer_about_text", label: "Testo sul footer (sotto il logo)", type: "textarea" },
  { key: "social_facebook", label: "Facebook URL", type: "text" },
  { key: "social_instagram", label: "Instagram URL", type: "text" },
  { key: "social_youtube", label: "YouTube URL", type: "text" },
  { key: "copyright_text", label: "Testo copyright", type: "text" },
  { key: "seo_format_prompt", label: "✨ Prompt AI formattazione SEO", type: "seo-prompt" },
  { key: "__payments", label: "Pagamenti", type: "section" },
  { key: "bank_intestatario", label: "Bonifico — Intestatario", type: "text" },
  { key: "bank_iban", label: "Bonifico — IBAN", type: "text" },
  { key: "bank_bic", label: "Bonifico — BIC/SWIFT", type: "text" },
  { key: "bank_banca", label: "Bonifico — Nome banca", type: "text" },
  { key: "bank_notes", label: "Bonifico — Note (causale, ecc.)", type: "textarea" },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings").then(async (res) => {
      const json = await res.json();
      setSettings(json);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSuccess("Impostazioni salvate!");
    setSaving(false);
    setTimeout(() => setSuccess(""), 3000);
  };

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Caricamento...</div>;

  return (
    <form onSubmit={handleSave} className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Impostazioni negozio</h1>
        <button type="submit" disabled={saving}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {saving ? "Salvataggio..." : "Salva impostazioni"}
        </button>
      </div>

      {success && (
        <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-600">{success}</div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {SETTING_FIELDS.map(({ key, label, type }) => (
          <div key={key} className={type === "seo-prompt" || type === "section" ? "md:col-span-2" : ""}>
            <label htmlFor={`s-${key}`} className="block text-sm font-medium mb-1">{label}</label>
            {type === "section" ? (
              <div className="border-b pt-4 pb-2 mb-2">
                <h3 className="text-base font-semibold">{label}</h3>
              </div>
            ) : type === "seo-prompt" ? (
              <div className="space-y-2">
                <textarea id={`s-${key}`} value={settings[key] || ""} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                  rows={12}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono focus-visible:ring-2 focus-visible:ring-ring" />
                <p className="text-xs text-muted-foreground">
                  Questo prompt viene inviato a DeepSeek AI per formattare il contenuto. Modificalo per personalizzare lo stile, il tono e le regole SEO.
                  Lascia vuoto per usare il prompt predefinito.
                </p>
              </div>
            ) : type === "textarea" ? (
              <textarea id={`s-${key}`} value={settings[key] || ""} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            ) : (
              <input id={`s-${key}`} type="text" value={settings[key] || ""} onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
            )}
          </div>
        ))}
      </div>
    </form>
  );
}
