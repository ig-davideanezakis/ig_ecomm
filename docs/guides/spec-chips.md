# Spec Chips — Caratteristiche in evidenza

**Status:** ✅ Done (IG — spec chips)
**Area:** Catalogo (shop) + Admin → Impostazioni

Le "chip" sono pill icona+valore che evidenziano le caratteristiche principali di un
prodotto (es. CPU, RAM, archiviazione) in due punti del negozio:

- **Card prodotto** (lista `/products`, risultati di ricerca, pagine brand): variante
  compatta icona + valore, etichetta disponibile al tooltip e agli screen reader;
- **Scheda prodotto** (`/product/[slug]`): pill con icona + etichetta + valore,
  mostrate tra la descrizione e il prezzo.

## Come funziona

Le chip **non sono salvate per prodotto**: vengono *derivate al render* dal campo
`product.specifications` (JSON Icecat raggruppato `[{ group, rows: [{ label, value }] }]`)
usando una configurazione globale, modificabile da **Admin → Impostazioni →
Specifiche in evidenza (chip)**.

| Pezzo | File | Ruolo |
|---|---|---|
| Config (default + parsing + matcher) | `src/lib/spec-chips.ts` | Regole di riconoscimento ed estrazione (puro, testato) |
| Config dal DB | `src/db/queries/settings.ts` | Legge `store_setting.spec_chips`, fallback sui default |
| Registro icone | `src/components/shop/spec-chip-icon.tsx` | Chiave icona → icona lucide (fallback `tag`) |
| Render chip | `src/components/shop/product-spec-chips.tsx` | Varianti `detail` / `card` |
| Editor admin | `src/components/admin/spec-chips-editor.tsx` | Lista ordinata modificabile nelle Impostazioni |
| Query lista | `getProductList` | Include ora `p.specifications` per calcolare le chip delle card |

### Configurazione (chiave `spec_chips` in `store_setting`)

```json
[
  { "id": "cpu", "label": "CPU", "icon": "cpu",
    "patterns": ["famiglia processore", "modello del processore", "processore"],
    "exclude": ["frequenza", "produttore", "generazione"] },
  { "id": "ram", "label": "RAM", "icon": "memory-stick",
    "patterns": ["ram installata"] }
]
```

- `patterns`: sottostringhe confrontate sull'etichetta della riga **normalizzata**
  (minuscole, senza accenti/punteggiatura), in ordine di priorità. Viene scelta la
  **prima riga del prodotto** che contiene il pattern corrente.
- `exclude` (opzionale): sottostringhe che scartano una riga (es. "Frequenza del
  processore" non deve mai alimentare la chip CPU).
- Ogni riga può alimentare **una sola** chip (vince la prima in ordine di config).
- L'ordine delle voci = ordine di visualizzazione. La lista è **globale** (unica per
  tutto il catalogo).
- `[]` (lista vuota) = chip disattivate. Chiave assente/malformata = chip predefinite.
- Specifiche in formato legacy HTML (import pre-Icecat) → nessuna chip.

### Chip predefinite (nessuna configurazione salvata)

| Chip | Icona | Pattern principali (Icecat IT) |
|---|---|---|
| CPU | cpu | famiglia processore, modello del processore, … (esclusi frequenza/produttore/…) |
| RAM | memory-stick | ram installata |
| Archiviazione | hard-drive | capacità memoria interna/integrata, capacità disco rigido, capacità ssd |
| Schermo | monitor | dimensioni diagonale schermo, dimensioni schermo, diagonale del display |
| Scheda video | gpu | scheda grafica dedicata, processore grafico (dedicato), scheda grafica |
| Sistema operativo | app-window | sistema operativo incluso/installato (esclusa "versione") |

L'editor admin permette di: cambiare icona (con anteprima live), etichetta, pattern ed
esclusioni; riordinare con frecce ↑/↓; aggiungere/eliminare voci; ripristinare le
predefinite. Le voci senza etichetta o senza pattern vengono ignorate al salvataggio.

## Note operative

- Oggi solo i prodotti importati da Icecat con specifiche raggruppate hanno i dati
  per le chip: per popolare gli altri prodotti serve un (re)import Icecat (EAN) o un
  inserimento manuale nel campo "Specifiche tecniche" dell'admin prodotto.
- Valori non modificati (nessun "tidy" di unità: `24000 MB` resta `24000 MB`); la
  pulizia del testo si limita a trim/collasso degli spazi.
- Le specifiche complete restano in fondo alla scheda prodotto (componente
  `SpecificationsView`): le chip sono solo un'evidenza, non un filtro.
