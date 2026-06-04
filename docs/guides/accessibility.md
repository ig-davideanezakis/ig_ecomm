# Accessibility — European Accessibility Act (EAA) Compliance

> Guida alle pratiche di accessibilità per ig_ecomm, in ottemperanza
> all'European Accessibility Act (EAA) 2025 per il commercio elettronico.
> Ultimo aggiornamento: 2026-06-03

## Indice

1. [Overview EAA](#overview-eaa)
2. [Immagini (next/image)](#immagini-nextimage)
3. [Gestione del Focus](#gestione-del-focus)
4. [Linting rigoroso (jsx-a11y)](#linting-rigoroso-jsx-a11y)
5. [Indicatore di Focus (focus-visible)](#indicatore-di-focus-focus-visible)
6. [Dialog e Drawer (shadcn)](#dialog-e-drawer-shadcn)
7. [Menu a discesa e Select](#menu-a-discesa-e-select)
8. [Aggiornamenti dinamici (aria-live)](#aggiornamenti-dinamici-aria-live)
9. [Griglie di prodotti semantiche](#griglie-di-prodotti-semantiche)
10. [Form di Checkout](#form-di-checkout)
11. [Test automatizzati nella CI/CD](#test-automatizzati-nella-cicd)
12. [Checklist Implementazione](#checklist-implementazione)

---

## Overview EAA

L'**European Accessibility Act (EAA)** impone standard severi di accessibilità
per i siti di e-commerce a partire da giugno 2025. I requisiti chiave:

- **Perceivable**: contenuti presentati in modi accessibili a tutti i sensi
- **Operable**: interfacce navigabili con vari metodi di input (tastiera, touch,
  screen reader)
- **Understandable**: testo leggibile, comportamenti prevedibili
- **Robust**: compatibilità con tecnologie assistive attuali e future

Il mancato adeguamento può comportare sanzioni e限制了 l'accesso al mercato europeo.
Questo documento definisce gli standard di implementazione per ig_ecomm.

---

## Immagini (next/image)

### Regole obbligatorie

1. **Usare sempre `next/image`** — mai `<img>` nudo. Previene il Cumulative Layout
   Shift (CLS) e ottimizza automaticamente le immagini.

2. **Attributo `alt` sempre presente:**
   - Immagini **funzionali/decorative** (icone, pattern, sfondi): `alt=""`
   - Immagini **informative** (foto prodotto, logo): `alt="Descrizione chiara"`
   - Immagini **link** (es. immagine prodotto che rimanda al dettaglio):
     `alt="Nome prodotto — vedi dettagli"` (descrive la destinazione del link)

3. **Buona descrizione `alt`:**
   - Descrivi il **contenuto e la funzione**, non l'aspetto tecnico
   - ☑️ `alt="Notebook Dell XPS 15 — schermo da 15.6 pollici,银色"`
   - ❌ `alt="image123.jpg"` o `alt="foto del prodotto"`

### Implementazione

```tsx
import Image from "next/image";

// Immagine informativa
<Image
  src="/products/notebook-dell-xps-15.jpg"
  alt="Notebook Dell XPS 15 — schermo 15.6\" Intel Core i7-13700H"
  width={600}
  height={400}
  priority // per hero image o above-the-fold
/>

// Immagine decorativa
<Image
  src="/patterns/bg-grid.svg"
  alt=""
  width={1920}
  height={1080}
  aria-hidden="true"
/>
```

---

## Gestione del Focus

Nelle SPA (Next.js con transizioni lato client), il focus del browser **non si
resetta automaticamente** quando si cambia pagina. Un utente che naviga con
tastiera o screen reader potrebbe ritrovarsi con il focus su un elemento della
pagina precedente.

### Pattern obbligatorio: Focus sul titolo principale

Creare un componente `SkipNav` che sposta il focus sull'`<h1>` dopo ogni
navigazione, e un link "Salta al contenuto" all'inizio della pagina.

```tsx
// components/skip-nav.tsx
"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function SkipNav() {
  const pathname = usePathname();
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [pathname]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:text-foreground focus:ring-2 focus:ring-primary"
      >
        Salta al contenuto principale
      </a>
      <h1 ref={ref} tabIndex={-1} className="sr-only">
        {/* Titolo contestuale impostato dal layout */}
      </h1>
    </>
  );
}
```

Nel layout principale:
```tsx
// app/layout.tsx
<body>
  <SkipNav />
  <main id="main-content">
    {children}
  </main>
</body>
```

### Quando NON spostare il focus

- **Dialog / Sheet / Drawer**: shadcn gestisce automaticamente il focus trap e
  il ritorno all'elemento di apertura alla chiusura
- **Form con errori**: spostare il focus sul primo campo in errore, non sull'h1

---

## Linting rigoroso (jsx-a11y)

### Installazione

```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

### Configurazione

Aggiungere il plugin nel file `eslint.config.mjs`:

```ts
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  // ... config esistente
  {
    plugins: { jsxA11y },
    rules: {
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/img-redundant-alt": "warn",
      "jsx-a11y/label-has-associated-control": "error",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-noninteractive-tabindex": "warn",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/tabindex-no-positive": "error",
    },
  },
]);
```

### Regole chiave

| Regola | Livello | Cosa controlla |
|--------|---------|----------------|
| `alt-text` | error | Ogni `<img>`, `<input type="image">`, `<area>` deve avere `alt` |
| `label-has-associated-control` | error | Ogni `<label>` deve essere associata a un input (`htmlFor`) |
| `aria-props` | error | Attributi ARIA validi |
| `tabindex-no-positive` | error | `tabIndex` solo 0 o -1, mai positivo |
| `click-events-have-key-events` | warn | Elementi clickabili devono supportare tastiera |
| `no-autofocus` | warn | `autoFocus` solo in contesti giustificati (login, ricerca) |

---

## Indicatore di Focus (focus-visible)

### Regola d'oro

**Non rimuovere mai l'outline di focus.** Quando si personalizzano componenti
con Tailwind, usare sempre le classi `focus-visible:ring` per sostituire
l'outline di default con un indicatore personalizzato.

### Pattern

```tsx
// ✅ Corretto: outline rimosso ma sostituito con ring personalizzato
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
  Clicca qui
</button>

// ❌ Errore: outline rimosso senza alternativa
<button className="outline-none">
  Clicca qui
</button>
```

### Componenti shadcn

I componenti shadcn già includono `focus-visible:ring-2 focus-visible:ring-ring`
nel loro styling predefinito. **Non alterare queste classi** nelle
personalizzazioni.

---

## Dialog e Drawer (shadcn)

I componenti `Dialog` e `Sheet` di shadcn gestiscono autonomamente:

- **Focus trap**: il focus rimane all'interno del modal finché non viene chiuso
- **Ritorno focus**: alla chiusura, il focus torna all'elemento che ha aperto il
  dialog
- **Chiusura con Escape**: gestita automaticamente
- **Overlay**: l'area esterna non è interagibile finché il modal è aperto

### Regole

1. **Fornire sempre `DialogTitle` e `DialogDescription`** — necessari per gli
   screen reader:

```tsx
<Dialog>
  <DialogTrigger>Aggiungi al carrello</DialogTrigger>
  <DialogContent>
    <DialogTitle>Prodotto aggiunto al carrello</DialogTitle>
    <DialogDescription>
      Notebook Dell XPS 15 è stato aggiunto al tuo carrello.
      {"{Articoli:"} 1 — {"Totale:"} €1.299,00
    </DialogDescription>
    {/* ... azioni */}
  </DialogContent>
</Dialog>
```

2. **Non alterare il focus trap** con script esterni o modifiche strutturali nel
   DOM
3. **Non rimuovere l'overlay** senza fornire un'alternativa accessibile

---

## Menu a discesa e Select

Usare i componenti nativi di shadcn (`Select`, `Command`, `Popover`) per filtri
e ordinamenti. Questi supportano già:

- Navigazione con **tasti freccia** (su/giù)
- **Home / End** per primo/ultimo elemento
- **Selezione rapida** digitando le lettere
- **Valore corrente** annunciato dagli screen reader

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

<Select>
  <SelectTrigger aria-label="Ordina prodotti">
    <SelectValue placeholder="Ordina per" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="price-asc">Prezzo: dal più basso</SelectItem>
    <SelectItem value="price-desc">Prezzo: dal più alto</SelectItem>
    <SelectItem value="newest">Più recenti</SelectItem>
  </SelectContent>
</Select>
```

---

## Aggiornamenti dinamici (aria-live)

Quando un utente aggiunge/rimuove un prodotto dal carrello o esegue altre azioni
asincrone, l'aggiornamento deve essere comunicato agli screen reader **senza
interrompere la navigazione corrente**.

### Pattern con Toast (shadcn)

I componenti Toast di shadcn integrano già `role="alert"` / `aria-live="polite"`.
Usarli per notifiche di azioni asincrone:

```tsx
import { toast } from "sonner";

async function addToCart(productId: string) {
  await fetch("/api/cart/add", { method: "POST", body: JSON.stringify({ productId }) });
  toast.success("Prodotto aggiunto al carrello", {
    description: `${productName} — Vai al carrello per completare l'acquisto.`,
    action: { label: "Vedi carrello", onClick: () => router.push("/cart") },
  });
}
```

### Pattern con regione live manuale

Per aggiornamenti in-page (es. contatore carrello nella navbar):

```tsx
<span
  aria-live="polite"
  aria-atomic="true"
  className="sr-only"
>
  {cartCount > 0
    ? `${cartCount} ${cartCount === 1 ? "articolo" : "articoli"} nel carrello`
    : "Carrello vuoto"}
</span>
```

### Casi d'uso

| Azione | Regione | Messaggio esempio |
|--------|---------|------------------|
| Aggiunta al carrello | Toast | "Notebook XYZ aggiunto al carrello" |
| Rimozione dal carrello | Toast | "Notebook XYZ rimosso dal carrello" |
| Errore di validazione | `aria-describedby` sul campo | "Il campo email è obbligatorio" |
| Caricamento risultati | `aria-live="polite"` o spinner con `role="status"` | "Caricamento prodotti in corso..." |
| Filtro applicato | `aria-live="polite"` | "Filtrato per: Prezzo €500-€1000 — 12 risultati" |

---

## Griglie di prodotti semantiche

La lista dei prodotti deve usare una struttura semantica per permettere agli
screen reader di annunciare il numero totale di prodotti.

### Pattern obbligatorio

```tsx
<section aria-labelledby="products-heading">
  <h2 id="products-heading" className="sr-only">Prodotti in vendita</h2>
  {products.length > 0 && (
    <p className="sr-only" role="status">
      {products.length} prodotti trovati
    </p>
  )}
  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    {products.map((product) => (
      <li key={product.id}>
        <ProductCard product={product} />
      </li>
    ))}
  </ul>
</section>
```

### Vantaggi

- Screen reader annuncia "Lista di 12 elementi" prima di leggerli
- Navigazione rapida tramite scorciatoie da tastiera (es. tasto L su NVDA)
- Relazioni semantiche chiare tra sezioni

---

## Form di Checkout

### Label associate

Ogni campo di input DEVE avere una `<label>` esplicitamente associata tramite
`htmlFor`:

```tsx
<div>
  <Label htmlFor="shipping-address">Indirizzo di spedizione</Label>
  <Input
    id="shipping-address"
    name="shippingAddress"
    required
    autoComplete="shipping street-address"
  />
</div>
```

### Errori associati (aria-describedby)

I messaggi di errore devono essere associati all'input tramite `aria-describedby`
per essere letti dalla tecnologia assistiva quando il campo riceve focus:

```tsx
// Con React Hook Form + Zod
<div>
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    {...field}
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? "email-error" : undefined}
    autoComplete="email"
  />
  {errors.email && (
    <p id="email-error" className="text-sm text-destructive mt-1" role="alert">
      {errors.email.message}
    </p>
  )}
</div>
```

### Autocompilazione

Usare sempre attributi `autoComplete` standard per agevolare utenti con
limitazioni motorie o cognitive:

| Campo | `autoComplete` |
|-------|----------------|
| Nome completo | `name` |
| Indirizzo email | `email` |
| Telefono | `tel` |
| Indirizzo spedizione | `shipping street-address` |
| Città | `shipping address-level2` |
| CAP | `shipping postal-code` |
| Provincia | `shipping address-level1` |
| Nazione | `shipping country` |
| Numero carta | `cc-number` |
| Scadenza carta | `cc-exp` |
| CVV | `cc-csc` |

---

## Test automatizzati nella CI/CD

### axe-core con Playwright

Integrare [axe-core](https://www.deque.com/axe/) nei test E2E per rilevare
violazioni comuni di accessibilità:

```bash
npm install --save-dev @axe-core/playwright
```

Test di esempio:

```ts
// e2e/accessibility.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("homepage should have no accessibility violations", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("login page should have no critical violations", async ({ page }) => {
  await page.goto("/auth/login");
  await page.waitForLoadState("networkidle");

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations.filter((v) => v.impact === "critical")).toEqual([]);
});
```

### CI workflow

Aggiungere un job nel workflow CI (`ci.yml`):

```yaml
a11y:
  name: Accessibility
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: "npm"
    - run: npm ci
    - name: Install Playwright
      run: npx playwright install chromium --with-deps
    - name: Run aXe accessibility tests
      run: npx playwright test e2e/accessibility.spec.ts
```

### Coverage target

| Pagina | Priorità | Tag WCAG | Target violations |
|--------|----------|----------|-------------------|
| Homepage | Alta | wcag2a, wcag2aa | 0 critical/serious |
| Catalogo prodotti | Alta | wcag2a, wcag2aa | 0 critical/serious |
| Dettaglio prodotto | Alta | wcag2a, wcag2aa | 0 critical/serious |
| Login / Registrazione | Alta | wcag2a, wcag2aa | 0 violations |
| Checkout | Critica | wcag2a, wcag2aa, wcag21a, wcag21aa | 0 violations |
| Carrello | Alta | wcag2a, wcag2aa | 0 critical/serious |
| Admin dashboard | Media | wcag2a | 0 critical |

---

## Checklist Implementazione

Questa checklist va seguita per OGNI nuova feature o modifica:

### Obbligatoria (bloccante per merge)

- [ ] `<img>` sostituito con `next/image` (mai `<img>` nudo)
- [ ] `alt` descrittivo su ogni immagine (o `alt=""` se decorativa)
- [ ] `<label>` associata a ogni input via `htmlFor`
- [ ] Campi form hanno `autoComplete` appropriato
- [ ] Errori associati via `aria-describedby`
- [ ] Bottoni/azioni hanno supporto tastiera (`onKeyDown` + `onClick`)
- [ ] Focus non rimosso (`focus-visible:ring` presente)
- [ ] Liste prodotti in `<ul>`/`<li>` (non `<div>` generici)
- [ ] Dialog hanno `DialogTitle` + `DialogDescription`
- [ ] `npm run lint` zero errori (incluso jsx-a11y dopo installazione)

### Raccomandata

- [ ] Messaggi dinamici con `aria-live` o Toast
- [ ] Focus reset su cambio pagina (SkipNav)
- [ ] Prodotti filtrati con conteggio annunciato (`role="status"`)
- [ ] Test aXe-core nella pagina
- [ ] Test E2E con verifica assenza violazioni critiche
- [ ] Lighthouse audit con target 90+

---

## Risorse

- [European Accessibility Act (EAA)](https://ec.europa.eu/social/main.jsp?catId=1202)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Next.js Accessibility Docs](https://nextjs.org/docs/app/building-your-application/optimizing/accessibility)
- [shadcn/ui Accessibility](https://ui.shadcn.com/docs/accessibility)
- [axe-core Docs](https://www.deque.com/axe/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
