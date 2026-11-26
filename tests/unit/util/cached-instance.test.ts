import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import {
  cacheOnlyIf,
  createAxiosCachedInstance,
} from '../../../src/axios/cached-instance'

describe('Cached axios instance', () => {
  // replaces the network with a function, so that the cache interceptors run as in production
  const respondWith = (status: number, data: unknown) =>
    jest.fn(
      async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
        const response = { status, statusText: '', headers: {}, config, data }
        if (status >= 400) {
          throw new AxiosError(
            `Status ${status}`,
            undefined,
            config,
            undefined,
            response,
          )
        }
        return response
      },
    )

  it('should cache a matching response', async () => {
    const instance = createAxiosCachedInstance()
    const adapter = respondWith(200, { commit: { oid: 'abc' } })
    const config = {
      adapter,
      cache: cacheOnlyIf((response) => response.data.commit != null),
    }

    await instance.post('https://example.com', { q: 1 }, config)
    await instance.post('https://example.com', { q: 1 }, config)

    expect(adapter).toHaveBeenCalledTimes(1)
  })

  it('should not cache a response that does not match, so that a commit pushed later is found', async () => {
    const instance = createAxiosCachedInstance()
    const adapter = respondWith(200, { commit: null })
    const config = {
      adapter,
      cache: cacheOnlyIf((response) => response.data.commit != null),
    }

    await instance.post('https://example.com', { q: 1 }, config)
    await instance.post('https://example.com', { q: 1 }, config)

    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('should not cache a 404 response, as axios rejects it as an error', async () => {
    const instance = createAxiosCachedInstance()
    const adapter = respondWith(404, { message: 'Not Found' })

    await expect(
      instance.get('https://example.com', { adapter }),
    ).rejects.toBeDefined()
    await expect(
      instance.get('https://example.com', { adapter }),
    ).rejects.toBeDefined()

    expect(adapter).toHaveBeenCalledTimes(2)
  })
})
