# Filters & Chips — Unified Catalog Attributes

> Guida al sistema unificato di filtri di catalogo e chip prodotto.
> Sostituisce la precedente doc separata `spec-chips.md` (le chip sono ora
> un aspetto dei filtri, non un sistema a parte).

## Perché unificato

Prima esistevano due sistemi paralleli che descrivevano la stessa cosa
(CPU, RAM, storage...):

- **Filtri** (`filter` / `filter_option` / `category_filter`): pensati per
  la sidebar del catalogo, con opzioni curate a mano. In pratica solo il
  prezzo filtrava davvero i prodotti — la tabella pensata per il valore
  per-prodotto (`product_filter_value`) non era mai scritta né letta da
  nessun codice, e non esisteva alcuna UI per assegnare un valore filtro a
  un prodotto.
- **Chip** (config globale `store_setting.spec_chips`): funzionavano bene,
  ma il valore era ricalcolato ad ogni render dal JSON `specifications`
  (import Icecat), senza alcuno storage per prodotto, e non erano
  utilizzabili come filtro.

Oggi un **filtro** (tabella `filter`) può essere mostrato come chip
(`showAsChip`), usato come filtro sidebar (`useAsFilter`), o entrambi — con
i valori che arrivano da una delle due modalità (`valueMode`).

## Modalità valore (`valueMode`)

| Modalità | Come si popola | Quando usarla |
|----------|-----------------|---------------|
| `auto` | Derivato da `product.specifications` (JSON Icecat raggruppato) tramite `patterns`/`exclude` — stessa logica delle vecchie chip. Ricalcolato automaticamente ogni volta che le specifiche del prodotto cambiano (creazione, modifica, re-import Icecat). | CPU, RAM, storage, schermo, GPU, OS — qualsiasi caratteristica già presente nelle specifiche tecniche. |
| `manual` | Assegnato a mano per prodotto, scegliendo da una lista di opzioni curate (`filter_option`) — come i vecchi filtri. | Caratteristiche non deducibili dalle specifiche (es. una taglia, una promozione, un tag editoriale). |

In entrambi i casi il valore per-prodotto vive in **`product_filter_value`**
(unica fonte per chip e filtro): `{ productId, filterId, value, isOverride }`.
`isOverride` è vero quando un admin ha corretto a mano il valore di un
filtro `auto` dalla scheda prodotto — una successiva ri-derivazione (nuovo
import Icecat) non lo sovrascrive mai finché non viene "Ricalcola"to.

## Motore di derivazione (`src/lib/filter-values.ts`)

- `normalizeSpecLabel` — minuscole, senza accenti/punteggiatura, spazi
  collassati (stessa normalizzazione delle vecchie chip).
- `extractFilterValues(specifications, configs)` — estrae in un solo passo
  il valore di ogni filtro `auto` configurato: ogni riga delle specifiche
  può alimentare **una sola** chip/filtro (vince il primo in ordine di
  config), così due filtri non si contendono la stessa riga.
- `extractChipValues` — stessa estrazione, reshape per il rendering
  (icona + etichetta + valore), in ordine di configurazione.
- `syncAutoFilterValues(db, productId, specifications)` — ricalcola tutti i
  filtri `auto` per un prodotto e aggiorna `product_filter_value`,
  **senza toccare** le righe con `isOverride = true`. Chiamato da
  `POST`/`PUT /api/admin/products` dopo ogni scrittura.

## Amministrazione — `/admin/filters`

Un'unica pagina per creare/modificare i filtri:

- **Origine valori**: `manuale` (lista opzioni curate, CRUD come prima) o
  `automatico` (icona + pattern/esclusioni da abbinare nelle specifiche
  Icecat — stesso editor delle vecchie chip, ora per-filtro).
- **Usa come filtro** / **Mostra come chip**: due flag indipendenti.
- Assegnazione per categoria (con eredità) resta in `/admin/categories/[id]`
  — inalterata.
- La vecchia sezione "Specifiche in evidenza (chip)" in Admin →
  Impostazioni è stata rimossa; ora punta a questa pagina.

### Scheda prodotto — "Attributi & filtri"

Nel form prodotto, sotto "Specifiche tecniche": una riga per ogni filtro
rilevante (chip e/o filtro) con il valore corrente.

- Filtro `auto`: campo testo con il valore derivato (o corretto a mano);
  bottone **Ricalcola** per tornare al valore derivato dalle specifiche.
- Filtro `manual`: select con le opzioni curate (o testo libero se il
  filtro non ne ha).

`PUT /api/admin/products/[id]/filter-values` — `{ filterId, value }` per
impostare/azzerare, `{ filterId, reset: true }` (solo `auto`) per
ricalcolare.

## Shop — filtri reali + chip

- `GET /api/category-filters?categorySlug=...`: le opzioni di un filtro
  `auto` sono i valori distinti realmente presenti tra i prodotti (della
  categoria, o di tutto il catalogo per un filtro globale) — non una lista
  curata, quindi non propone mai un valore che nessun prodotto ha. I
  filtri `manual` restano su `filter_option`.
- `getProductList` (`src/db/queries/products.ts`): parametro `filters`
  (`filter.slug -> valori selezionati`) — OR tra i valori dello stesso
  filtro, AND tra filtri diversi. Ogni `f_<slug>=valore` nell'URL filtra
  davvero il catalogo.
- Le chip sulle card e sulla scheda prodotto leggono `getChipFilterConfigs()`
  (filtri con `showAsChip = true`) + `extractChipValues`.

## Migrazione dati esistenti

`scripts/migrate-spec-chips-to-filters.ts` (`npm run db:migrate-spec-chips`,
`DRY_RUN=1` per una simulazione): copia la vecchia config
`store_setting.spec_chips` (o i default incorporati, se non era mai stata
salvata) in righe `filter` reali, poi ricalcola `product_filter_value` per
ogni prodotto esistente. **Va eseguito una volta**, dopo aver applicato
`drizzle/0005_unify_filters.sql`, prima che il codice che legge dalla
tabella `filter` vada in produzione — altrimenti chip e filtri risultano
vuoti finché lo script non gira.

## File principali

| File | Ruolo |
|------|-------|
| `src/db/schema/filters.ts` | Schema: `filter`, `filter_option`, `category_filter`, `product_filter_value` |
| `src/lib/filter-values.ts` | Motore di derivazione + sync di scrittura |
| `src/db/queries/settings.ts` | `getChipFilterConfigs()` |
| `src/db/queries/products.ts` | `getProductList` — filtro reale via `product_filter_value` |
| `src/app/api/category-filters/route.ts` | Opzioni sidebar (auto/manuale) |
| `src/app/api/admin/filters/**` | CRUD filtri (admin) |
| `src/app/admin/filters/page.tsx` | UI unificata filtri + chip |
| `src/app/api/admin/products/[id]/filter-values/route.ts` | Set/reset valore per prodotto |
| `src/components/admin/product-filter-values-editor.tsx` | UI "Attributi & filtri" nel form prodotto |
| `scripts/migrate-spec-chips-to-filters.ts` | Migrazione una tantum |
