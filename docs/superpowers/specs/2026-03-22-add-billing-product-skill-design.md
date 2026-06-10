# Design: `add-billing-product` Skill

## Problem

Adding a new billing product (subscription plan or one-time purchase) requires editing 4-5 files across two projects (backend + frontend). The process is mechanical but error-prone — missing a constant or forgetting i18n keys breaks the UI silently.

## Solution

A Claude Code skill that collects all required information, then automatically edits all necessary files in both projects.

## Input Data

| Field             | Required               | Example                                   |
| ----------------- | ---------------------- | ----------------------------------------- |
| type              | always                 | `subscription` or `one_time`              |
| key               | always                 | `business` (snake_case)                   |
| creemProductId    | always                 | `prod_xxx123`                             |
| price             | always                 | `4900` (cents)                            |
| currency          | always                 | `USD`                                     |
| period            | subscription only      | `month` or `year`                         |
| hierarchyPosition | subscription only      | `after pro`                               |
| features          | always                 | `{ export: true, apiAccess: true }`       |
| limits            | always                 | `{ projects: Infinity, storage: 100000 }` |
| i18n EN           | always (or "generate") | `{ name: "Business", features: [...] }`   |
| i18n UK           | always (or "generate") | `{ name: "Бізнес", features: [...] }`     |

## Input Mode

Hybrid: user can provide all data at once, partial data, or nothing. Skill parses what's available and asks for the rest one question at a time.

If user says "generate texts" for i18n, skill reads existing entries as style reference and generates both EN/UK texts, showing them for confirmation.

## Files Modified

**Backend** (`BackendTemplate`):

1. `src/modules/billing/constants/billing.js` — SUBSCRIPTION_PRODUCTS/ONE_TIME_PRODUCTS, PLANS/PRODUCTS, PLAN_CATALOG/PRODUCT_CATALOG, PLAN_HIERARCHY
2. `src/modules/billing/hooks/productHooks.js` — empty lifecycle hooks (subscription only)

**Frontend** (`Template-frontend`):

1. `i18n/messages/en.json` — `billing.plans.{key}` or `billing.products.{key}`
2. `i18n/messages/uk.json` — same structure, Ukrainian texts

## What It Does NOT Touch

- Frontend TypeScript types (`billing.config.ts`) — generic, work with any keys
- UI components (`billing-plan-tab.tsx`) — data-driven, auto-discover new products
- Backend middleware (`plan.js`) — route guards configured separately
- No lint/build verification

## Flow

1. Parse input for known fields
2. Ask for missing fields (one at a time)
3. If i18n = "generate" → read existing entries, generate, confirm with user
4. Read current file state
5. Edit all files
6. Print summary
