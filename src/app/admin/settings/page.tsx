"use client";

import { useState, useEffect } from "react";

const KNOWN_PAYMENT_METHODS: Record<string, string> = {
  card: "💳 Carta / Digital Wallet",
  bonifico: "🏦 Bonifico bancario",
  contanti: "💰 Contanti",
  bancomat: "💳 Bancomat / Maestro",
  paypal: "🅿️ PayPal",
  satispay: "⚡ Satispay",
};

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
  { key: "payment_methods", label: "Metodi di pagamento accettati", type: "payment-methods" },
];

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [selectedPayMethods, setSelectedPayMethods] = useState<string[]>([]);
  const [customPayMethod, setCustomPayMethod] = useState("");
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [pendingPayMethods, setPendingPayMethods] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/settings").then(async (res) => {
      const json = await res.json();
      setSettings(json);
      if (json.payment_methods) {
        setSelectedPayMethods(json.payment_methods.split("\n").filter(Boolean));
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");

    // Sync payment methods before saving
    const body = { ...settings, payment_methods: selectedPayMethods.join("\n") };

    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
            ) : type === "payment-methods" ? (
              <div className="md:col-span-2 space-y-3">
                <h3 className="text-base font-semibold mb-2">Metodi di pagamento accettati</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(KNOWN_PAYMENT_METHODS).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md hover:bg-muted transition-colors">
                      <input type="checkbox" checked={selectedPayMethods.includes(key)}
                        onChange={e => {
                          if (e.target.checked) setSelectedPayMethods([...selectedPayMethods, key]);
                          else setSelectedPayMethods(selectedPayMethods.filter(m => m !== key));
                        }}
                        className="rounded border-border text-primary" />
                      {label}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 items-center">
                  <input type="text" value={customPayMethod} onChange={e => setCustomPayMethod(e.target.value)}
                    placeholder="Nome metodo personalizzato (es. applepay)"
                    className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
                  <button type="button" onClick={() => {
                    const v = customPayMethod.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
                    if (v && !selectedPayMethods.includes(v)) {
                      setSelectedPayMethods([...selectedPayMethods, v]);
                      setCustomPayMethod("");
                    }
                  }} disabled={!customPayMethod.trim()}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-30">
                    + Aggiungi
                  </button>
                </div>
                {selectedPayMethods.filter(m => !KNOWN_PAYMENT_METHODS[m]).length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Metodi personalizzati:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPayMethods.filter(m => !KNOWN_PAYMENT_METHODS[m]).map(m => (
                        <span key={m} className="inline-flex items-center gap-1 rounded-md border bg-muted/30 px-2.5 py-1 text-xs">
                          {m}
                          <button onClick={() => setSelectedPayMethods(selectedPayMethods.filter(x => x !== m))}
                            className="text-muted-foreground hover:text-destructive">&times;</button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  I metodi selezionati appariranno nel checkout e negli ordini negozio.
                  {selectedPayMethods.length > 0 && (
                    <button type="button" onClick={() => { setPendingPayMethods([...selectedPayMethods]); setShowPayConfirm(true); }}
                      className="ml-2 text-primary hover:underline">
                      Rivedi selezione
                    </button>
                  )}
                </p>

                {/* Confirm dialog */}
                {showPayConfirm && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowPayConfirm(false)}>
                    <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl" onClick={e => e.stopPropagation()}>
                      <h3 className="font-semibold text-lg mb-2">Conferma metodi di pagamento</h3>
                      <p className="text-sm text-muted-foreground mb-4">Questi metodi saranno disponibili nel checkout e negli ordini negozio:</p>
                      <ul className="space-y-2 mb-6">
                        {pendingPayMethods.map(m => (
                          <li key={m} className="flex items-center gap-2 text-sm">
                            <span className="text-green-600">✓</span>
                            {KNOWN_PAYMENT_METHODS[m] || m.charAt(0).toUpperCase() + m.slice(1)}
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-3 justify-end">
                        <button type="button" onClick={() => setShowPayConfirm(false)}
                          className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted">
                          Chiudi
                        </button>
                      </div>
                    </div>
                  </div>
                )}
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
