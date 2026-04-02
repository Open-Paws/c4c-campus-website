# src/components/payments — Payment Components

## Purpose

Pricing and subscription UI.

## Files

| File | Description |
|------|-------------|
| `PricingTable.tsx` | Displays available pricing tiers with features and a CTA per tier. Likely feeds into the `/pricing` page and `/payment/*` flow. |

## Cross-References

- `src/pages/pricing.astro` — mounts `PricingTable`
- `src/pages/payment/success.astro` — post-payment success page
- `src/pages/payment/canceled.astro` — post-payment canceled page
