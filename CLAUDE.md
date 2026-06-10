# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Use this project as a **reference template** when building new frontend projects.

## Commands

- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve production build
- `npm run lint` — run ESLint (flat config, ESLint 9)
- `npm run format` — format all files with Prettier
- `npm run format:check` — check formatting without modifying files

## Tech Stack

| Layer      | Technology                                        | Version |
| ---------- | ------------------------------------------------- | ------- |
| Framework  | Next.js (App Router)                              | 16      |
| UI Library | React                                             | 19      |
| Language   | TypeScript (strict mode)                          | 5       |
| Styling    | Tailwind CSS via PostCSS (`@tailwindcss/postcss`) | 4       |
| Components | shadcn/ui (style: `base-nova`)                    | 4       |
| Primitives | `@base-ui/react` (headless)                       | 1.3     |
| Icons      | `lucide-react`                                    | 0.577   |
| Forms      | `react-hook-form` + `@hookform/resolvers`         | 7.71    |
| Validation | `zod`                                             | 4       |
| Toasts     | `sonner`                                          | 2       |
| Charts     | `recharts`                                        | 2.15    |
| Themes     | `next-themes` (dark mode via `.dark` class)       | 0.4     |
| Formatting | Prettier + `prettier-plugin-tailwindcss`          | 3       |

## Project Structure

```
├── app/                        # Next.js App Router (routes, layouts, pages)
│   ├── layout.tsx              # Root layout: Geist fonts, global CSS
│   ├── page.tsx                # Home page
│   ├── globals.css             # Tailwind imports + CSS theme variables (oklch)
│   └── [route]/                # Route segments (layout.tsx + page.tsx)
│
├── components/
│   ├── ui/                     # shadcn/ui components (54 components)
│   └── example/                # Usage examples for each UI component
│
├── hooks/                      # Custom React hooks
│   └── use-mobile.ts           # useIsMobile() — viewport < 768px detection
│
├── lib/
│   └── utils.ts                # cn() — clsx + tailwind-merge utility
│
├── public/                     # Static assets (SVGs, favicon)
│
├── services/
│   ├── api/
│   │   ├── api-error.ts        # ApiError class
│   │   ├── types.ts            # All API types + endpoint() helper
│   │   ├── request.ts          # Core request(), parseResponse, buildUrl
│   │   ├── methods.ts          # getData, postData, putData, patchData, deleteData
│   │   └── create-api-methods.ts # Typed mapper: config → API methods
│   ├── configs/                # Project-specific endpoint configs
│   │   └── example.config.ts   # Example config (reference)
│   └── index.ts                # Public API re-exports
│
├── types/                      # Shared TypeScript types
├── constants/                  # App-wide constants
│
├── components.json             # shadcn/ui configuration
├── tsconfig.json               # TypeScript config (path aliases)
├── postcss.config.mjs          # PostCSS with @tailwindcss/postcss
├── eslint.config.mjs           # ESLint 9 flat config
├── .prettierrc                 # Prettier configuration
├── Dockerfile                  # Multi-stage production Docker build
├── docker-compose.yml          # Docker Compose for local/production
├── .github/workflows/ci.yml   # GitHub Actions CI (lint + build)
└── next.config.ts              # Next.js config (standalone output)
```

## Architecture Details

### Routing (App Router)

All routes live in `app/`. Each route segment is a folder containing `page.tsx` (the page) and optionally `layout.tsx` (shared layout wrapper). Layouts are nested — child routes inherit parent layouts.

```
app/
├── layout.tsx          # Root layout (fonts, <html>, <body>)
├── page.tsx            # /
└── dashboard/
    ├── layout.tsx      # Shared layout for /dashboard/*
    ├── page.tsx        # /dashboard
    └── settings/
        └── page.tsx    # /dashboard/settings
```

### Path Alias

`@/*` maps to the project root. Additional explicit aliases for key directories:

| Alias           | Path            | Purpose                     |
| --------------- | --------------- | --------------------------- |
| `@/*`           | `./*`           | Project root (catch-all)    |
| `@/types/*`     | `./types/*`     | Shared TypeScript types     |
| `@/services/*`  | `./services/*`  | API services, data fetching |
| `@/constants/*` | `./constants/*` | App-wide constants          |

```tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import type { User } from '@/types/user'
import { fetchUsers } from '@/services/users'
import { API_URL } from '@/constants/config'
```

### Styling System

**Tailwind CSS 4** with CSS custom properties for theming. All theme tokens are defined in `app/globals.css` using oklch color space.

Key CSS variables (available in both light and dark themes):

- `--background`, `--foreground` — page background/text
- `--primary`, `--primary-foreground` — primary action color
- `--secondary`, `--secondary-foreground` — secondary color
- `--muted`, `--muted-foreground` — subdued content
- `--destructive` — error/danger color
- `--card`, `--card-foreground` — card surfaces
- `--popover`, `--popover-foreground` — floating surfaces
- `--border`, `--input`, `--ring` — borders and focus rings
- `--radius` — base border radius (scales: `--radius-sm` through `--radius-4xl`)
- `--chart-1` through `--chart-5` — chart palette
- `--sidebar-*` — sidebar-specific tokens

Dark mode is toggled by adding `.dark` class to a parent element. The variant is defined as `@custom-variant dark (&:is(.dark *))`.

### Fonts

Inter (`--font-inter`) loaded via `next/font/google` in the root layout with `latin` and `cyrillic` subsets. Applied as a CSS variable on `<body>`.

## Component Patterns

### shadcn/ui Components (`components/ui/`)

All 54 UI components follow these conventions:

1. **Function declarations** (not arrow functions) for component definitions
2. **`data-slot` attribute** on every component root for CSS targeting
3. **`cn()` utility** for merging Tailwind classes with user overrides
4. **Spread `...props`** to allow full customization
5. **No inline comments** — code relies on clear naming
6. **Named exports** (not default exports) for all components

Example pattern:

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

function ComponentName({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="component-name"
			className={cn('tailwind-classes-here', className)}
			{...props}
		/>
	)
}

export { ComponentName }
```

### Components with Variants (CVA)

Components with multiple visual variants use `class-variance-authority`:

```tsx
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva('base-classes', {
	variants: {
		variant: {
			default: '...',
			outline: '...',
			ghost: '...',
		},
		size: {
			default: '...',
			sm: '...',
			lg: '...',
		},
	},
	defaultVariants: {
		variant: 'default',
		size: 'default',
	},
})

function Button({
	className,
	variant = 'default',
	size = 'default',
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Button, buttonVariants }
```

### Headless Primitives (@base-ui/react)

Many components wrap `@base-ui/react` primitives for built-in accessibility:

```tsx
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { Input as InputPrimitive } from '@base-ui/react/input'
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox'
```

This gives components proper ARIA attributes, keyboard navigation, and focus management out of the box.

> **Important:** This is NOT Radix UI — there is no `asChild` prop. For link-buttons use `buttonVariants()` + `className` on `<Link>` in Client Components, or Tailwind classes directly in Server Components (since `buttonVariants` is exported from a `'use client'` file and cannot be called on the server).

### Compound Components

Complex UI elements use the compound component pattern with separate sub-components:

```tsx
// Card with sub-components
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer actions</CardFooter>
</Card>

// Field with sub-components (form fields)
<Field data-invalid={!!errors.name || undefined}>
  <FieldLabel htmlFor="name">Name</FieldLabel>
  <FieldDescription>Helper text</FieldDescription>
  <Input id="name" {...register("name")} />
  <FieldError errors={[errors.name]} />
</Field>
```

## Form Handling Pattern

Forms use `react-hook-form` + `zod` for type-safe validation:

```tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

// 1. Define schema
const schema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	email: z.email('Invalid email'),
	role: z.string().min(1, 'Select a role'),
})

type FormData = z.infer<typeof schema>

// 2. Setup form
const {
	register,
	handleSubmit,
	control,
	formState: { errors },
	reset,
} = useForm<FormData>({
	resolver: zodResolver(schema),
})

// 3. Handle submit
const onSubmit = (data: FormData) => {
	toast.success('Success!', { description: `Welcome, ${data.name}` })
	reset()
}

// 4. Render with Field components
;<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
	{/* Simple inputs — use register() */}
	<Field data-invalid={!!errors.name || undefined}>
		<FieldLabel htmlFor="name">Name</FieldLabel>
		<Input id="name" {...register('name')} />
		<FieldError errors={[errors.name]} />
	</Field>

	{/* Custom components (Select, Switch, Checkbox) — use Controller */}
	<Field data-invalid={!!errors.role || undefined}>
		<FieldLabel>Role</FieldLabel>
		<Controller
			control={control}
			name="role"
			render={({ field }) => (
				<Select value={field.value} onValueChange={field.onChange}>
					<SelectTrigger>
						<SelectValue placeholder="Select" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="dev">Developer</SelectItem>
					</SelectContent>
				</Select>
			)}
		/>
		<FieldError errors={[errors.role]} />
	</Field>

	<Button type="submit">Submit</Button>
</form>
```

Key rules:

- Use `register()` for native inputs (Input, Textarea, NativeSelect)
- Use `Controller` for custom components (Select, Switch, Checkbox, RadioGroup)
- Set `data-invalid={!!errors.field || undefined}` on Field to trigger error styling
- Pass `errors={[errors.field]}` to FieldError for automatic error display
- Horizontal fields (Switch, Checkbox): use `<Field orientation="horizontal">`

## API Layer

Config-driven, type-safe API layer in `services/`. Works in both Server Components and Client Components.

### Architecture

```
Caller → createApiMethods(config) → method wrapper (getData/postData/...) → request()
                                                                              │
                                              beforeRequest interceptors ─────┤
                                              buildUrl (path + query params)  │
                                              fetch + AbortController timeout │
                                              parseResponse (json/text/null)  │
                                              afterResponse interceptors ─────┤
                                              onError interceptors (on fail) ─┘
```

All errors are **thrown** as `ApiError` (never returned as values). Unhandled errors bubble up to `error.tsx`.

### Defining Endpoints

Endpoints are declared as config objects in `services/configs/`. Use `endpoint<TRequest, TResponse>()` to preserve generic types for inference:

```ts
import { getData, postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface User {
	id: string
	email: string
	name: string
}
interface CreateUserBody {
	email: string
	name: string
}

const userApiConfig = {
	me: endpoint<void, User>({
		url: () => `/api/users/me`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch profile',
	}),

	getById: endpoint<void, User>({
		url: ({ id }) => `/api/users/${id}`,
		method: getData,
	}),

	create: endpoint<CreateUserBody, User>({
		url: () => `/api/users`,
		method: postData,
	}),
}

export default userApiConfig
```

Rules:

- `endpoint<void, T>` + `getData`/`deleteData` — no body accepted
- `endpoint<TBody, T>` + `postData`/`putData`/`patchData` — body required
- `url` receives `pathParams` and returns the full path
- `defaultHeaders`, `defaultQuery`, `defaultErrorMessage` are optional defaults

### Creating API Methods

`createApiMethods()` maps config into typed functions:

```ts
import { createApiMethods } from '@/services/api/create-api-methods'
import userApiConfig from '@/services/configs/user.config'

export const userApi = createApiMethods(userApiConfig)
```

Generated methods are fully typed:

- `userApi.me()` → `Promise<User>`
- `userApi.getById({ pathParams: { id: '1' } })` → `Promise<User>`
- `userApi.create({ body: { email, name } })` → `Promise<User>`
- `userApi.create()` → TypeScript error (body required)

### Interceptors

Middleware pattern for auth, logging, error handling. Applied globally or per-call:

```ts
import type { BeforeRequest, OnError } from '@/services/api/types'

const withAuth: BeforeRequest = async (config) => ({
	...config,
	headers: { ...config.headers, Authorization: `Bearer ${await getToken()}` },
})

const handle401: OnError = (error) => {
	if (error.status === 401) redirect('/login')
}

export const userApi = createApiMethods(userApiConfig, {
	interceptors: {
		beforeRequest: [withAuth],
		onError: [handle401],
	},
})
```

Three interceptor types:

- `BeforeRequest` — modify config before fetch (auth headers, logging)
- `AfterResponse` — transform response data
- `OnError` — handle errors (redirect, log, mutate error). After all `onError` run, the error is re-thrown

Execution order: global interceptors first, then per-call. Per-call interceptors can be passed in method params.

### Error Handling

```ts
import { ApiError } from '@/services'

try {
	const user = await userApi.me()
} catch (err) {
	if (err instanceof ApiError) {
		err.status // HTTP status (0 = network, 408 = timeout)
		err.message // Status text or custom message
		err.data // Parsed response body (validation errors, etc.)
	}
}
```

All `ApiError` properties are mutable for transformation in `onError` interceptors.

### Timeout

Built-in via `AbortController`. Default: 30 seconds. Override per-endpoint or per-call:

```ts
await userApi.me({ timeout: 5000 })
```

### Base URL

`url` functions return paths that may be relative or absolute:

- **Client Components** — relative URLs work with Next.js rewrites
- **Server Components** — use absolute URLs (`${process.env.API_URL}/path`) for server-to-server calls

### Available Methods

| Function     | HTTP Method | Body     |
| ------------ | ----------- | -------- |
| `getData`    | GET         | No       |
| `postData`   | POST        | Required |
| `putData`    | PUT         | Required |
| `patchData`  | PATCH       | Required |
| `deleteData` | DELETE      | No       |

If DELETE needs a body, use `request()` directly.

### Adding a New API

Step-by-step workflow for connecting a new backend API:

**1. Create types** — define request/response interfaces in `services/configs/<name>.types.ts`:

```ts
// services/configs/post.types.ts
interface Post {
	id: string
	title: string
	body: string
}
interface CreatePostBody {
	title: string
	body: string
}
interface UpdatePostBody {
	title?: string
	body?: string
}
```

**2. Create config** — declare endpoints in `services/configs/<name>.config.ts`:

```ts
// services/configs/post.config.ts
import {
	getData,
	postData,
	patchData,
	deleteData,
} from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { Post, CreatePostBody, UpdatePostBody } from './post.types'

const postApiConfig = {
	getAll: endpoint<void, Post[]>({
		url: () => `/api/posts`,
		method: getData,
	}),
	getById: endpoint<void, Post>({
		url: ({ id }) => `/api/posts/${id}`,
		method: getData,
	}),
	create: endpoint<CreatePostBody, Post>({
		url: () => `/api/posts`,
		method: postData,
	}),
	update: endpoint<UpdatePostBody, Post>({
		url: ({ id }) => `/api/posts/${id}`,
		method: patchData,
	}),
	remove: endpoint<void, null>({
		url: ({ id }) => `/api/posts/${id}`,
		method: deleteData,
	}),
}

export default postApiConfig
```

**3. Wire up** — create methods and export in `services/index.ts`:

```ts
// Add to services/index.ts
import { createApiMethods } from './api/create-api-methods'
import postApiConfig from './configs/post.config'

export const postApi = createApiMethods(postApiConfig, {
	interceptors: { beforeRequest: [withAuth] }, // if auth needed
})
```

**4. Use in components:**

```tsx
// Server Component
import { postApi } from '@/services'

export default async function PostsPage() {
	const posts = await postApi.getAll()
	return <PostList posts={posts} />
}

// Client Component
;('use client')
import { postApi } from '@/services'
import { ApiError } from '@/services'

async function handleCreate(data: CreatePostBody) {
	try {
		const post = await postApi.create({ body: data })
		toast.success('Post created')
	} catch (err) {
		if (err instanceof ApiError) toast.error(err.message)
	}
}
```

## Adding New shadcn Components

Use the shadcn CLI. The config is in `components.json`:

```bash
npx shadcn@latest add [component-name]
```

Components will be placed in `components/ui/` and follow the `base-nova` style with `@base-ui/react` primitives.

## Available UI Components Reference

**Layout:** Card, Separator, Resizable, AspectRatio, ScrollArea, Sidebar
**Navigation:** Breadcrumb, NavigationMenu, Pagination, Tabs, Menubar
**Forms:** Input, Textarea, Select, NativeSelect, Checkbox, RadioGroup, Switch, Slider, Toggle, ToggleGroup, Calendar, Combobox, InputOTP, InputGroup, Field (with FieldLabel, FieldDescription, FieldError, FieldContent)
**Feedback:** Alert, AlertDialog, Dialog, Drawer, Sheet, Sonner (toast), Progress, Skeleton, Spinner, Empty
**Data Display:** Table, Badge, Avatar, HoverCard, Tooltip, Kbd, Item
**Actions:** Button, ButtonGroup, DropdownMenu, ContextMenu, Command, Popover
**Media:** Carousel, Chart
**Overlay:** Collapsible, Accordion

## Error Handling Pages

Three levels of error handling are in place:

| File                         | Scope                                | i18n                        | Styling                     |
| ---------------------------- | ------------------------------------ | --------------------------- | --------------------------- |
| `app/global-error.tsx`       | Root layout crashes                  | Hardcoded EN                | Inline styles (no Tailwind) |
| `app/[locale]/error.tsx`     | All pages inside `[locale]`          | `useTranslations('errors')` | Tailwind + theme variables  |
| `app/not-found.tsx`          | Unmatched routes (404)               | `getTranslations('errors')` | Tailwind + theme variables  |
| `app/[locale]/not-found.tsx` | `notFound()` calls inside `[locale]` | `useTranslations('errors')` | Tailwind + theme variables  |

Translations are in `i18n/messages/{en,uk}.json` under the `errors` key.

`global-error.tsx` renders its own `<html>` and `<body>` tags with inline styles because root layout may be broken. All other error pages use the normal layout and theme.

## API Error Handling

### Backend Response Format

All backend error responses follow this shape:

```json
{
	"statusCode": 400,
	"status": "validationError",
	"data": { "email": { "error": "email - must be a valid email" } }
}
```

Known `status` strings: `success`, `badRequest`, `validationError`, `nothingToUpdate`, `unauthorized`, `notFound`, `serverError`, `featureLocked`, `planRequired`, `userDeleted`.

### ApiError Class

`ApiError` (`services/api/api-error.ts`) is the unified error type for all API failures. It preserves backward-compatible properties (`status`, `message`, `data`) and adds typed accessors:

| Property / Getter     | Type                             | Description                                                         |
| --------------------- | -------------------------------- | ------------------------------------------------------------------- |
| `status`              | `number`                         | HTTP status code (0 = network, 408 = timeout)                       |
| `message`             | `string`                         | HTTP statusText or custom message                                   |
| `data`                | `unknown`                        | Raw parsed response body                                            |
| `body`                | `ApiErrorResponseBody \| null`   | Parsed backend response (cached)                                    |
| `statusMessage`       | `string \| null`                 | Backend `status` string (e.g., `"validationError"`)                 |
| `appStatusCode`       | `number \| null`                 | Backend `statusCode`                                                |
| `fieldErrors`         | `Record<string, string> \| null` | Normalized field errors `{ field: message }`                        |
| `isValidationError`   | `boolean`                        | `true` when `status === 400 && statusMessage === "validationError"` |
| `displayMessage`      | `string`                         | `defaultErrorMessage ?? message ?? fallback`                        |
| `silent`              | `boolean \| undefined`           | When `true`, global toast interceptor skips                         |
| `defaultErrorMessage` | `string \| undefined`            | From `EndpointConfig.defaultErrorMessage`                           |
| `requestConfig`       | `RequestConfig \| undefined`     | Original request config (for retry support)                         |
| `globalInterceptors`  | `Interceptors \| undefined`      | Global interceptors (for retry support)                             |

### Error Classification

| HTTP Code | Backend Status                  | Error Type       | Handling                          |
| --------- | ------------------------------- | ---------------- | --------------------------------- |
| 0         | —                               | Network error    | Auto-toast                        |
| 408       | —                               | Timeout          | Auto-toast                        |
| 400       | `validationError`               | Field validation | `setServerErrors()` → form fields |
| 400       | `badRequest`, `nothingToUpdate` | Bad request      | Auto-toast                        |
| 401       | `unauthorized`                  | Authentication   | Refresh token → retry → redirect  |
| 403       | `featureLocked`, `planRequired` | Authorization    | Auto-toast                        |
| 404       | `notFound`                      | Not found        | Auto-toast                        |
| 500       | `serverError`                   | Server error     | Auto-toast                        |

### Interceptors

Two built-in interceptors in `services/api/interceptors/`:

**`createToastInterceptor()`** — auto-shows `toast.error()` via sonner. Exclusions:

- `error.status === 401` (handled by auth redirect)
- `error.isValidationError` (handled by form field errors)
- `error.silent === true` (opt-out per-call)

Toast text priority: `defaultErrorMessage` → i18n resolved message → `message` fallback.

Accepts optional `getErrorMessage` callback for i18n integration. Use `getStatusI18nKey(error.status)` to map HTTP codes to translation keys (`errors.api.*`).

**`createAuthRefreshInterceptor(refreshUrl, loginPath)`** — handles 401:

1. Attempts `POST refreshUrl` via raw `fetch`
2. On success → retries the original request with fresh token
3. On failure → redirects to `loginPath`
4. Concurrent 401s share a single refresh attempt
5. `_isRetry` flag prevents infinite retry loops

Both interceptors are **client-only** (`'use client'`). Do not wire them into server-side API instances.

### OnError Recovery

`OnError` interceptors can return a value to recover from errors (used by auth-refresh for retry):

```ts
type OnError = (error: ApiError) => void | unknown | Promise<void | unknown>
```

If an interceptor returns a non-`undefined` value, `request()` uses it as the successful result instead of throwing. Existing `void`-returning interceptors are unaffected.

### Wiring Interceptors

```ts
import {
	createApiMethods,
	createAuthRefreshInterceptor,
	createToastInterceptor,
	getStatusI18nKey,
} from '@/services'
import userApiConfig from '@/services/configs/user.config'

export const userApi = createApiMethods(userApiConfig, {
	interceptors: {
		onError: [
			createAuthRefreshInterceptor('/api/auth/refresh', '/login'),
			createToastInterceptor(),
		],
	},
})
```

With i18n (inside a React component or hook where `useTranslations` is available):

```ts
const t = useTranslations('errors')

const userApi = createApiMethods(userApiConfig, {
	interceptors: {
		onError: [
			createAuthRefreshInterceptor('/api/auth/refresh', '/login'),
			createToastInterceptor({
				getErrorMessage: (error) => t(`api.${getStatusI18nKey(error.status)}`),
			}),
		],
	},
})
```

### i18n Error Keys

Translation keys under `errors.api.*` in `i18n/messages/{en,uk}.json`:

| Key                  | HTTP Code | EN                     |
| -------------------- | --------- | ---------------------- |
| `network`            | 0         | No internet connection |
| `timeout`            | 408       | Request timed out      |
| `badRequest`         | 400, 422  | Invalid request        |
| `forbidden`          | 403       | No permission          |
| `notFound`           | 404       | Resource not found     |
| `conflict`           | 409       | Action conflicts       |
| `tooManyRequests`    | 429       | Too many requests      |
| `serverError`        | 500       | Server error           |
| `serviceUnavailable` | 503       | Service unavailable    |
| `unknown`            | other     | Unexpected error       |

`getStatusI18nKey(status)` maps HTTP codes to these keys.

### Form Validation Integration

`setServerErrors()` (`services/api/set-server-errors.ts`) bridges `ApiError` → react-hook-form:

```tsx
import { setServerErrors } from '@/services'

const onSubmit = async (data: FormData) => {
	try {
		await userApi.create({ body: data })
		toast.success('Created!')
	} catch (err) {
		if (!setServerErrors(err, setError)) {
			// Not a validation error — toast already shown by interceptor
		}
	}
}
```

`setServerErrors(error, setError)` returns `true` if field errors were set, `false` otherwise.

### Silent Mode

Disable auto-toast for a specific call:

```ts
await userApi.me({ silent: true })
```

### defaultErrorMessage

Define in endpoint config — used as toast text when the endpoint fails:

```ts
const config = {
	getAll: endpoint<void, User[]>({
		url: () => `/api/users`,
		method: getData,
		defaultErrorMessage: 'Failed to load users',
	}),
}
```

## Client vs Server Components

By default, components in `app/` are **React Server Components**. Add `"use client"` directive at the top of files that need:

- React hooks (`useState`, `useEffect`, `useForm`, etc.)
- Event handlers (`onClick`, `onSubmit`, etc.)
- Browser APIs (`window`, `document`, etc.)
- Third-party client libraries (`sonner`, `react-hook-form`, etc.)

UI components in `components/ui/` that use `@base-ui/react` primitives or interactivity already have `"use client"` where needed.

## Key Utility: cn()

Located in `lib/utils.ts`. Always use it for className composition:

```tsx
import { cn } from '@/lib/utils'

// Merges classes and resolves Tailwind conflicts
cn('px-4 py-2', 'px-6') // → "px-6 py-2"
cn('text-red-500', className) // → allows overrides from props
cn(condition && 'hidden') // → conditional classes
```

## Code Quality

### ESLint

ESLint 9 flat config in `eslint.config.mjs`:

- Extends `next/core-web-vitals`, `next/typescript`, and `eslint-config-prettier`
- `eslint-config-prettier` disables formatting rules that conflict with Prettier
- Ignores `.next/`, `out/`, `build/`, `next-env.d.ts`

### Prettier

Config in `.prettierrc`:

- Tabs for indentation, no semicolons, single quotes
- `prettier-plugin-tailwindcss` auto-sorts Tailwind classes
- Ignored paths in `.prettierignore`

Run `npm run format` to format all files. CI checks formatting with `npm run format:check`.

## Docker

Multi-stage Dockerfile optimized for production:

1. **deps** — installs `node_modules` with `npm ci`
2. **builder** — runs `npm run build` (requires `output: "standalone"` in `next.config.ts`)
3. **runner** — minimal image with only standalone output, runs as non-root user

```bash
# Build and run with Docker Compose
docker compose up --build

# Or build manually
docker build -t frontend-template .
docker run -p 3000:3000 frontend-template
```

The `standalone` output mode bundles everything into a self-contained `server.js` — no `node_modules` needed in the final image.

## Monitoring (New Relic)

Optional New Relic integration for APM, Browser monitoring, Error tracking, and Logs. Architecturally isolated in `lib/monitoring/`.

### How it works

- `instrumentation.ts` (root) — thin proxy, calls `initMonitoring()` from `lib/monitoring/`
- `lib/monitoring/index.ts` — checks `NEXT_RUNTIME` + `NEW_RELIC_LICENSE_KEY`, dynamically imports `newrelic` agent
- If env vars are not set, monitoring is completely disabled (zero overhead, zero console output)
- Edge Runtime safe — `initMonitoring()` skips when `NEXT_RUNTIME !== 'nodejs'`

### Setup

1. Create a New Relic account at [newrelic.com](https://newrelic.com)
2. Copy your license key from Account Settings > API keys
3. Add to `.env.local`:

```
NEW_RELIC_LICENSE_KEY=your_license_key_here
NEW_RELIC_APP_NAME=your_app_name
```

4. Restart the dev server — APM data will appear in New Relic dashboard within minutes

### Browser Monitoring (opt-in)

Browser monitoring requires adding the `NewRelicBrowserScript` component to a layout:

```tsx
import { NewRelicBrowserScript } from '@/lib/monitoring/new-relic-browser-script'

// Add inside <body> in layout.tsx:
;<NewRelicBrowserScript />
```

The component fetches the browser agent script from an API route (`/api/newrelic-browser-agent`) and injects it client-side. If NR is not active, nothing is rendered.

### Production Recommendation

For maximum APM instrumentation coverage in production, preload the NR agent before all other modules:

```dockerfile
CMD ["node", "-r", "newrelic", "server.js"]
```

This ensures NR can monkey-patch core Node.js modules (`http`, `https`, `fetch`) before they are first imported. The `instrumentation.ts` approach loads NR slightly later, which is sufficient for most use cases but may miss some outgoing HTTP call tracing.

### Environment Variables

| Variable                                           | Required | Default | Description                                      |
| -------------------------------------------------- | -------- | ------- | ------------------------------------------------ |
| `NEW_RELIC_LICENSE_KEY`                            | Yes      | —       | NR license key                                   |
| `NEW_RELIC_APP_NAME`                               | Yes      | —       | App name in NR dashboard                         |
| `NEW_RELIC_NO_CONFIG_FILE`                         | No       | —       | Set to `true` to suppress missing config warning |
| `NEW_RELIC_LOG_LEVEL`                              | No       | `info`  | Agent log level                                  |
| `NEW_RELIC_DISTRIBUTED_TRACING_ENABLED`            | No       | `true`  | Distributed tracing                              |
| `NEW_RELIC_APPLICATION_LOGGING_FORWARDING_ENABLED` | No       | `true`  | Log forwarding to NR                             |

### Architecture

```
instrumentation.ts (root, thin proxy)
  └── lib/monitoring/
        ├── index.ts (init logic, NEXT_RUNTIME guard)
        └── new-relic-browser-script.tsx (opt-in browser agent component)
              └── /api/newrelic-browser-agent (API route for browser timing header)
```

## CI/CD (GitHub Actions)

Pipeline in `.github/workflows/ci.yml` triggers on push/PR to `main`:

**lint** job:

1. Install dependencies (`npm ci`)
2. Run ESLint (`npm run lint`)
3. Check Prettier formatting (`npx prettier --check .`)

**build** job (depends on lint):

1. Install dependencies
2. Run production build (`npm run build`)
