import { request } from './request'
import type {
	Interceptors,
	MethodParams,
	MethodParamsWithBody,
	UrlFunction,
} from './types'

type GetParams = MethodParams & { url: UrlFunction }
type PostParams = MethodParamsWithBody<unknown> & { url: UrlFunction }

function getData<T>(params: GetParams, globalInterceptors?: Interceptors) {
	return request<T>({ method: 'GET', ...params }, globalInterceptors)
}

function postData<T>(params: PostParams, globalInterceptors?: Interceptors) {
	return request<T>({ method: 'POST', ...params }, globalInterceptors)
}

function putData<T>(params: PostParams, globalInterceptors?: Interceptors) {
	return request<T>({ method: 'PUT', ...params }, globalInterceptors)
}

function patchData<T>(params: PostParams, globalInterceptors?: Interceptors) {
	return request<T>({ method: 'PATCH', ...params }, globalInterceptors)
}

function deleteData<T>(params: GetParams, globalInterceptors?: Interceptors) {
	return request<T>({ method: 'DELETE', ...params }, globalInterceptors)
}

export { getData, postData, putData, patchData, deleteData }
