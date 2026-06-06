# Features — MVP Feature List

Each feature area has a corresponding Linear issue in the [Ig_ecomm project](https://linear.app/ig-ecomm/project/ig-ecomm-a56b8c556371).

## Layout & Navigation
**Linear:** IG-5
**Status:** ✅ Done

- Navbar — logo, categories dropdown, search bar, cart icon, login/account link
- Footer — contacts, info links, social links, newsletter signup
- Homepage — hero section, featured categories grid, featured products carousel, promotions
- Info pages — about us, contact form, FAQ, privacy policy, terms of service
- Custom 404 page with navigation

## Catalog
**Linear:** IG-6
**Status:** ✅ Done (DB schema + queries)

- Product listing with sidebar filters (category, brand, price range)
- Product detail page with admin-editable rich HTML content
- Dynamic content sections (specs table, gallery, embedded video, custom HTML blocks)
- Scroll-triggered animations (parallax, fade-in reveal, slide transitions)
- Full-text product search

## Authentication & Authorization
**Status:** ✅ Done

- Google OAuth (CUSTOMER)
- Email + Password login (all roles)
- Self-registration (CUSTOMER: email + password in one step)
- Forgot password with secure token-based reset (1h expiry, email via Resend)
- Selective 2FA (TOTP via otplib, QR code setup — STAFF/ADMIN only)
- Password reset available to all roles (CUSTOMER, STAFF, ADMIN)
- Admin creation only via database (not via registration API)
- Role-based route protection (GUEST → CUSTOMER → STAFF → ADMIN)
- User management in admin (list, create, edit roles, delete)

## PC Configurator
**Linear:** IG-7

- Step-by-step configurator: select CPU → auto-filters compatible motherboards → RAM → GPU → PSU → case → storage
- Compatibility rules managed via product metadata
- Real-time price calculation and summary

## Cross-selling & Wishlist
**Linear:** IG-8

- "Recommended accessories" section on product detail pages
- Wishlist: save products, view on account page, share wishlist

## Reviews & Q&A
**Linear:** IG-9

- Star rating (1-5) + written review
- Moderation queue in admin (approve/reject)
- Questions section: users submit, admin answers publicly

## Cart & Checkout
**Linear:** IG-10

- Add/remove/update item quantities
- Estimated shipping cost calculation
- Checkout flow: address → shipping method → payment → confirmation
- Order confirmation email via Resend

## Payments
**Linear:** IG-11

- Card / digital wallet integration (provider TBD)
- Post-MVP: installments (Scalapay / Klarna)
- PDF invoice generation post-purchase

## Shipping
**Linear:** IG-12

- Admin: manage carriers and shipping zones
- Admin: generate shipping labels
- User-facing: real-time tracking status on order page

## Users & Account
**Linear:** IG-13

- Registration via email (magic link) or Google OAuth
- Account area: order history, wishlist, saved addresses
- Return / RMA request form

## Admin — Dashboard & Reports
**Linear:** IG-14

- Dashboard widgets: daily sales, new orders, pending shipments, low stock alerts
- Revenue chart (7/30/90 days)
- Export orders to CSV / Excel
- Role management (ADMIN, WAREHOUSE, SUPPORT)

## Admin — Products
**Linear:** IG-15

- CRUD: create, edit, delete products
- Categories, brands, image gallery, variants
- Rich-text HTML editor for product content (description + custom sections)
- SEO fields (meta title, description, slug)

## Admin — Warehouse / Stock
**Linear:** IG-16

- Stock tracking per product variant
- Low stock threshold alerts
- Stock movement log (received, sold, adjustment, damaged, returned)

## Admin — Orders
**Linear:** IG-17

- Order list with filters (status, date range)
- Update order status (confirm, process, ship, deliver, cancel)
- Manual notification email trigger

## Promotions & Newsletter
**Linear:** IG-18

- Coupon code management (percentage or fixed amount, min order, expiry)
- Newsletter signup in footer + homepage
- Newsletter subscriber list in admin

## Blog & Guides
**Linear:** IG-19

- Blog post CRUD in admin
- Markdown editor with preview
- Categories/tags for blog
- SEO-optimized blog pages

## SEO & Performance
**Linear:** IG-20

- Meta tags per pagina (title, description, OG)
- Breadcrumb navigation
- SEO-friendly URL slugs
- SSG for public pages (catalog, product, blog)
- Sitemap.xml and robots.txt
- Lighthouse score target: 90+ all categories

## Accessibility (EAA Compliance)
**Status:** ✅ Done — [guida](docs/guides/accessibility.md)

- EAA compliance checklist per ogni feature
- `eslint-plugin-jsx-a11y` per linting accessibilità
- Immagini con `next/image` + `alt` descrittivi (mai `<img>` nudo)
- Focus management con SkipNav e reset su cambio pagina
- `focus-visible:ring` su tutti gli elementi interattivi
- Dialog/Sheet di shadcn con `DialogTitle` + `DialogDescription`
- Griglie prodotti semantiche (`<ul>`/`<li>`)
- Carrello con notifiche `aria-live` / Toast accessibili
- Form checkout: `htmlFor`, `aria-describedby`, `autoComplete`
- Test aXe-core nella CI/CD
