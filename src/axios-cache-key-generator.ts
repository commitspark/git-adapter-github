import { CacheRequestConfig } from 'axios-cache-interceptor'

const axiosCacheKeyGenerator = <R = unknown, D = unknown>(
  request: CacheRequestConfig<R, D>,
) => {
  const authorization = request.headers?.authorization
  const key: Record<string, string | undefined | D> = {
    method: request.method,
    url: request.url,
    data: request.data, // this is where GraphQL queries differ
  }

  if (authorization !== undefined) {
    // key object will be hashed by axios-cache-interceptor therefore we won't leak keys into cache storage
    // see https://axios-cache-interceptor.js.org/guide/request-id#custom-generator
    key['user'] = authorization
  }

  return key
}

export { axiosCacheKeyGenerator }
