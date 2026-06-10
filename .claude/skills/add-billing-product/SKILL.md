---
name: add-billing-product
description: Add a new subscription plan, one-time purchase, or billing product to both backend and frontend
argument-hint: "[type] [key] [price] [details...]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

# Add a billing product

Add a new billing product (subscription plan or one-time purchase) across both backend and frontend projects.

## Required information

The skill needs ALL of the following before making any changes. Parse what the user provided in `$ARGUMENTS` and their message. For anything missing — ask the user one question at a time.

| Field | Required | Example | Notes |
|-------|----------|---------|-------|
| `type` | always | `subscription` or `one_time` | Determines which constants to update |
| `key` | always | `business`, `analytics_pack` | Internal system name, snake_case |
| `price` | always | `4900` | In cents |
| `currency` | always | `USD` | ISO 4217 |
| `period` | subscription only | `month` or `year` | Billing period |
| `hierarchyPosition` | subscription only | `after pro` | Where in PLAN_HIERARCHY |
| `features` | always | `{ export: true, apiAccess: true }` | Object with boolean flags |
| `limits` | always | `{ projects: Infinity, storage: 100000 }` | Object with numeric values |
| `i18n EN` | always | `{ name: "Business", features: ["Unlimited projects", ...] }` | English display texts |
| `i18n UK` | always | `{ name: "Бізнес", features: ["Необмежені проєкти", ...] }` | Ukrainian display texts |

### i18n text generation

If the user says "generate texts yourself" / "сгенерируй сам" or similar — generate i18n texts based on:
1. Read existing i18n entries in `i18n/messages/en.json` and `i18n/messages/uk.json` under `billing.plans.*` and `billing.products.*` to match the established style and tone
2. Use the product's features and limits to derive meaningful feature descriptions
3. Generate both EN and UK texts
4. Show the generated texts to the user for confirmation before proceeding

## File locations

**Backend** (`/Users/egorzozula/Desktop/BackendTemplate/`):
- `src/modules/billing/constants/billing.js` — all product/plan constants
- `src/modules/billing/hooks/productHooks.js` — lifecycle hooks (subscription only)
- `.env.example` — product ID env var placeholders

**Frontend** (`/Users/egorzozula/Desktop/Template-frontend/`):
- `i18n/messages/en.json` — English translations (billing namespace)
- `i18n/messages/uk.json` — Ukrainian translations (billing namespace)

## Steps

### 1. Collect information

Parse `$ARGUMENTS` and the user's message for any provided fields. Determine what is missing.

If anything is missing, ask the user **one question at a time**. For `type`, offer: "subscription (recurring monthly/yearly) or one_time (single purchase)?". For `features` and `limits`, read the current `PLANS` and `PRODUCTS` from `src/modules/billing/constants/billing.js` to show existing feature/limit keys as reference.

Do NOT proceed to step 2 until all required fields are collected.

### 2. Read current state

Read these files to understand the current structure:

```
/Users/egorzozula/Desktop/BackendTemplate/src/modules/billing/constants/billing.js
/Users/egorzozula/Desktop/BackendTemplate/src/modules/billing/hooks/productHooks.js
/Users/egorzozula/Desktop/BackendTemplate/.env.example
/Users/egorzozula/Desktop/Template-frontend/i18n/messages/en.json
/Users/egorzozula/Desktop/Template-frontend/i18n/messages/uk.json
```

### 3. Update backend constants

Edit `src/modules/billing/constants/billing.js`:

**For subscription products:**

a) Add to `SUBSCRIPTION_PRODUCTS`:
```js
export const SUBSCRIPTION_PRODUCTS = fromEnvEntries(
  // ... existing entries
  [process.env.CREEM_PRODUCT_${KEY_UPPER}, "${key}"],
);
```

b) Add to `PLANS`:
```js
export const PLANS = {
  // ... existing entries
  ${key}: {
    features: ${features},
    limits: ${limits},
  },
};
```

c) Add to `PLAN_CATALOG`:
```js
export const PLAN_CATALOG = {
  // ... existing entries
  ${key}: {
    price: ${price},
    currency: "${currency}",
    period: "${period}",
    productId: process.env.CREEM_PRODUCT_${KEY_UPPER},
  },
};
```

d) Insert into `PLAN_HIERARCHY` at the specified position:
```js
export const PLAN_HIERARCHY = ["free", "pro", "${key}"];
```

**For one-time products:**

a) Add to `ONE_TIME_PRODUCTS`:
```js
export const ONE_TIME_PRODUCTS = fromEnvEntries(
  // ... existing entries
  [process.env.CREEM_PRODUCT_${KEY_UPPER}, "${key}"],
);
```

b) Add to `PRODUCTS`:
```js
export const PRODUCTS = {
  // ... existing entries
  ${key}: {
    name: "${name}",
    features: ${features},
    limits: ${limits},
  },
};
```

c) Add to `PRODUCT_CATALOG`:
```js
export const PRODUCT_CATALOG = {
  // ... existing entries
  ${key}: {
    type: "one_time",
    price: ${price},
    currency: "${currency}",
    productId: process.env.CREEM_PRODUCT_${KEY_UPPER},
  },
};
```

### 4. Update `.env.example`

Add placeholder for the new product to `.env.example`:

```env
CREEM_PRODUCT_${KEY_UPPER}=prod_your_${key}_id
```

### 5. Update `requiredProductEnvVars`

Add the new env var name to the validation array in `billing.js`:

```js
const requiredProductEnvVars = [
  // ... existing entries
  "CREEM_PRODUCT_${KEY_UPPER}",
];
```

### 6. Update backend hooks (subscription only)

Edit `src/modules/billing/hooks/productHooks.js` — add empty hooks for the new plan:

```js
const PRODUCT_HOOKS = {
  // ... existing entries
  ${key}: {
    onActivate:   async (_user, _subscription) => {},
    onDeactivate: async (_user, _subscription) => {},
    onRenew:      async (_user, _subscription) => {},
  },
};
```

### 7. Update frontend i18n

Edit `i18n/messages/en.json` — add under `billing.plans.${key}` (for subscription) or `billing.products.${key}` (for one-time):

```json
{
  "name": "${i18n_en_name}",
  "features": ${i18n_en_features}
}
```

Edit `i18n/messages/uk.json` — same structure with Ukrainian texts.

For subscription plans, also add `description` if provided.

### 8. Summary

Print a summary of all changes made:

```
Added ${type} product "${key}":
  Backend:
    - constants/billing.js: ${list of constants updated}
    - hooks/productHooks.js: ${if subscription: "empty hooks added" | if one_time: "n/a"}
    - .env.example: CREEM_PRODUCT_${KEY_UPPER} placeholder added
    - requiredProductEnvVars: "CREEM_PRODUCT_${KEY_UPPER}" added
  Frontend:
    - en.json: billing.${plans|products}.${key}
    - uk.json: billing.${plans|products}.${key}

  ⚠️ Add your Creem product ID to .env: CREEM_PRODUCT_${KEY_UPPER}=prod_xxx
```

## What to ask the user

When collecting missing information, ask in this order:
1. Type: "Subscription (recurring) or one-time purchase?"
2. Key: "System name for this product? (snake_case, e.g. `business`, `analytics_pack`)"
3. Price: "Price in cents? (e.g. 4900 = $49.00)"
4. Currency: "Currency? (default: USD)"
5. Period (subscription only): "Billing period — month or year?"
6. Hierarchy position (subscription only): "Where in the plan hierarchy? (current: free → pro)"
7. Features: "Which features does this product enable? Current feature keys: `dashboard`, `export`, `apiAccess`. You can add new ones."
8. Limits: "What limits does this product set? Current limit keys: `projects`, `storage`. You can add new ones."
9. i18n: "Display texts for EN and UK? Or should I generate them based on features/limits? (say 'generate' for auto-generation)"
