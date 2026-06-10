"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { InfografLogo } from "@/components/infograf-logo";
import { BrandLogoWidget } from "@/components/shop/brand-logo-widget";

interface FooterPage {
  id: string; title: string; slug: string; footer_order: number;
}

interface Settings {
  store_name?: string; store_tagline?: string; store_email?: string;
  store_phone?: string; store_address?: string; footer_categories_title?: string;
  footer_info_title?: string; footer_contacts_title?: string;
  footer_about_text?: string; social_facebook?: string;
  social_instagram?: string; social_youtube?: string; copyright_text?: string;
  show_brand_widget_footer?: string;
}

export default function ShopFooter() {
  const [settings, setSettings] = useState<Settings>({});
  const [pages, setPages] = useState<FooterPage[]>([]);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(setSettings).catch(() => {});
    fetch("/api/pages").then(r => r.json()).then(setPages).catch(() => {});
    fetch("/api/products?limit=100").then(r => r.json()).then(d => {
      if (d.products) {
        const cats: { name: string; slug: string }[] = [];
        for (const p of d.products) {
          if (p.category && !cats.find(c => c.slug === p.category.slug)) {
            cats.push({ name: p.category.name, slug: p.category.slug });
          }
        }
        setCategories(cats);
      }
    }).catch(() => {});
  }, []);

  const footerPages = pages.filter(p => p.footer_order >= 0);

  const widgetFooterEnabled = settings.show_brand_widget_footer !== "false";

  return (
    <footer className="border-t bg-muted/50">
      {widgetFooterEnabled && <BrandLogoWidget variant="carousel" title="" limit={8} location="footer" />}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* About */}
          <div>
            <InfografLogo className="h-6 w-auto mb-4" />
            <p className="text-sm text-muted-foreground">
              {settings.footer_about_text || settings.store_tagline || "Benvenuti su Infograf Store."}
            </p>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{settings.footer_categories_title || "Categorie"}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {categories.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link href={`/products?category=${c.slug}`} className="hover:text-foreground transition-colors">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info pages */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{settings.footer_info_title || "Info"}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {footerPages.map((p) => (
                <li key={p.id}>
                  <Link href={`/page/${p.slug}`} className="hover:text-foreground transition-colors">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h3 className="text-sm font-semibold mb-3">{settings.footer_contacts_title || "Contatti"}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {settings.store_address && <li>{settings.store_address}</li>}
              {settings.store_email && <li>{settings.store_email}</li>}
              {settings.store_phone && <li>{settings.store_phone}</li>}
            </ul>
            {(settings.social_facebook || settings.social_instagram || settings.social_youtube) && (
              <div className="flex gap-3 mt-3">
                {settings.social_facebook && (
                  <a href={settings.social_facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                  </a>
                )}
                {settings.social_instagram && (
                  <a href={settings.social_instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                  </a>
                )}
                {settings.social_youtube && (
                  <a href={settings.social_youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings.copyright_text || settings.store_name || "Infograf. Tutti i diritti riservati."}</p>
        </div>
      </div>
    </footer>
  );
}
