/**
 * useApi.ts - 统一 API 客户端 composable
 *
 * 封装 $fetch 调用，自动解包 {code, data} 信封
 * - code !== 0 时抛出业务错误
 * - 支持 GET/POST/PUT/DELETE
 * - SSR 用 runtimeConfig.apiBase，客户端用 runtimeConfig.public.apiBase
 * - 错误处理：网络错误友好提示，业务错误抛异常
 */

interface ApiResponse<T> {
  code: number
  data: T
  message?: string
}

export function useApi() {
  const config = useRuntimeConfig()
  const baseURL = import.meta.server
    ? (config.apiBase as string)
    : (config.public.apiBase as string)

  /**
   * 解包业务响应信封
   */
  async function unwrap<T>(response: ApiResponse<T>): Promise<T> {
    if (response.code !== 0) {
      throw createError({
        statusCode: 400,
        statusMessage: response.message || '请求失败',
        message: response.message || '请求失败',
      })
    }
    return response.data
  }

  /**
   * GET 请求
   */
  async function apiGet<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const data = await $fetch<ApiResponse<T>>(path, {
      baseURL,
      method: 'GET',
      params,
      onResponseError({ response }) {
        throw createError({
          statusCode: response.status,
          statusMessage: response._data?.message || `请求失败 (${response.status})`,
          message: response._data?.message || `请求失败 (${response.status})`,
        })
      },
    })
    return unwrap(data)
  }

  /**
   * POST 请求
   */
  async function apiPost<T>(
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const data = await $fetch<ApiResponse<T>>(path, {
      baseURL,
      method: 'POST',
      body,
      onResponseError({ response }) {
        throw createError({
          statusCode: response.status,
          statusMessage: response._data?.message || `请求失败 (${response.status})`,
          message: response._data?.message || `请求失败 (${response.status})`,
        })
      },
    })
    return unwrap(data)
  }

  /**
   * PUT 请求
   */
  async function apiPut<T>(
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const data = await $fetch<ApiResponse<T>>(path, {
      baseURL,
      method: 'PUT',
      body,
      onResponseError({ response }) {
        throw createError({
          statusCode: response.status,
          statusMessage: response._data?.message || `请求失败 (${response.status})`,
          message: response._data?.message || `请求失败 (${response.status})`,
        })
      },
    })
    return unwrap(data)
  }

  /**
   * DELETE 请求
   */
  async function apiDelete<T>(path: string): Promise<T> {
    const data = await $fetch<ApiResponse<T>>(path, {
      baseURL,
      method: 'DELETE',
      onResponseError({ response }) {
        throw createError({
          statusCode: response.status,
          statusMessage: response._data?.message || `请求失败 (${response.status})`,
          message: response._data?.message || `请求失败 (${response.status})`,
        })
      },
    })
    return unwrap(data)
  }

  return { apiGet, apiPost, apiPut, apiDelete }
}
