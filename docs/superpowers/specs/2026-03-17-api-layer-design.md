# API Layer Design

## Context

Frontend template project on Next.js 16 (App Router) needs a reusable, type-safe API layer. The design is informed by two existing implementations:

- **billing-gateway** (Node.js backend) — config-driven with `endpointReducer`, `GeneralError` class, `processResponse`. Problems: method duplication in fetchData, no timeout/retry, server-specific fields leaking.
- **repSet** (React Native client) — TypeScript evolution with generics. Problems: errors returned instead of thrown, `as unknown as` casts, duplicated parse/error logic across methods, unused server fields (cert, key, isBinary).

## Requirements

| Requirement       | Decision                                             |
| ----------------- | ---------------------------------------------------- |
| Execution context | Server Components + Client (both)                    |
| Authentication    | Interceptor pattern, no built-in auth mechanism      |
| Error handling    | Throw `ApiError`, never return errors as values      |
| Architecture      | Config-driven with typed mapper (`createApiMethods`) |
| Timeout           | Built-in via `AbortController`, default 30s          |
| Retry             | Not included, addable via interceptor                |

## File Structure

```
services/
  api/
    request.ts            # Core request() function, parseResponse, buildUrl
    api-error.ts          # ApiError class
    methods.ts            # getData, postData, putData, patchData, deleteData
    create-api-methods.ts # Typed mapper: config object -> API methods
    types.ts              # RequestConfig, EndpointConfig, endpoint(), Interceptors, MethodParams, etc.
  configs/
    example.config.ts     # Example endpoint config (reference for new projects)
  index.ts                # Public API re-exports
```

- `services/api/` — framework code, project-agnostic
- `services/configs/` — project-specific endpoint configurations
- Request/response types live next to their config files

## Shared Types

### `UrlFunction`

```ts
type UrlFunction = (pathParams: Record<string, string | number>) => string
```

URL builder that receives path parameters and returns the full URL path. Path param interpolation happens inside the function:

```ts
url: ({ id }) => `/api/users/${id}`
url: () => `/api/users/me` // no path params
```

### `MethodParams` and `MethodParamsWithBody<T>`

Parameters available to callers of generated API methods:

```ts
interface MethodParams {
	pathParams?: Record<string, string | number>
	queryParams?: Record<string, string | number | boolean | undefined | null>
	headers?: Record<string, string>
	timeout?: number
	interceptors?: Interceptors
}

interface MethodParamsWithBody<T> extends MethodParams {
	body: T
}
```

`MethodParams` is the caller-facing subset of `RequestConfig`. Internal fields (`method`, `url`) are not exposed — they come from the endpoint config.

## Core: `request()`

Single function containing all fetch logic. No duplication across methods.

### Flow

```
request<T>(config: RequestConfig): Promise<T>
  1. Run beforeRequest interceptors on config (global first, then per-call)
  2. buildUrl(url, pathParams, queryParams)
  3. fetch() with AbortController timeout (default 30s)
  4. parseResponse(response) based on content-type
  5. If !response.ok -> throw new ApiError(status, statusText, parsedBody)
  6. Run afterResponse interceptors on data (global first, then per-call)
  7. Return data as T

  catch:
    AbortError -> throw new ApiError(408, 'Request timeout')
    Other      -> run onError interceptors (global first, then per-call), throw new ApiError(0, 'Network error', cause)
```

### `RequestConfig`

```ts
interface RequestConfig {
	url: UrlFunction
	method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
	pathParams?: Record<string, string | number>
	queryParams?: Record<string, string | number | boolean | undefined | null>
	body?: unknown
	headers?: Record<string, string>
	timeout?: number
	interceptors?: Interceptors
}
```

### `parseResponse()`

Unified response parsing (replaces duplicated logic):

- Status 204 or content-length "0" -> `null` (endpoints expected to return 204 should type `TResponse` as `T | null`)
- `content-type` includes `application/json` -> `response.json()`
- `content-type` includes `text/` -> `response.text()`
- Default -> `response.text()` (safe fallback; avoids crashing on unexpected content types)

Binary responses (`application/pdf`, `application/octet-stream`, etc.) are out of scope. For binary downloads, callers should use raw `fetch` directly.

### `buildUrl()`

Internal function (not exported). Calls `url(pathParams)`, filters `undefined` and `null` values from `queryParams`, builds query string via `URLSearchParams`.

## ApiError

```ts
class ApiError extends Error {
	status: number // HTTP status code (0 for network errors, 408 for timeout)
	data: unknown // Parsed response body from server (validation errors, messages, etc.)

	constructor(status: number, message: string, data?: unknown)
}
```

All properties are mutable to support error transformation in `onError` interceptors.

Differences from existing solutions:

- No `custom.statusCode` + `statusCode` duplication (billing-gateway)
- Not returned as value — always thrown (repSet)
- `data` holds server response for caller inspection (e.g., `err.data.errors`)

## Methods

Thin wrappers over `request()`. Each is one line, no logic duplication:

```ts
const getData = <T>(params: MethodParams & { url: UrlFunction }) =>
	request<T>({ method: 'GET', ...params })
const postData = <T>(
	params: MethodParamsWithBody<unknown> & { url: UrlFunction },
) => request<T>({ method: 'POST', ...params })
const putData = <T>(
	params: MethodParamsWithBody<unknown> & { url: UrlFunction },
) => request<T>({ method: 'PUT', ...params })
const patchData = <T>(
	params: MethodParamsWithBody<unknown> & { url: UrlFunction },
) => request<T>({ method: 'PATCH', ...params })
const deleteData = <T>(params: MethodParams & { url: UrlFunction }) =>
	request<T>({ method: 'DELETE', ...params })
```

GET and DELETE don't accept body. POST, PUT, PATCH require body. If a DELETE endpoint requires a body, use `request()` directly.

## Interceptors

```ts
type BeforeRequest = (
	config: RequestConfig,
) => RequestConfig | Promise<RequestConfig>
type AfterResponse = (
	data: unknown,
	config: RequestConfig,
) => unknown | Promise<unknown>
type OnError = (error: ApiError) => void | Promise<void>

interface Interceptors {
	beforeRequest?: BeforeRequest[]
	afterResponse?: AfterResponse[]
	onError?: OnError[]
}
```

**Type design notes:**

- `AfterResponse` uses `unknown` instead of a generic `<T>`. Generic function types lose their type parameter when stored in arrays. Interceptors operate on the raw data; the final `T` cast happens in `request()` after all interceptors run.
- `OnError` returns `void`. The interceptor can log, report, or transform the error. After all `onError` interceptors run, `request()` re-throws the (potentially modified) error. To replace the error, mutate `error.message`/`error.status` or throw a new error from the interceptor.

**Execution order:** Global interceptors run first, then per-call interceptors. Within each group, interceptors execute in array order.

**Merge levels:**

1. **Global** — passed to `createApiMethods(config, { interceptors })`, applies to all methods in that config group
2. **Per-call** — passed in request params, appended after global

## Config and `createApiMethods()`

### Endpoint Config

```ts
interface EndpointConfig<TRequest = void, TResponse = unknown> {
	url: UrlFunction
	method:
		| typeof getData
		| typeof postData
		| typeof putData
		| typeof patchData
		| typeof deleteData
	defaultErrorMessage?: string
	defaultHeaders?: Record<string, string>
	defaultQuery?: Record<string, string | number | boolean>
	_req?: TRequest // phantom type — never set at runtime, carries type info for inference
	_res?: TResponse // phantom type — never set at runtime, carries type info for inference
}
```

**Defaults merging:** `createApiMethods()` merges defaults from config into each request before passing to `request()`:

- `defaultHeaders` shallow-merged under per-call `headers` (per-call wins on conflict)
- `defaultQuery` shallow-merged under per-call `queryParams` (per-call wins on conflict)
- `defaultErrorMessage` used as fallback `ApiError.message` when server response has no message body

### `endpoint()` helper

`satisfies` does not preserve generic type parameters in the inferred type — TypeScript sees the literal object shape but loses `TRequest`/`TResponse`. To solve this, a helper function captures and embeds the generics:

```ts
function endpoint<TRequest = void, TResponse = unknown>(
	config: Omit<EndpointConfig<TRequest, TResponse>, '_req' | '_res'>,
): EndpointConfig<TRequest, TResponse> {
	return config as EndpointConfig<TRequest, TResponse>
}
```

This is the only way to make `MappedApiMethods<T>` correctly infer `TReq`/`TRes` per key. The phantom fields `_req`/`_res` are never assigned at runtime — they exist only in the type system.

Config is an object (not array). Keys become method names:

```ts
const userApiConfig = {
	me: endpoint<void, User>({
		url: () => `/api/users/me`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch profile',
	}),

	login: endpoint<LoginBody, Session>({
		url: () => `/api/auth/login`,
		method: postData,
		defaultErrorMessage: 'Failed to login',
	}),
}
```

**Body requirement** is driven by `TRequest`: if `TRequest extends void`, body is not accepted; otherwise body is required. It is the developer's responsibility to pair `TRequest = void` with GET/DELETE methods and non-void `TRequest` with POST/PUT/PATCH methods. Misuse (e.g., `endpoint<void, User>` with `postData`) is type-valid but semantically wrong.

### Mapper

```ts
function createApiMethods<T extends Record<string, EndpointConfig<any, any>>>(
	config: T,
	options?: { interceptors?: Interceptors },
): MappedApiMethods<T>
```

`MappedApiMethods<T>` infers typed functions per key:

```ts
type MappedApiMethods<T> = {
	[K in keyof T]: T[K] extends EndpointConfig<infer TReq, infer TRes>
		? TReq extends void
			? (params?: MethodParams) => Promise<TRes>
			: (params: MethodParamsWithBody<TReq>) => Promise<TRes>
		: never
}
```

Result:

- `userApi.me()` -> `Promise<User>` (no body allowed)
- `userApi.login({ body: { email, password } })` -> `Promise<Session>` (body required)
- `userApi.login()` -> TypeScript error

## Timeout

`request()` creates `AbortController` with configurable timeout (default 30s):

- `AbortError` is caught and wrapped as `ApiError(408, 'Request timeout')`
- Network errors (DNS, refused, offline) become `ApiError(0, 'Network error', cause)`
- `clearTimeout` in `finally` block prevents timer leaks

## Base URL

`UrlFunction` returns a path that may be relative or absolute depending on context:

- **Client Components** — relative URLs (e.g., `/api/users/me`) work with Next.js rewrites in `next.config.ts`
- **Server Components** — server-to-server calls require absolute URLs (e.g., `${process.env.API_URL}/users/me`) because there is no browser origin to resolve against

The template does not enforce a base URL strategy. Projects should define it in their config files, typically reading from an environment variable.

## Usage Example

```ts
// services/configs/user.config.ts
import { getData, postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface User {
	id: string
	email: string
	name: string
}
interface LoginBody {
	email: string
	password: string
}
interface Session {
	token: string
	user: User
}

const userApiConfig = {
	me: endpoint<void, User>({
		url: () => `/api/users/me`,
		method: getData,
	}),
	login: endpoint<LoginBody, Session>({
		url: () => `/api/auth/login`,
		method: postData,
	}),
}

export default userApiConfig

// services/index.ts
import { createApiMethods } from '@/services/api/create-api-methods'
import type { BeforeRequest } from '@/services/api/types'
import userApiConfig from '@/services/configs/user.config'

// Auth interceptor example (project-level, not part of template)
// Note: beforeRequest supports async — server-side interceptors
// may need `async` to access cookies() from next/headers.
const withAuth: BeforeRequest = async (config) => ({
	...config,
	headers: { ...config.headers, Authorization: `Bearer ${await getToken()}` },
})

export const userApi = createApiMethods(userApiConfig, {
	interceptors: { beforeRequest: [withAuth] },
})

// In a Server Component
const user = await userApi.me()

// In a Client Component
try {
	const session = await userApi.login({ body: { email, password } })
} catch (err) {
	if (err instanceof ApiError && err.status === 422) {
		// validation errors in err.data
	}
	// unhandled -> bubbles to error.tsx
}
```
