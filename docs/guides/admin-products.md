# Admin — Products Management

> Guida alla gestione dei prodotti nel pannello di amministrazione di ig_ecomm.
> Ultimo aggiornamento: 2026-06-06

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

#### 1. Informazioni di base

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| Titolo | `text` | ✅ | Nome pubblico del prodotto |
| Slug | `text` | ❌ | Auto-generato dal titolo, modificabile + pulsante ripristino |
| Identificativo | `text` | ❌ | Codice interno (auto-generato se vuoto) |
| Descrizione breve | `textarea` | ❌ | Riassunto visibile nel catalogo |
| Descrizione dettagliata | `textarea` (HTML) | ❌ | Contenuto formattato (grassetti, tabelle, immagini, video) |

#### 2. Prezzi

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| Prezzo base | `number` | ✅ | Prezzo standard di vendita, IVA esclusa |
| Prezzo in offerta | `number` | ❌ | Prezzo scontato (compare_at_price) |
| Prezzo di costo | `number` | ❌ | Visibile solo all'admin per calcolo margine |

#### 3. Inventario e logistica

| Campo | Tipo | Obbligatorio | Note |
|-------|------|-------------|------|
| SKU | `text` | ❌ | Stock Keeping Unit, codice univoco interno |
| EAN / Codice a barre | `text` | ❌ | GTIN per fatturazione e Google Shopping |
| Peso (kg) | `number` | ❌ | Per calcolo spedizioni |

#### 4. Immagini

- **Aggiunta:** URL immagine + testo alternativo (alt) → pulsante "Aggiungi"
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

**Body:** `{ title, basePrice, description?, content?, compareAtPrice?, costPrice?, sku?, barcode?, weight?, seoTitle?, seoDescription?, published?, featured?, categoryId?, brandId? }`

### `GET /api/admin/products/[id]`

Dettaglio prodotto con immagini e varianti.

### `PUT /api/admin/products/[id]`

Aggiorna un prodotto esistente. Stessi campi della creazione.

### `DELETE /api/admin/products/[id]`

Elimina un prodotto (cascade su varianti e immagini).

### `POST /api/admin/upload`

Aggiunge un'immagine a un prodotto.

**Body:** `{ url, alt?, productId }`

### `DELETE /api/admin/upload?id=xxx`

Rimuove un'immagine.

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
