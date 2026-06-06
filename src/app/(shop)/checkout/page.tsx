"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart-store";
import { useSession, signIn } from "next-auth/react";

export default function CheckoutPage() {
  const router = useRouter();
  const { state, totalPrice, clearCart } = useCart();
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  // Form state
  const [name, setName] = useState(session?.user?.name || "");
  const [email, setEmail] = useState(session?.user?.email || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [zip, setZip] = useState("");
  const [country] = useState("IT");
  const [newsletter, setNewsletter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"choose" | "guest" | "login" | "register">(
    isAuthenticated ? "guest" : "choose",
  );

  const subtotal = totalPrice;
  const shippingCost = subtotal >= 150 ? 0 : 9.9;
  const total = subtotal + shippingCost;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: state.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId,
            title: i.title,
            price: i.price,
            quantity: i.quantity,
          })),
          email, name, phone, address, city, province, zip, country,
          shippingMethod: "standard",
          paymentMethod: "card",
          newsletterConsent: newsletter,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error ?? "Errore durante l'elaborazione dell'ordine.");
        setLoading(false);
        return;
      }

      clearCart();
      router.push(`/checkout/thank-you?order=${json.order.orderNumber}`);
    } catch {
      setError("Errore di connessione. Riprova.");
      setLoading(false);
    }
  }

  // ── Empty cart ──────────────────────────────────────────────────
  if (state.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Carrello vuoto</h1>
        <p className="mt-2 text-muted-foreground">Aggiungi prodotti al carrello prima di procedere.</p>
        <a href="/products" className="mt-4 inline-block text-primary hover:underline">Vai al catalogo</a>
      </div>
    );
  }

  // ── Choose mode ─────────────────────────────────────────────────
  if (mode === "choose") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold mb-2">Checkout</h1>
        <p className="text-muted-foreground mb-8">Scegli come procedere con il tuo ordine.</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <button
            onClick={() => setMode("guest")}
            className="rounded-lg border-2 border-primary bg-card p-6 text-left hover:bg-primary/5 transition-colors"
          >
            <h2 className="font-bold text-lg">� guest</h2>
            <p className="text-sm text-muted-foreground mt-1">Procedi come ospite.<br />Solo i dati per la spedizione.</p>
          </button>

          <button
            onClick={() => signIn("google", { callbackUrl: "/checkout" })}
            className="rounded-lg border-2 border-border bg-card p-6 text-left hover:bg-muted transition-colors"
          >
            <h2 className="font-bold text-lg">G Google</h2>
            <p className="text-sm text-muted-foreground mt-1">Accedi con Google.<br />Un click, nessuna password.</p>
          </button>

          <button
            onClick={() => router.push("/auth/login?callbackUrl=/checkout")}
            className="rounded-lg border-2 border-border bg-card p-6 text-left hover:bg-muted transition-colors"
          >
            <h2 className="font-bold text-lg">🔑 Accedi</h2>
            <p className="text-sm text-muted-foreground mt-1">Hai già un account?<br />Accedi con email e password.</p>
          </button>
        </div>

        {/* Order summary */}
        <div className="mt-8 rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4">Riepilogo ordine ({state.items.length} articoli)</h2>
          {state.items.map((item) => (
            <div key={item.variantId} className="flex justify-between text-sm py-1">
              <span className="text-muted-foreground">{item.title} × {item.quantity}</span>
              <span>€{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t mt-2 pt-2 flex justify-between text-sm">
            <span>Spedizione</span>
            <span>{shippingCost === 0 ? "Gratuita" : `€${shippingCost.toFixed(2)}`}</span>
          </div>
          <div className="border-t mt-2 pt-2 flex justify-between font-bold">
            <span>Totale</span>
            <span>€{total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Guest / Authenticated checkout form ─────────────────────────
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      {mode === "guest" && (
        <p className="text-sm text-muted-foreground mb-4">
          Stai procedendo come ospite. Dopo il pagamento potrai creare un account in un click.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="ch-name" className="block text-sm font-medium mb-1">Nome e Cognome *</label>
            <input id="ch-name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div>
            <label htmlFor="ch-email" className="block text-sm font-medium mb-1">Email *</label>
            <input id="ch-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" autoComplete="email" />
          </div>
          <div>
            <label htmlFor="ch-phone" className="block text-sm font-medium mb-1">Telefono</label>
            <input id="ch-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" autoComplete="tel" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ch-address" className="block text-sm font-medium mb-1">Indirizzo *</label>
            <input id="ch-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)}
              required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" autoComplete="street-address" />
          </div>
          <div>
            <label htmlFor="ch-city" className="block text-sm font-medium mb-1">Città *</label>
            <input id="ch-city" type="text" value={city} onChange={(e) => setCity(e.target.value)}
              required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div>
            <label htmlFor="ch-province" className="block text-sm font-medium mb-1">Provincia</label>
            <input id="ch-province" type="text" value={province} onChange={(e) => setProvince(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div>
            <label htmlFor="ch-zip" className="block text-sm font-medium mb-1">CAP *</label>
            <input id="ch-zip" type="text" value={zip} onChange={(e) => setZip(e.target.value)}
              required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-ring" autoComplete="postal-code" />
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
        )}

        {/* GDPR newsletter opt-in */}
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)}
            className="mt-0.5 rounded border-border" />
          <span>Desidero ricevere offerte e novità via email. Consenso facoltativo, non preselezionato.</span>
        </label>

        {/* Order summary */}
        <div className="rounded-lg border bg-card p-4 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotale</span><span>€{subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Spedizione</span><span>{shippingCost === 0 ? "Gratuita" : `€${shippingCost.toFixed(2)}`}</span></div>
          <div className="border-t pt-2 flex justify-between font-bold text-base">
            <span>Totale</span><span>€{total.toFixed(2)}</span>
          </div>
          {subtotal < 150 && (
            <p className="text-xs text-muted-foreground pt-1">Spedizione gratuita per ordini sopra €150</p>
          )}
        </div>

        <button type="submit" disabled={loading}
          className="w-full rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 neon-glow">
          {loading ? "Elaborazione ordine..." : `Conferma ordine — €${total.toFixed(2)}`}
        </button>

        <p className="text-xs text-center text-muted-foreground">
          I tuoi dati sono al sicuro. Leggi la nostra{" "}
          <a href="/privacy" className="underline">privacy policy</a>.
        </p>
      </form>
    </div>
  );
}
