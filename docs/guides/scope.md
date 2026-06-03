# Scope — MVP Boundaries

## In Scope (MVP)

All features listed in [features.md](features.md) with Linear issues IG-5 through IG-20.

**Core constraints:**
- Zero monthly cost for all services
- Single deploy (Next.js on Vercel)
- Admin panel built in-house (no external CMS)

## Post-MVP (will add later)

| Feature | Reason for deferral |
|---------|---------------------|
| **Installment payments** (Scalapay/Klarna) | Requires merchant account setup, legal/commercial agreement |
| **Multi-currency / multi-language** | Not needed for initial Italian market |
| **Advanced analytics** (funnels, cohort analysis) | Requires order volume to be meaningful |
| **Supplier management** | Inventory is small enough to manage manually at launch |
| **Bulk import/export products** (CSV) | Manual entry via admin is fine for initial catalog |
| **Automatic shipping label generation** | Depends on carrier API integration, region-specific |
| **PWA / mobile app** | Next.js responsive design covers mobile for MVP |
| **Social login** (Google OAuth) | ✅ **Done** — implemented for CUSTOMER role (others deferred) |
| **Abandoned cart emails** | Requires additional background job infra |
| **Gift cards** | Nice-to-have, not critical for launch |
| **Product comparison tool** | Could be added post-launch based on user demand |
| **API for external integrations** | Not needed until the store connects to external systems |

## Explicitly Out of Scope (not planned)

- Native mobile app (web-first, responsive)
- Marketplace / multi-vendor
- Custom ERP integration
- Warehousing / dropshipping automation
- B2B wholesale pricing tiers
- Affiliate program

## Growth path

1. **MVP** — single store, single language, essential features, $0/mo cost
2. **V1.1** — abandoned cart emails, bulk import, social logins
3. **V1.2** — installments, multi-currency, analytics
4. **V2** — supplier portal, multi-vendor, B2B pricing
