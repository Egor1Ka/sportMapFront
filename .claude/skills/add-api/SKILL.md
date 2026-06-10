---
name: add-api
description: Add a new API config with typed endpoints, methods, and exports
argument-hint: [resource-name]
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Add API endpoints for a new resource

Create a type-safe API config for **$ARGUMENTS** following the project's config-driven pattern.

## Steps

### 1. Create types file

Create `services/configs/$ARGUMENTS.types.ts` with request/response interfaces.

Ask the user what fields the resource has if not specified. Keep interfaces minimal.

### 2. Create config file

Create `services/configs/$ARGUMENTS.config.ts`:

```ts
import { getData, postData, patchData, deleteData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { /* types */ } from './$ARGUMENTS.types'
```

Use this pattern for each endpoint:

```ts
const ${ARGUMENTS}ApiConfig = {
	endpointName: endpoint<TRequest, TResponse>({
		url: () => `/api/${ARGUMENTS}`,
		method: getData,  // or postData, patchData, deleteData
		defaultErrorMessage: 'Failed to ...',
	}),
}

export default ${ARGUMENTS}ApiConfig
```

Rules:
- `endpoint<void, T>` + `getData`/`deleteData` — GET/DELETE, no body
- `endpoint<TBody, T>` + `postData`/`putData`/`patchData` — POST/PUT/PATCH, body required
- Path params via `url: ({ id }) => \`/api/${ARGUMENTS}/${id}\``
- Endpoints returning 204 should use `TResponse = null`

### 3. Wire up in services/index.ts

Read the current `services/index.ts` and add:

```ts
import ${ARGUMENTS}ApiConfig from './configs/$ARGUMENTS.config'

export const ${ARGUMENTS}Api = createApiMethods(${ARGUMENTS}ApiConfig)
```

If the project has auth interceptors already configured, apply them:

```ts
export const ${ARGUMENTS}Api = createApiMethods(${ARGUMENTS}ApiConfig, {
	interceptors: { beforeRequest: [withAuth] },
})
```

### 4. Verify

Run `npx tsc --noEmit --pretty` to verify types compile.

## Reference

- API layer docs: see "API Layer" section in `CLAUDE.md`
- Example config: `services/configs/example.config.ts`
- Core types: `services/api/types.ts`

## What to ask the user

If not enough context was provided, ask:
1. What endpoints are needed? (list, get by id, create, update, delete)
2. What fields does the resource have?
3. What is the base URL path? (e.g., `/api/posts`)
4. Does it need auth interceptors?
