# Guest Checkout — Flow & Implementation

> Guida al guest checkout per ig_ecomm.
> Ultimo aggiornamento: 2026-06-06

## Perché il guest checkout

Il guest checkout riduce l'abbandono del carrello eliminando la barriera della
registrazione obbligatoria. L'utente fornisce solo i dati minimi per la
spedizione (nome, email, indirizzo) e può completare l'acquisto in pochi
secondi. La creazione dell'account viene proposta **dopo** il pagamento.

## Flussi supportati

```
                    ┌─────────────────────┐
                    │  Aggiunta al carrello │
                    │  (no auth richiesta)  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Pagina checkout   │
                    │  3 opzioni chiare:   │
                    │                      │
                    │  🛒 Guest  │ G Google │
                    │  🔑 Accedi          │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │ Form dati    │  │ Google OAuth │  │ Login email  │
     │ spedizione   │  │ (auto-fill)  │  │ + password   │
     │ + email      │  └──────┬───────┘  └──────┬───────┘
     └──────┬───────┘         │                  │
            └─────────────────┼──────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  /api/checkout    │
                    │  Crea ordine nel  │
                    │  DB (user_id può  │
                    │  essere NULL)     │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │  Thank You Page   │
                    │  "Ordine confermato!"│
                    │                    │
                    │  [Crea account]    │
                    │  [Salta]           │
                    └────────────────────┘
```

## Dettaglio implementazione

### 1. Carrello persistente (localStorage)

Il carrello è gestito tramite un **React Context** + `useReducer`, persistito
in `localStorage` con chiave `ig_ecomm_cart`.

**File:** `src/lib/cart-store.tsx`

```tsx
// Componenti disponibili:
<CartProvider>    // Avvolge l'app (in providers.tsx)
useCart()          // Hook: state, addItem, removeItem, updateQuantity, clearCart
```

**Cosa persiste:**
- ID prodotto, variante, slug, titolo, immagine, prezzo, quantità, nome variante
- I dati sono JSON.stringify e salvati in localStorage
- Hydration al mount, persistenza a ogni modifica

### 2. Schema DB — userId nullable

La tabella `"order"` ora accetta `user_id` NULL per gli ordini guest:

```sql
ALTER TABLE "order" ALTER COLUMN "user_id" DROP NOT NULL;
```

Quando un utente registrato successivamente usa la stessa email, gli ordini
guest vengono collegati automaticamente:

```sql
UPDATE "order" SET user_id = $1 WHERE billing_email = $2 AND user_id IS NULL
```

### 3. Checkout API

**Endpoint:** `POST /api/checkout`

Accetta i dati di spedizione sia per utenti autenticati che guest:

| Parametro | Obbligatorio | Note |
|-----------|-------------|------|
| `items` | ✅ | Array di oggetti con productId, variantId, price, quantity |
| `email` | ✅ | Usata per inviare conferma ordine |
| `name` | ✅ | Nome e cognome per fattura/spedizione |
| `address`, `city`, `zip` | ✅ | Indirizzo di spedizione |
| `phone` | ❌ | Per il corriere |
| `province` | ❌ | |
| `newsletterConsent` | ❌ | GDPR opt-in flag, checkbox non preselezionata |

**Processo:**
1. Valida dati minimi
2. Calcola subtotal, shipping (gratis sopra €150), total
3. Genera orderNumber (`ORD-{timestamp}-{random}`)
4. Crea record in `"order"` (con `user_id = session.user.id` o `NULL`)
5. Crea record in `order_item` per ogni item
6. Decrementa stock in `product_variant`
7. Se newsletterConsent, iscrive la newsletter

### 4. Pagina checkout

**File:** `src/app/(shop)/checkout/page.tsx`

Tre opzioni chiare nella schermata iniziale:
- **🛒 Procedi come ospite** — solo dati spedizione (nessuna password)
- **G Continua con Google** — OAuth in un click
- **🔑 Accedi** — redirect a `/auth/login?callbackUrl=/checkout`

Il form di checkout richiede **solo**: nome, email, indirizzo, città, CAP.
Niente password. Unico extra: checkbox GDPR per newsletter (non preselezionata).

### 5. Thank You page + post-purchase registration

**File:** `src/app/(shop)/checkout/thank-you/page.tsx`

Dopo il pagamento riuscito, mostra:
1. ✅ Icona di successo + numero ordine
2. **"Salva i tuoi dati per i prossimi acquisti"** — form con un solo campo: password
3. Bottone "Salta" per rimandare

Alla creazione dell'account da ordine:
- **Endpoint:** `POST /api/auth/register-from-order`
- Crea utente CUSTOMER con nome + email (dall'ordine) + password
- Collega automaticamente tutti gli ordini guest con la stessa email
- Se l'utente esiste già (è già registrato), restituisce `alreadyExists: true`

### 6. GDPR & Privacy

| Aspetto | Implementazione |
|---------|----------------|
| Email usata solo per transazioni | ✅ Solo conferma ordine e tracking |
| Newsletter opt-in esplicito | ✅ Checkbox non preselezionata con testo chiaro |
| Dati minimi raccolti | ✅ Solo nome, email, indirizzo, telefono (opzionale) |
| Password non richiesta in checkout | ✅ Richiesta solo nella thank-you page (post-pagamento) |

## Collegamento ordini guest → account registrato

Quando un utente che ha acquistato come ospite crea un account (o fa login con
Google usando la stessa email), la query collega gli ordini:

```sql
-- In POST /api/auth/register-from-order
UPDATE "order" SET user_id = $1 WHERE billing_email = $2 AND user_id IS NULL;
```

Questo permette all'utente di vedere lo storico ordini completo dopo la
registrazione, anche per ordini fatti come ospite.

## Files modificati/creati

| File | Descrizione |
|------|-------------|
| `src/lib/cart-store.tsx` | 🆕 Cart context con localStorage |
| `src/components/providers.tsx` | Aggiunto CartProvider |
| `src/app/api/checkout/route.ts` | 🆕 Checkout API (guest + autenticato) |
| `src/app/api/auth/register-from-order/route.ts` | 🆕 Post-purchase account creation |
| `src/app/(shop)/checkout/page.tsx` | 🆕 Pagina checkout con 3 opzioni |
| `src/app/(shop)/checkout/thank-you/page.tsx` | 🆕 Thank-you + create account |
| `src/app/(shop)/product/[slug]/product-detail-client.tsx` | Aggiunto addItem al carrello |
| `src/db/schema/store.ts` | userId nullable su orders |
