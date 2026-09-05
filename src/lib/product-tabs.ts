/**
 * Product detail tabs — definitions and default content.
 *
 * The PDP shows a tabbed layout: Panoramica (marketing, when present),
 * Descrizione, Specifiche tecniche, plus three store-wide info tabs
 * (Come acquista / Garanzia / Recesso) whose content is editable in
 * Admin → Impostazioni and falls back to the defaults below.
 */

export type ProductTabId =
  | "panoramica"
  | "descrizione"
  | "specifiche"
  | "come-acquista"
  | "garanzia"
  | "recesso";

export interface ProductTabDef {
  id: ProductTabId;
  label: string;
}

/** Content for the three store-wide info tabs (editable in settings). */
export interface ProductInfoTabs {
  howToBuy: string;
  warranty: string;
  withdrawal: string;
}

export const HOW_TO_BUY_DEFAULT = `<p>Ordinare è semplice: scegli il prodotto, aggiungilo al carrello e completa l'acquisto in pochi passi, anche come ospite, senza registrazione.</p>
<ul>
<li><strong>Spedizione rapida</strong> — in 24/48h in tutta Italia con corriere espresso, gratis sopra i 150&euro;.</li>
<li><strong>Ritiro gratuito</strong> in negozio, in via Duca della Verdura 23, Palermo.</li>
<li><strong>Pagamenti sicuri</strong> — carta, bonifico e gli altri metodi mostrati in fase di checkout.</li>
</ul>
<p>Per qualsiasi domanda chiamaci o scrivici: il nostro team ti assiste prima e dopo l'acquisto.</p>`;

export const WARRANTY_DEFAULT = `<p>Tutti i prodotti venduti sono coperti dalla <strong>garanzia legale di conformità di 24 mesi</strong> prevista dal Codice del Consumo (D.Lgs. 206/2005).</p>
<ul>
<li>Assistenza in sede a Palermo, con il team tecnico Infograf.</li>
<li>Per i prodotti con garanzia aggiuntiva del produttore, la copertura è indicata nella scheda prodotto.</li>
</ul>`;

export const WITHDRAWAL_DEFAULT = `<p>Hai diritto di <strong>recedere dall'acquisto entro 14 giorni</strong> dalla consegna, senza dover fornire alcuna motivazione (D.Lgs. 206/2005, art. 52 e ss.).</p>
<ul>
<li>Il prodotto deve essere restituito integro, completo di accessori e nella confezione originale.</li>
<li>Il rimborso avviene entro 14 giorni dalla comunicazione del recesso.</li>
<li>Per avviare la procedura contattaci: ti indichiamo i passaggi per la restituzione.</li>
</ul>`;

export const DEFAULT_INFO_TABS: ProductInfoTabs = {
  howToBuy: HOW_TO_BUY_DEFAULT,
  warranty: WARRANTY_DEFAULT,
  withdrawal: WITHDRAWAL_DEFAULT,
};

/**
 * Build the tab list for a product. Product-content tabs appear only when the
 * related field is filled; the three store info tabs are always present.
 */
export function buildProductTabs(input: {
  overviewHtml?: string | null;
  contentHtml?: string | null;
  specificationsJson?: string | null;
}): ProductTabDef[] {
  const tabs: ProductTabDef[] = [];
  if (input.overviewHtml?.trim()) tabs.push({ id: "panoramica", label: "Panoramica" });
  if (input.contentHtml?.trim()) tabs.push({ id: "descrizione", label: "Descrizione" });
  if (input.specificationsJson?.trim()) tabs.push({ id: "specifiche", label: "Specifiche tecniche" });
  tabs.push(
    { id: "come-acquista", label: "Come acquista" },
    { id: "garanzia", label: "Garanzia" },
    { id: "recesso", label: "Recesso" },
  );
  return tabs;
}
