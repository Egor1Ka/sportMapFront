# Billing Catalog API — Single Source of Truth

**Date:** 2026-03-22
**Status:** Draft
**Scope:** Backend (new endpoint) + Frontend (refactor billing-plan-tab + i18n)

## Problem

Billing plan/product data is duplicated in 3 places:

1. **Backend** `constants/billing.js` — `PLANS`, `PRODUCTS`, `PLAN_HIERARCHY`, product IDs
2. **Frontend** `billing-plan-tab.tsx` — `PLAN_DETAILS`, `PRODUCT_DETAILS` (name, price, features, productId)
3. **Frontend** `i18n/messages/{en,uk}.json` — `pricing.plans` (landing page display)

Adding a plan requires editing 3+ files across 2 repos. Prices and productIds are hardcoded on the frontend.

## Design

### Principle

- **Backend owns business data:** price, currency, period, productId, hierarchy, plan keys, product type
- **Frontend owns display text:** localized names, descriptions, marketing feature bullets
- **Frontend merges both** at render time by matching on plan/product `key`

### Backend: New Endpoint

`GET /api/billing/catalog` — **public** (no `authMiddleware`), returns all available plans and products.

Public because the landing page pricing section needs to fetch it in SSR without auth context.

**Response shape:**

```json
{
	"plans": [
		{
			"key": "free",
			"price": 0,
			"currency": "USD",
			"period": "month",
			"productId": null
		},
		{
			"key": "pro",
			"price": 2900,
			"currency": "USD",
			"period": "month",
			"productId": "prod_TkVdhx4EhreepQ0TwmrrL"
		}
	],
	"products": [
		{
			"key": "export_pack",
			"type": "one_time",
			"price": 900,
			"currency": "USD",
			"productId": "prod_4tHvpNEWtUFrf8LaGBqyh8"
		}
	],
	"hierarchy": ["free", "pro"]
}
```

**Notes:**

- `price` is in **cents** (integer) — frontend formats for display via `Intl.NumberFormat`
- `period` is a machine-readable string: `"month"`, `"year"`, etc.
- `productId` is the payment provider's product ID (Creem/Stripe) — `null` for free plan
- `hierarchy` is the authoritative plan ordering (weakest → strongest). The `plans` array may arrive in any order — always use `hierarchy` for display ordering
- `type` on products: `"one_time"` — discriminator for UI badge rendering. Plans are always subscriptions, so no `type` field needed on them

**Backend implementation:**

- Add `PLAN_CATALOG` to `constants/billing.js` with price/currency/period/productId per plan
- Add `PRODUCT_CATALOG` with type/price/currency/productId per product
- New route handler in `billingRoutes.js` that assembles and returns the catalog
- No DB queries needed — pure config

### Frontend: i18n Keys

Add billing-specific translations under `billing` namespace in `i18n/messages/{en,uk}.json`:

```json
{
	"billing": {
		"plans": {
			"free": {
				"name": "Free",
				"description": "Perfect for side projects",
				"features": [
					"Up to 3 projects",
					"Dashboard access",
					"Community support"
				]
			},
			"pro": {
				"name": "Pro",
				"description": "For professionals",
				"features": [
					"Unlimited projects",
					"Dashboard access",
					"Export data",
					"API access",
					"Priority support"
				]
			}
		},
		"products": {
			"export_pack": {
				"name": "Starter Pack",
				"features": ["Export data", "5000 MB storage"]
			}
		},
		"period": {
			"month": "/month",
			"year": "/year"
		}
	}
}
```

Ukrainian (`uk.json`) mirrors the same structure with translated strings. Feature list ordering must match across locales to keep card layouts consistent.

The existing `pricing.plans` keys are **replaced** by `billing.plans` — the landing page and billing tab share the same i18n keys. The `description` field is used on the landing page; the billing tab may ignore it.

### Frontend: Type Changes

In `services/configs/billing.config.ts`:

- `Plan.key` changes from `'free' | 'pro'` to `string` — the catalog is the source of truth for available plans, so the frontend should not hardcode plan keys in types.
- The existing `Plan.features` and `Plan.limits` types remain unchanged — they come from `/api/billing/plan`, not from the catalog.

### Frontend: Refactored Component

**Remove** from `billing-plan-tab.tsx`:

- `PLAN_DETAILS` constant
- `PRODUCT_DETAILS` constant
- `PLAN_HIERARCHY` constant

**Add** to `services/configs/billing.config.ts`:

- New `catalog` endpoint definition

**Component changes:**

- Receive catalog data as a prop from the parent page (fetched once at page level)
- Use `useTranslations('billing')` for display text
- Merge catalog data (price, productId) with i18n data (name, features) by `key`
- Format price from cents using `Intl.NumberFormat`:
  ```ts
  const formatPrice = (cents: number, currency: string) =>
  	new Intl.NumberFormat('en-US', {
  		style: 'currency',
  		currency,
  		minimumFractionDigits: 0,
  	}).format(cents / 100)
  ```
- Resolve period from i18n: `t(\`period.${plan.period}\`)`→`/month`

**Data flow:**

```
Parent page fetches billingApi.catalog() → passes { plans, products, hierarchy } as prop
Component uses useTranslations('billing') → { plans.pro.name, plans.pro.features, ... }

merge by key →
  { key: "pro", name: "Pro", price: "$29", period: "/month", features: [...], productId: "prod_..." }
```

### Missing i18n Key Fallback

If a plan/product key exists in the catalog but has no matching i18n entry (e.g., backend added a plan but frontend i18n was not updated):

- **Skip rendering** that plan/product — do not show a card with missing text
- **Log a warning** in development: `console.warn(\`Missing i18n keys for billing plan: ${key}\`)`
- This prevents broken UI while making the omission visible to developers

### Loading and Error States

Since the catalog is now async (API call instead of constants):

- **Catalog is fetched at the page level** (parent component or server component), not inside `BillingPlanTab`
- **Loading:** The parent page shows a skeleton/spinner while catalog + plan + subscription data load together. `BillingPlanTab` always receives resolved data — no internal loading state needed
- **Error:** If the catalog fetch fails, the parent page shows the standard error boundary (`error.tsx`). The billing tab is not rendered with partial data
- **Catalog is fetched alongside** the existing `billingApi.plan()` and `billingApi.subscription()` calls — all three requests in parallel via `Promise.all`

### Caching Strategy

The catalog is pure config that changes only at deployment frequency:

- **Backend:** Set `Cache-Control: public, max-age=3600` (1 hour) on the catalog response. This allows CDN/browser caching without stale data concerns — plan changes are rare and a 1-hour delay is acceptable
- **Frontend SSR:** Next.js `fetch` with `{ next: { revalidate: 3600 } }` for server components
- **Frontend client:** No special caching — the catalog is fetched once per page load as part of the billing page data. No SWR/React Query needed

### Landing Page (pricing section)

The existing `pricing.plans` keys in i18n are **replaced** by `billing.plans` keys. The landing page pricing section fetches the catalog via SSR:

```tsx
// app/page.tsx (or pricing section server component)
const catalog = await billingApi.catalog()
// Pass catalog to PricingSection component
// Component uses useTranslations('billing') for display text
```

This gives the landing page real prices from the backend while keeping display text localized.

## Files Changed

### Backend (`BackendTemplate`)

| File                                                  | Change                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/modules/billing/constants/billing.js`            | Add `PLAN_CATALOG`, `PRODUCT_CATALOG` with price/currency/period/type/productId |
| `src/modules/billing/routes/billingRoutes.js`         | Add `GET /api/billing/catalog` route (public, no auth)                          |
| `src/modules/billing/controller/billingController.js` | Add `getCatalog` handler                                                        |

### Frontend (`Template-frontend`)

| File                                 | Change                                                                                 |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| `i18n/messages/en.json`              | Replace `pricing.plans` with `billing.plans`, add `billing.products`, `billing.period` |
| `i18n/messages/uk.json`              | Same structure in Ukrainian                                                            |
| `services/configs/billing.config.ts` | Add `catalog` endpoint; change `Plan.key` from union to `string`                       |
| `components/billing-plan-tab.tsx`    | Remove hardcoded configs, receive catalog as prop, merge with i18n                     |
| Landing pricing section              | Switch to `billing.*` i18n keys, fetch catalog in SSR                                  |

## Adding a New Plan (after this change)

1. Create product in payment provider dashboard (Creem)
2. **Backend:** add entry to `PLAN_CATALOG` + `PLANS` + `PLAN_HIERARCHY` + `SUBSCRIPTION_PRODUCTS` in `constants/billing.js`
3. **Frontend:** add i18n keys `billing.plans.<key>` in `en.json` and `uk.json`
4. Done — no hardcoded data on frontend

## Adding a New One-Time Product (after this change)

1. Create product in payment provider dashboard
2. **Backend:** add entry to `PRODUCT_CATALOG` + `PRODUCTS` + `ONE_TIME_PRODUCTS` in `constants/billing.js`
3. **Frontend:** add i18n keys `billing.products.<key>` in `en.json` and `uk.json`
4. Done

## Out of Scope

- Fetching price from Creem API dynamically (prices are config-driven for now)
- Regional pricing / promotional discounts
- Billing page redesign / UI changes (only data source refactor)
- Backend i18n (texts stay on frontend)
- Cache invalidation beyond TTL (acceptable for deployment-frequency changes)
