# Admin — Products Management

> Guida alla gestione dei prodotti nel pannello di amministrazione di ig_ecomm.
> Ultimo aggiornamento: 2026-06-27

## Panoramica

La sezione Prodotti del backoffice permette all'amministratore di creare,
modificare, organizzare e pubblicare i prodotti del catalogo. Include:

- Lista prodotti con ricerca avanzata e filtri
- Form di creazione/modifica completo
- Gestione varianti (attributi, prezzi, stock)
- Galleria immagini con alt text
- Campi SEO
- Duplicazione rapida
- Eliminazione singola e bulk
- Link "Vedi nel negozio" nella scheda prodotto (apre la pagina shop in una nuova tab)

## Architettura

```
┌──────────────────────────────────────────────────┐
│                  Frontend (Admin)                 │
│                                                   │
│  /admin/products         → Lista con filtri       │
│  /admin/products/new     → Form creazione         │
│  /admin/products/[id]    → Form modifica          │
└──────────────────────┬───────────────────────────┘
                       │ REST API
┌──────────────────────▼───────────────────────────┐
│               API Routes                          │
│                                                   │
│  GET    /api/admin/products      → Lista + filtri │
│  POST   /api/admin/products      → Crea prodotto │
│  GET    /api/admin/products/[id] → Dettaglio     │
│  PUT    /api/admin/products/[id] → Aggiorna      │
│  DELETE /api/admin/products/[id] → Elimina       │
│  POST   /api/admin/upload        → Aggiungi img  │
│  DELETE /api/admin/upload        → Rimuovi img   │
│  POST   /api/admin/import-images → Importa img Icecat su Storage │
│  POST   /api/admin/product-images/reorder → Riordina gallery + cover │
└──────────────────────┬───────────────────────────┘
                       │ SQL
┌──────────────────────▼───────────────────────────┐
│               Database (PostgreSQL)               │
│                                                   │
│  product            → Dati anagrafici             │
│  product_variant    → Varianti (prezzo, stock)    │
│  product_image      → Immagini (URL, alt)         │
│  category           → Categorie                   │
│  brand              → Marche                      │
└──────────────────────────────────────────────────┘
```

## Lista prodotti

**Percorso:** `/admin/products`

### Funzionalità

| Funzione | Descrizione |
|----------|-------------|
| **Ricerca** | Cerca per titolo, identificativo o SKU (case-insensitive) |
| **Filtro categoria** | Filtra per categoria |
| **Filtro marca** | Filtra per marca |
| **Filtro stato** | Mostra solo pubblicati / solo bozze / tutti |
| **Ordinamento** | Più recenti, nome A–Z, prezzo crescente/decrescente |
| **Paginazione** | 20 prodotti per pagina |
| **Selezione multipla** | Checkbox per selezionare + eliminazione bulk |
| **Eliminazione singola** | Pulsante "Elimina" per riga con conferma |

### Colonne tabella

- **Checkbox** — selezione per azioni bulk
- **Prodotto** — titolo con link alla modifica + badge "In evidenza"
- **SKU** — codice interno
- **Prezzo** — prezzo base formattato
- **Stock** — somma stock varianti + conteggio varianti
- **Categoria** — nome categoria
- **Stato** — badge "Pubblicato" (verde) o "Bozza" (giallo)
- **Data** — data di creazione
- **Azioni** — pulsanti Modifica ed Elimina

## Form prodotto

**Percorsi:** `/admin/products/new` (creazione) / `/admin/products/[id]` (modifica)

### Sezioni del form

Layout a blocco unico a tutta larghezza (area admin, max ~1680px):
1. **In alto** — barra Icecat (input GTIN con placeholder "GTIN (EAN/UPC)") + bottone centralizzato **"✨ Formatta SEO con AI"** (formatta la descrizione dettagliata e genera meta title/description);
2. **Parte 1** — due colonne: **Stato** (30%) e **Immagini** (70%);
3. **Parte 2** — **Informazioni di base** al 100%: dati anagrafici, e dentro la stessa card **Prezzi** (con Peso), **Organizzazione** (categoria/marca) e **Varianti**;
4. **Parte 3** — **Descrizione dettagliata** al 100% (editor) con i campi **SEO** (meta title/description) sotto l'editor;
5. **Parte 4** — **Specifiche tecniche** al 100% (JSON + anteprima).

#### 1. Informazioni di base

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| Titolo | `text` | ✅ | Nome pubblico del prodotto |
| Slug | `text` | ❌ | Auto-generato dal titolo, modificabile + pulsante ripristino |
| Identificativo | `text` | ❌ | Codice interno (auto-generato se vuoto) |
| SKU | `text` | ❌ | Stock Keeping Unit, codice univoco interno |
| **EAN / GTIN** | `text` | ✅ | Codice GTIN del prodotto (EAN-13, UPC-A, EAN-8…), 8-14 cifre. **Obbligatorio** e indipendente dalla ricerca Icecat: campo libero, accetta solo cifre. In assenza di GTIN valido il salvataggio viene rifiutato (client + API) |
| Descrizione breve | `textarea` | ❌ | Riassunto visibile nel catalogo |
| Descrizione dettagliata | `textarea` (HTML) | ❌ | Contenuto formattato (grassetti, tabelle, immagini, video). Il pulsante **"Formatta SEO"** nella toolbar riformatta il contenuto con l'AI — è **disabilitato finché l'editor è vuoto** |
| Specifiche tecniche | `textarea` (JSON) | ❌ | Specifiche **raggruppate** in JSON: `[{ "group": "Display", "rows": [{ "label": "Risoluzione", "value": "3440x1440" }] }]` — compilate da Icecat preservando i `FeaturesGroups`, renderizzate con heading per gruppo. Il formato permette il futuro **confronto prodotti**. I dati legacy (tabella HTML piatta) continuano a essere renderizzati |

#### 2. Prezzi

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| Prezzo base | `number` | ✅ | Prezzo standard di vendita, IVA esclusa |
| Prezzo in offerta | `number` | ❌ | Prezzo scontato (compare_at_price) |
| Prezzo di costo | `number` | ❌ | Visibile solo all'admin per calcolo margine |
| Peso (kg) | `number` | ❌ | Per calcolo spedizioni |

##### Enrichment via Icecat (barra di ricerca GTIN, in alto)

Con `ICECAT_USERNAME` + `ICECAT_KEY` configurati (vedi `.env.example`), l'input **"GTIN (EAN/UPC)"** nella barra in cima al form (pulsante **"📦 Cerca su Icecat"**) interroga `GET /api/products/lookup-ean?ean=xxx`. La ricerca è **separata** dal campo EAN del prodotto: il campo EAN resta un dato obbligatorio e indipendente da Icecat (viene precompilato dal GTIN cercato solo se ancora vuoto, ed è sempre modificabile). Se il prodotto esiste nel catalogo, si apre una **dialog "Dati trovati su Icecat"** con tutte le sezioni restituite, ciascuna con checkbox e anteprima:

| Sezione | Fonte Icecat (Live API `live.icecat.biz/api`) |
|---------|-----------------------------------------------|
| Titolo | `GeneralInfo.Title` |
| Descrizione breve | `GeneralInfo.SummaryDescription.ShortSummaryDescription` |
| Descrizione lunga (content) | `GeneralInfo.SummaryDescription.LongSummaryDescription` |
| Specifiche tecniche | `FeaturesGroups[].Features[]` → JSON raggruppato nel campo dedicato **"Specifiche tecniche"** (preserva i nomi dei gruppi Icecat; riga "Dimensioni (L×A×P)" aggiunta solo nel fallback senza gruppi) |
| Bullet points | `GeneralInfo.BulletPoints.Values` / `GeneratedBulletPoints.Values` / `ReasonsToBuy` |
| Peso (kg) | spec "Peso dell'imballo" (poi senza supporto, poi primo peso) |
| Immagini | `Image` + `Gallery[]` (max 12, dedupe) → miniature nella dialog |
| Brand | match per nome/slug sul catalogo esistente |
| Categoria | match per `CategoryFeature` sul catalogo esistente |

**Comportamento:**
- Le sezioni che **non sovrascriverebbero nulla** (campi vuoti) sono **preselezionate**; quelle che andrebbero a sovrascrivere un campo già compilato sono **deselezionate** e marcate con badge giallo "già compilato — verrà sovrascritto"
- **"Importa selezionate (N)"** applica solo le sezioni spuntate (disabilitato se nessuna selezionata); **"Annulla"** chiude senza toccare il form
- Prezzo e stock restano sempre manuali
- Le immagini trovate su Icecat **non vengono salvate come URL esterni**: vengono scaricate lato server e copiate su **Supabase Storage** con il classico path `products/{productId}/{timestamp}-{random}.{ext}` (vedi sotto, sezione Immagini)

#### 4. Immagini

- **Aggiunta manuale:** URL immagine + testo alternativo (alt) → pulsante "Aggiungi"
- **Upload file:** drag & drop o selezione (JPG, PNG, WebP, AVIF — max 5MB)
- **Da Icecat:** dopo la ricerca EAN, le immagini trovate appaiono in anteprima nella sezione Immagini:
  - **Prodotto esistente** → pulsante **"Importa su Storage (N)"**: scarica ogni immagine da `images.icecat.biz`, la ridimensiona lato server (max 1600px, WebP q82 — le foto Icecat superano spesso 5MB), la carica su Supabase Storage in `products/{productId}/{timestamp}-{random}.webp` e salva i record in `product_image`
  - **Nuovo prodotto** → le immagini vengono importate **automaticamente al salvataggio** (dopo la creazione), prima di arrivare alla pagina di modifica. Se l'import automatico fallisce, la pagina di modifica mostra il messaggio d'errore (banner rosso) — le immagini possono essere importate in un secondo momento col pulsante "Importa su Storage"
- **Ordine e copertina:** la prima immagine è la **copertina** (badge "Copertina", usata come thumbnail nel catalogo). Sotto ogni miniatura:
  - **↑ / ↓** per spostare l'immagine nell'ordine della galleria
  - **★** per impostare l'immagine come copertina (la porta in prima posizione)
  - L'ordine viene salvato subito via `POST /api/admin/product-images/reorder` (aggiorna `sort_order` in transazione)
- **Galleria:** miniature con pulsante × per rimuovere
- **Alt text:** obbligatorio per accessibilità (EAA)
- **Nota:** il prodotto deve essere salvato prima di poter aggiungere immagini

#### 5. Varianti

- **Aggiunta dinamica:** pulsante "+ Aggiungi variante"
- **Campi per variante:**
  - Nome (es. "Taglia M", "Colore Rosso")
  - Prezzo (differente dal base se applicabile)
  - Stock (quantità specifica)
  - SKU (codice specifico)
- **Rimozione:** pulsante "Rimuovi" per variante
- Se nessuna variante è definita, il prodotto usa il prezzo base

#### 6. Organizzazione

| Campo | Tipo | Note |
|-------|------|------|
| Categoria | `select` | Caricata dinamicamente dal DB |
| Marca | `select` | Caricata dinamicamente dal DB |

#### 7. SEO

| Campo | Tipo | Note |
|-------|------|------|
| Meta Title | `text` | Titolo ottimizzato per motori di ricerca |
| Meta Description | `textarea` | Riassunto per SERP |

#### 8. Stato

| Opzione | Tipo | Effetto |
|---------|------|---------|
| Pubblicato | `checkbox` | Visibile nel catalogo e acquistabile |
| In evidenza | `checkbox` | Mostrato in homepage (sezione featured) |

### Pulsanti azione

| Pulsante | Quando | Effetto |
|----------|--------|---------|
| **Duplica** | Solo modifica | Crea copia esatta con "(copia)" nel titolo, slug modificato, bozza |
| **Crea prodotto** | Solo nuovo | Salva e reindirizza alla pagina di modifica |
| **Salva modifiche** | Solo modifica | Aggiorna e mostra messaggio di conferma |

## API Reference

### `GET /api/admin/products`

Lista prodotti con filtri.

**Query params:** `search`, `category`, `brand`, `status` (published|draft), `sort`, `page`, `limit`

**Response:**
```json
{
  "products": [{ "id": "...", "title": "...", "basePrice": 99.99, "published": true, ... }],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 },
  "filters": { "categories": [...], "brands": [...] }
}
```

### `POST /api/admin/products`

Crea un nuovo prodotto.

**Body:** `{ title, basePrice, barcode, description?, content?, compareAtPrice?, costPrice?, sku?, weight?, seoTitle?, seoDescription?, published?, featured?, categoryId?, brandId? }` — `barcode` (GTIN/EAN, 8-14 cifre) è **obbligatorio** e validato sia in POST che in PUT (Zod, `productSchema`).

### `GET /api/admin/products/[id]`

Dettaglio prodotto con immagini e varianti.

### `PUT /api/admin/products/[id]`

Aggiorna un prodotto esistente. Stessi campi della creazione.

### `DELETE /api/admin/products/[id]`

Elimina un prodotto (cascade su varianti e immagini).

### `POST /api/admin/upload`

Aggiunge un'immagine a un prodotto (solo ADMIN).

**Due modalità:**

1. **File upload** — `multipart/form-data` con `file`, `productId`, `alt`:
   - Formati accettati: **JPG, PNG, WebP, AVIF** — max **5MB**
   - Il file viene caricato su **Supabase Storage** (bucket pubblico `product-images`, auto-creato al primo upload) in `products/{productId}/{timestamp}-{random}.{ext}` con cache 1 anno
   - L'URL pubblico risultante viene salvato nella tabella `product_image` con `sort_order` progressivo

2. **URL fallback** — `{ url, alt?, productId }` in JSON: salva un riferimento esterno (es. URL Icecat) senza scaricare nulla

### `DELETE /api/admin/upload?id=xxx`

Rimuove un'immagine: elimina il record dal DB e prova a rimuovere l'oggetto dallo storage (best-effort). Il DB è la fonte di verità.

### `POST /api/admin/import-images`

Copia immagini esterne (Icecat) su **Supabase Storage** e salva i record in `product_image` (solo ADMIN).
**Body:** `{ productId, images: [{ url, alt? }] }` — max 20 immagini.

**Validazioni:**
- Solo URL **HTTPS** verso host Icecat (`images.icecat.biz`, `bo.icecat.biz`, `icecat.biz`) — blocca SSRF verso host arbitrari
- Formati accettati: **JPG, PNG, WebP, AVIF** — max **5MB** per immagine
- Gli errori per singola immagine (formato/dimensione/download) **non bloccano** le altre: tornano in `errors[]`

**Flusso:** ogni URL viene scaricato lato server → validato → caricato in `products/{productId}/{timestamp}-{random}.{ext}` (cache 1 anno) → record `product_image` con `sort_order` progressivo.

**Response:**
```json
{
  "success": true,
  "imported": [{ "id": 11, "url": "https://...supabase.co/...", "alt": "...", "sort_order": 3 }],
  "errors": [{ "url": "https://images.icecat.biz/bad.jpg", "error": "Formato non supportato" }],
  "failedCount": 1
}
```

**Env vars richieste:** `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server-side only).

**Env vars richieste:** `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server-side only).

**Env vars richieste per l'upload:** `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (server-side only, vedi `src/lib/supabase-admin.ts`).

### `POST /api/admin/product-images/reorder`

Riordina la galleria di un prodotto (solo ADMIN). La **prima immagine** (`sort_order = 0`) è la **copertina**.

**Body:** `{ productId, images: [{ id, sortOrder }] }` — max 100 immagini, `sortOrder` intero ≥ 0.

**Validazioni:**
- Ogni `id` deve appartenere al prodotto indicato — altrimenti **404 + ROLLBACK** (transazione)
- L'aggiornamento avviene in **transazione** (BEGIN → UPDATE × N → COMMIT)

**Response:** `{ success: true, count: N }`

## Files

| File | Descrizione |
|------|-------------|
| `src/app/admin/products/page.tsx` | Lista prodotti + filtri |
| `src/app/admin/products/new/page.tsx` | Pagina creazione |
| `src/app/admin/products/[id]/page.tsx` | Pagina modifica (Server Component + params async) |
| `src/components/admin/product-form.tsx` | Form riutilizzabile |
| `src/app/api/admin/products/route.ts` | API list + create |
| `src/app/api/admin/products/[id]/route.ts` | API get + update + delete |
| `src/app/api/admin/upload/route.ts` | API immagini |
| `src/app/api/admin/import-images/route.ts` | API import immagini Icecat → Storage |
| `src/app/api/admin/product-images/reorder/route.ts` | API riordino galleria + copertina |