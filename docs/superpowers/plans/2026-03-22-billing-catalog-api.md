# Billing Catalog API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move billing plan/product config from hardcoded frontend constants to a backend catalog API, with frontend i18n for display text.

**Architecture:** Backend exposes `GET /api/billing/catalog` (public, pure config, no DB). Frontend fetches catalog at page level, merges with i18n translations by key, passes to components as props. Existing `pricing.plans` i18n keys are replaced by `billing.plans`.

**Tech Stack:** Express (backend), Next.js App Router, next-intl, TypeScript, Creem checkout

**Spec:** `docs/superpowers/specs/2026-03-22-billing-catalog-api-design.md`

---

## Task 1: Backend — Add catalog constants

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/modules/billing/constants/billing.js`

- [ ] **Step 1: Add `PLAN_CATALOG` and `PRODUCT_CATALOG` to `billing.js`**

After the existing `PLANS` constant, add:

```js
// ── Plan catalog (UI/checkout data) ────────────────────────────────────────
// Price is in cents. Period is machine-readable ("month", "year").
// productId is the payment provider's product ID (null for free plan).

export const PLAN_CATALOG = {
	free: {
		price: 0,
		currency: 'USD',
		period: 'month',
		productId: null,
	},
	pro: {
		price: 2900,
		currency: 'USD',
		period: 'month',
		productId: 'prod_TkVdhx4EhreepQ0TwmrrL',
	},
}

// ── Product catalog (UI/checkout data) ─────────────────────────────────────

export const PRODUCT_CATALOG = {
	export_pack: {
		type: 'one_time',
		price: 900,
		currency: 'USD',
		productId: 'prod_4tHvpNEWtUFrf8LaGBqyh8',
	},
}
```

- [ ] **Step 2: Verify backend starts without errors**

Run: `cd /Users/egorzozula/Desktop/BackendTemplate && npm run dev`
Expected: Server starts without import/syntax errors

- [ ] **Step 3: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/modules/billing/constants/billing.js
git commit -m "feat(billing): add PLAN_CATALOG and PRODUCT_CATALOG constants

Price, currency, period, and productId for each plan/product.
These will power the new /api/billing/catalog endpoint.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Backend — Add catalog endpoint

**Files:**

- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/modules/billing/controller/billingController.js`
- Modify: `/Users/egorzozula/Desktop/BackendTemplate/src/modules/billing/routes/billingRoutes.js`

- [ ] **Step 1: Add `getCatalog` handler to `billingController.js`**

Add import at the top (extend existing import from `../constants/billing.js`):

```js
import {
	WEBHOOK_EVENT,
	PLAN_HIERARCHY,
	PLAN_CATALOG,
	PRODUCT_CATALOG,
} from '../constants/billing.js'
```

Add handler before the `export` statement:

```js
const getCatalog = (_req, res) => {
	const toEntry = ([key, data]) => ({ key, ...data })

	const catalog = {
		plans: Object.entries(PLAN_CATALOG).map(toEntry),
		products: Object.entries(PRODUCT_CATALOG).map(toEntry),
		hierarchy: PLAN_HIERARCHY,
	}

	res.set('Cache-Control', 'public, max-age=3600')
	httpResponse(res, generalStatus.SUCCESS, catalog)
}
```

Add `getCatalog` to the export statement:

```js
export {
	handleWebhook,
	getPlan,
	getSubscription,
	getPayments,
	getOrders,
	cancelSubscription,
	getCatalog,
}
```

- [ ] **Step 2: Add route in `billingRoutes.js`**

Add import of `getCatalog`:

```js
import {
	handleWebhook,
	getPlan,
	getSubscription,
	getPayments,
	getOrders,
	cancelSubscription,
	getCatalog,
} from '../controller/billingController.js'
```

Add route **before** the auth-protected routes (after the webhook route):

```js
router.get('/catalog', getCatalog)
```

- [ ] **Step 3: Test the endpoint manually**

Run: `cd /Users/egorzozula/Desktop/BackendTemplate && npm run dev`
Then: `curl http://localhost:PORT/api/billing/catalog | jq .`

Expected response:

```json
{
	"data": {
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
	},
	"statusCode": 200,
	"status": "success"
}
```

Verify `Cache-Control: public, max-age=3600` header is present.

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/BackendTemplate
git add src/modules/billing/controller/billingController.js src/modules/billing/routes/billingRoutes.js
git commit -m "feat(billing): add GET /api/billing/catalog endpoint

Public endpoint returning plans, products, and hierarchy.
Pure config (no DB), cached for 1 hour.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Frontend — Add catalog endpoint config and types

**Files:**

- Modify: `/Users/egorzozula/Desktop/Template-frontend/services/configs/billing.config.ts`
- Modify: `/Users/egorzozula/Desktop/Template-frontend/services/index.ts`

- [ ] **Step 1: Add catalog types and endpoint to `billing.config.ts`**

Add new interfaces after `BillingOrder`:

```ts
interface CatalogPlan {
	key: string
	price: number
	currency: string
	period: string
	productId: string | null
}

interface CatalogProduct {
	key: string
	type: string
	price: number
	currency: string
	productId: string
}

interface BillingCatalog {
	plans: CatalogPlan[]
	products: CatalogProduct[]
	hierarchy: string[]
}
```

Change `Plan.key` type from `'free' | 'pro'` to `string`:

```ts
interface Plan {
	key: string
	features: { dashboard: boolean; export: boolean; apiAccess: boolean }
	limits: { projects: number; storage: number }
	products: string[]
}
```

Add catalog endpoint to `billingApiConfig`:

```ts
catalog: endpoint<void, ApiResponse<BillingCatalog>>({
	url: () => `/api/billing/catalog`,
	method: getData,
	defaultErrorMessage: 'Failed to fetch billing catalog',
}),
```

Add to the `export type` block:

```ts
export type {
	Plan,
	BillingSubscription,
	BillingPayment,
	BillingOrder,
	BillingCatalog,
	CatalogPlan,
	CatalogProduct,
}
```

- [ ] **Step 2: Re-export new types from `services/index.ts`**

Add `BillingCatalog`, `CatalogPlan`, `CatalogProduct` to the existing re-exports from billing config.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/egorzozula/Desktop/Template-frontend && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/Template-frontend
git add services/configs/billing.config.ts services/index.ts
git commit -m "feat(billing): add catalog endpoint config and types

BillingCatalog, CatalogPlan, CatalogProduct types.
Plan.key changed from union to string.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Frontend — Add billing i18n keys

**Files:**

- Modify: `/Users/egorzozula/Desktop/Template-frontend/i18n/messages/en.json`
- Modify: `/Users/egorzozula/Desktop/Template-frontend/i18n/messages/uk.json`

- [ ] **Step 1: Add `billing` keys to `en.json`**

Add a new top-level `"billing"` key:

```json
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
			"features": [
				"Export data",
				"5000 MB storage"
			]
		}
	},
	"period": {
		"month": "/month",
		"year": "/year"
	}
}
```

- [ ] **Step 2: Add `billing` keys to `uk.json`**

```json
"billing": {
	"plans": {
		"free": {
			"name": "Безкоштовно",
			"description": "Для особистих проєктів",
			"features": [
				"До 3 проєктів",
				"Доступ до дашборду",
				"Підтримка спільноти"
			]
		},
		"pro": {
			"name": "Pro",
			"description": "Для професіоналів",
			"features": [
				"Необмежені проєкти",
				"Доступ до дашборду",
				"Експорт даних",
				"Доступ до API",
				"Пріоритетна підтримка"
			]
		}
	},
	"products": {
		"export_pack": {
			"name": "Стартовий пакет",
			"features": [
				"Експорт даних",
				"5000 МБ сховища"
			]
		}
	},
	"period": {
		"month": "/місяць",
		"year": "/рік"
	}
}
```

- [ ] **Step 3: Replace `pricing.plans` with references to `billing.plans`**

In `en.json`, update the `pricing.plans` section to reference `billing` keys. Replace the current `pricing.plans` content so it points to the shared `billing` data:

```json
"pricing": {
	"title": "Simple pricing",
	"subtitle": "Choose the plan that fits your needs.",
	"popular": "Popular"
}
```

Remove `pricing.plans` (the `free` and `pro` sub-objects with name/price/period/description/features). These are now in `billing.plans`.

Do the same in `uk.json`:

```json
"pricing": {
	"title": "Прості ціни",
	"subtitle": "Оберіть план, що підходить вам.",
	"popular": "Популярний"
}
```

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/Template-frontend
git add i18n/messages/en.json i18n/messages/uk.json
git commit -m "feat(i18n): add billing namespace, consolidate pricing.plans

billing.plans, billing.products, billing.period keys added.
pricing.plans removed (now in billing.plans).

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Frontend — Refactor `billing-plan-tab.tsx`

**Files:**

- Modify: `/Users/egorzozula/Desktop/Template-frontend/components/billing-plan-tab.tsx`
- Modify: `/Users/egorzozula/Desktop/Template-frontend/app/[locale]/(app)/billing/page.tsx`

- [ ] **Step 1: Update `BillingPlanTabProps` and add catalog prop**

In `billing-plan-tab.tsx`, add imports:

```tsx
import type {
	BillingCatalog,
	BillingSubscription,
	CatalogPlan,
	CatalogProduct,
	Plan,
} from '@/services'
import { useTranslations } from 'next-intl'
```

Update `BillingPlanTabProps`:

```tsx
interface BillingPlanTabProps {
	plan: Plan
	subscription: BillingSubscription | null
	catalog: BillingCatalog
	onPlanChanged: () => void
}
```

- [ ] **Step 2: Remove hardcoded constants**

Delete `PLAN_HIERARCHY`, `PLAN_DETAILS`, `PRODUCT_DETAILS` constants (lines 35–83 of the current file).

- [ ] **Step 3: Add helper functions for merging catalog + i18n**

```tsx
const formatPrice = (cents: number, currency: string) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
	}).format(cents / 100)

const hasI18nKeys = (
	t: ReturnType<typeof useTranslations>,
	prefix: string,
	key: string,
) => t.has(`${prefix}.${key}.name`)
```

- [ ] **Step 4: Rewrite the component body**

Update the component signature to accept `catalog`:

```tsx
export function BillingPlanTab({
	plan,
	subscription,
	catalog,
	onPlanChanged,
}: BillingPlanTabProps) {
	const [cancelling, setCancelling] = useState(false)
	const t = useTranslations('billing')

	const currentIndex = catalog.hierarchy.indexOf(plan.key)

	const isProductPurchased = (productKey: string) =>
		plan.products.includes(productKey)

	const getAvailableProducts = () =>
		catalog.products.filter((product) => !isProductPurchased(product.key))

	const getProductDisplayName = (productKey: string) => {
		if (!hasI18nKeys(t, 'products', productKey)) return productKey
		return t(`products.${productKey}.name`)
	}

	const availableProducts = getAvailableProducts()
	const hasPurchasedProducts = plan.products.length > 0

	// ... handleCancel stays the same
```

- [ ] **Step 5: Update the Subscription Plans render section**

Replace `PLAN_HIERARCHY.map(...)` with `catalog.hierarchy.map(...)`. For each plan, get catalog data + i18n:

```tsx
{
	catalog.hierarchy.map((key, index) => {
		if (!hasI18nKeys(t, 'plans', key)) {
			if (process.env.NODE_ENV === 'development') {
				console.warn(`Missing i18n keys for billing plan: ${key}`)
			}
			return null
		}

		const catalogPlan = catalog.plans.find((p) => p.key === key)
		if (!catalogPlan) return null

		const isCurrent = key === plan.key
		const isHigher = index > currentIndex
		const features: string[] = t.raw(`plans.${key}.features`)

		return (
			<Card key={key} className={isCurrent ? 'border-primary border-2' : ''}>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>{t(`plans.${key}.name`)}</CardTitle>
						{isCurrent && <Badge>Current</Badge>}
					</div>
					<div className="flex items-baseline gap-1">
						<span className="text-3xl font-semibold">
							{formatPrice(catalogPlan.price, catalogPlan.currency)}
						</span>
						<span className="text-muted-foreground text-sm">
							{t(`period.${catalogPlan.period}`)}
						</span>
					</div>
				</CardHeader>
				<CardContent>
					<ul className="mb-6 space-y-2">
						{features.map((feature) => (
							<li key={feature} className="flex items-center gap-2 text-sm">
								<Check className="text-primary h-4 w-4 shrink-0" />
								{feature}
							</li>
						))}
					</ul>
					{isHigher && catalogPlan.productId && (
						<CreemCheckout
							productId={catalogPlan.productId}
							checkoutPath="/api/checkout"
						>
							<Button className="w-full">
								Upgrade to {t(`plans.${key}.name`)}
							</Button>
						</CreemCheckout>
					)}
				</CardContent>
			</Card>
		)
	})
}
```

- [ ] **Step 6: Update the Products render section**

Replace `availableProducts.map(([key, details]) => ...)` with:

```tsx
{
	availableProducts.map((product) => {
		if (!hasI18nKeys(t, 'products', product.key)) {
			if (process.env.NODE_ENV === 'development') {
				console.warn(`Missing i18n keys for billing product: ${product.key}`)
			}
			return null
		}

		const features: string[] = t.raw(`products.${product.key}.features`)

		return (
			<Card key={product.key}>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>{t(`products.${product.key}.name`)}</CardTitle>
						<Badge variant="secondary">One-time</Badge>
					</div>
					<div className="flex items-baseline gap-1">
						<span className="text-3xl font-semibold">
							{formatPrice(product.price, product.currency)}
						</span>
					</div>
				</CardHeader>
				<CardContent>
					<ul className="mb-6 space-y-2">
						{features.map((feature) => (
							<li key={feature} className="flex items-center gap-2 text-sm">
								<Check className="text-primary h-4 w-4 shrink-0" />
								{feature}
							</li>
						))}
					</ul>
					<CreemCheckout
						productId={product.productId}
						checkoutPath="/api/checkout"
					>
						<Button className="w-full">
							Buy {t(`products.${product.key}.name`)}
						</Button>
					</CreemCheckout>
				</CardContent>
			</Card>
		)
	})
}
```

- [ ] **Step 7: Commit**

```bash
cd /Users/egorzozula/Desktop/Template-frontend
git add components/billing-plan-tab.tsx
git commit -m "refactor(billing): remove hardcoded plan/product configs

Component now receives catalog as prop and uses i18n for display text.
Prices and productIds come from the backend catalog API.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Frontend — Update billing page to fetch catalog

**Files:**

- Modify: `/Users/egorzozula/Desktop/Template-frontend/app/[locale]/(app)/billing/page.tsx`

- [ ] **Step 1: Add catalog to the billing page state and fetch**

Add import:

```tsx
import type {
	Plan,
	BillingSubscription,
	BillingPayment,
	BillingCatalog,
} from '@/services'
```

Add state:

```tsx
const [catalog, setCatalog] = useState<BillingCatalog | null>(null)
```

Update `fetchData` to include catalog in `Promise.all`:

```tsx
const fetchData = async () => {
	try {
		const [planRes, subRes, payRes, catalogRes] = await Promise.all([
			billingApi.plan(),
			billingApi.subscription(),
			billingApi.payments(),
			billingApi.catalog(),
		])
		setPlan(planRes.data)
		setSubscription(subRes.data)
		setPayments(payRes.data)
		setCatalog(catalogRes.data)
	} catch {
		// errors handled by toast interceptor
	} finally {
		setLoading(false)
	}
}
```

- [ ] **Step 2: Update guard and pass catalog to `BillingPlanTab`**

Update the guard:

```tsx
if (!plan || !catalog) {
	return (
		<div className="text-muted-foreground p-6 text-center">
			Failed to load billing data
		</div>
	)
}
```

Pass catalog to the component:

```tsx
<BillingPlanTab
	plan={plan}
	subscription={subscription}
	catalog={catalog}
	onPlanChanged={fetchData}
/>
```

- [ ] **Step 3: Verify the billing page works**

Run: `cd /Users/egorzozula/Desktop/Template-frontend && npm run dev`
Navigate to `/billing`. Verify:

- Plans display with correct names, prices, features from i18n
- Products section shows available products
- "Upgrade" buttons have correct productIds
- No hardcoded data visible

- [ ] **Step 4: Commit**

```bash
cd /Users/egorzozula/Desktop/Template-frontend
git add app/[locale]/(app)/billing/page.tsx
git commit -m "feat(billing): fetch catalog in billing page

Catalog fetched in parallel with plan/subscription/payments.
Passed as prop to BillingPlanTab.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Frontend — Extract `formatPrice` utility and update landing page

**Files:**

- Create: `/Users/egorzozula/Desktop/Template-frontend/lib/billing.ts`
- Modify: `/Users/egorzozula/Desktop/Template-frontend/components/billing-plan-tab.tsx` (use shared `formatPrice`)
- Modify: `/Users/egorzozula/Desktop/Template-frontend/services/index.ts` (add server-safe `billingServerApi`)
- Modify: `/Users/egorzozula/Desktop/Template-frontend/app/[locale]/(landing)/page.tsx`

- [ ] **Step 1: Create shared `formatPrice` utility**

Create `lib/billing.ts`:

```ts
export const formatPrice = (cents: number, currency: string) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
	}).format(cents / 100)
```

Update `billing-plan-tab.tsx` to import from `@/lib/billing` instead of defining `formatPrice` locally.

- [ ] **Step 2: Add server-safe `billingServerApi` to `services/index.ts`**

The existing `billingApi` is wired with client-only interceptors (`createToastInterceptor`, `createAuthRefreshInterceptor` — both `'use client'`). The landing page is a server component, so it needs a separate instance without client interceptors.

Add to `services/index.ts`:

```ts
export const billingServerApi = createApiMethods(billingApiConfig)
```

No interceptors — pure fetch. Safe for SSR.

- [ ] **Step 3: Fetch catalog in the landing page server component**

Add imports at the top:

```tsx
import { billingServerApi } from '@/services'
import { formatPrice } from '@/lib/billing'
```

In the `LandingPage` function, fetch catalog:

```tsx
export default async function LandingPage() {
	const t = await getTranslations('landing')
	const tBilling = await getTranslations('billing')
	const catalogRes = await billingServerApi.catalog()
	const catalog = catalogRes.data
```

- [ ] **Step 2: Replace hardcoded `planKeys` with catalog hierarchy**

Replace `const planKeys = ['free', 'pro'] as const` with:

```tsx
const planKeys = catalog.hierarchy
```

- [ ] **Step 3: Update pricing section to use `billing` i18n keys + catalog prices**

Replace `t('pricing.plans.${key}.name')` references with `tBilling('plans.${key}.name')` etc.:

```tsx
{
	planKeys.map((key) => {
		const features: string[] = tBilling.raw(`plans.${key}.features`)
		const catalogPlan = catalog.plans.find((p) => p.key === key)
		const isPro = key === 'pro'

		return (
			<div
				key={key}
				className={`relative overflow-hidden rounded-2xl border p-8 transition-all duration-300 ${isPro ? 'border-foreground/20 shadow-xl' : 'border-border/60 hover:border-foreground/20'}`}
			>
				{isPro && (
					<div className="bg-foreground text-background absolute top-0 right-0 rounded-bl-xl px-4 py-1.5 font-mono text-xs">
						{t('pricing.popular')}
					</div>
				)}
				<div className="mb-6">
					<h3 className="text-lg font-semibold">
						{tBilling(`plans.${key}.name`)}
					</h3>
					<p className="text-muted-foreground mt-1 text-sm">
						{tBilling(`plans.${key}.description`)}
					</p>
				</div>
				<div className="mb-8 flex items-baseline gap-1">
					<span className="font-display text-5xl font-semibold tracking-tight italic">
						{catalogPlan
							? formatPrice(catalogPlan.price, catalogPlan.currency)
							: '$0'}
					</span>
					<span className="text-muted-foreground text-sm">
						{catalogPlan ? tBilling(`period.${catalogPlan.period}`) : ''}
					</span>
				</div>
				<ul className="mb-8 flex flex-col gap-3">
					{features.map((feature) => (
						<li key={feature} className="flex items-center gap-2.5 text-sm">
							<Check className="h-4 w-4 shrink-0 text-[oklch(0.85_0.25_128)]" />
							{feature}
						</li>
					))}
				</ul>
				<Link
					href="/signup"
					className={`inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-all ${isPro ? 'bg-foreground text-background hover:opacity-90' : 'border-border bg-background hover:bg-muted border'}`}
				>
					{t('hero.cta')}
				</Link>
			</div>
		)
	})
}
```

- [ ] **Step 4: Verify landing page works**

Run: `npm run dev`, navigate to `/` (landing page).
Verify:

- Plan names, descriptions, features render correctly from `billing` i18n
- Prices come from catalog API (same as backend config)
- Both locales work (`/en`, `/uk`)

- [ ] **Step 5: Commit**

```bash
cd /Users/egorzozula/Desktop/Template-frontend
git add app/[locale]/(landing)/page.tsx
git commit -m "refactor(landing): use billing catalog API for pricing section

Prices from backend catalog, display text from billing i18n.
Removes hardcoded planKeys array.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Verify and lint

- [ ] **Step 1: Run TypeScript check**

Run: `cd /Users/egorzozula/Desktop/Template-frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: Run linter**

Run: `cd /Users/egorzozula/Desktop/Template-frontend && npm run lint`
Expected: No errors

- [ ] **Step 3: Run formatter**

Run: `cd /Users/egorzozula/Desktop/Template-frontend && npm run format`

- [ ] **Step 4: Run build**

Run: `cd /Users/egorzozula/Desktop/Template-frontend && npm run build`
Expected: Build succeeds

- [ ] **Step 5: Final commit if formatting changed files**

```bash
cd /Users/egorzozula/Desktop/Template-frontend
git diff --name-only
# Stage only the files that were changed by formatting
git add components/ services/ app/ lib/ i18n/
git commit -m "chore: format

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```
