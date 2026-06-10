import { createApiMethods } from './api/create-api-methods'
import type { BeforeRequest } from './api/types'
import billingApiConfig from './configs/billing.config'

const withBackendUrl: BeforeRequest = (config) => ({
	...config,
	url: (pathParams) => {
		const path = config.url(pathParams)
		const backendUrl = process.env.BACKEND_URL ?? ''
		return `${backendUrl}${path}`
	},
})

export const billingServerApi = createApiMethods(billingApiConfig, {
	interceptors: {
		beforeRequest: [withBackendUrl],
	},
})

export type {
	BillingCatalog,
	CatalogPlan,
	CatalogProduct,
} from './configs/billing.config'
