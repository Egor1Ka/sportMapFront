import { getData, postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'
import type { ApiResponse } from './user.config'

interface Plan {
	key: string
	features: { dashboard: boolean; export: boolean; apiAccess: boolean }
	limits: { projects: number; storage: number }
	products: string[]
}

interface BillingSubscription {
	id: string
	userId: string
	providerSubscriptionId: string
	providerCustomerId: string
	productId: string
	planKey: string
	status: string
	currentPeriodStart: string
	currentPeriodEnd: string
	cancelAt: string | null
	createdAt: string
	updatedAt: string
}

interface BillingPayment {
	id: string
	userId: string | null
	providerSubscriptionId: string
	providerEventId: string
	productId: string
	type: 'subscription' | 'one_time'
	eventType: string
	amount: number
	currency: string
	createdAt: string
	updatedAt: string
}

interface BillingOrder {
	id: string
	userId: string
	providerOrderId: string
	productKey: string
	providerProductId: string
	amount: number
	currency: string
	createdAt: string
	updatedAt: string
}

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

const billingApiConfig = {
	plan: endpoint<void, ApiResponse<Plan>>({
		url: () => `/api/billing/plan`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch plan',
	}),

	subscription: endpoint<void, ApiResponse<BillingSubscription | null>>({
		url: () => `/api/billing/subscription`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch subscription',
	}),

	payments: endpoint<void, ApiResponse<BillingPayment[]>>({
		url: () => `/api/billing/payments`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch payments',
	}),

	orders: endpoint<void, ApiResponse<BillingOrder[]>>({
		url: () => `/api/billing/orders`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch orders',
	}),

	cancel: endpoint<void, ApiResponse<BillingSubscription>>({
		url: () => `/api/billing/cancel`,
		method: postData,
		defaultErrorMessage: 'Failed to cancel subscription',
	}),

	catalog: endpoint<void, ApiResponse<BillingCatalog>>({
		url: () => `/api/billing/catalog`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch billing catalog',
	}),
}

export default billingApiConfig
export type {
	Plan,
	BillingSubscription,
	BillingPayment,
	BillingOrder,
	BillingCatalog,
	CatalogPlan,
	CatalogProduct,
}
