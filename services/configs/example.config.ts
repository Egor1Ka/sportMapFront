import { getData, postData } from '@/services/api/methods'
import { endpoint } from '@/services/api/types'

interface ExampleItem {
	id: string
	title: string
}

interface CreateExampleBody {
	title: string
}

const exampleApiConfig = {
	getAll: endpoint<void, ExampleItem[]>({
		url: () => `/api/examples`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch examples',
	}),

	getById: endpoint<void, ExampleItem>({
		url: ({ id }) => `/api/examples/${id}`,
		method: getData,
		defaultErrorMessage: 'Failed to fetch example',
	}),

	create: endpoint<CreateExampleBody, ExampleItem>({
		url: () => `/api/examples`,
		method: postData,
		defaultErrorMessage: 'Failed to create example',
	}),
}

export default exampleApiConfig
export type { ExampleItem, CreateExampleBody }
