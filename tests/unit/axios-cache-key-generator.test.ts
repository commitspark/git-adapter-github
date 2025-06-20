import { axiosCacheKeyGenerator } from '../../src/axios-cache-key-generator'
import { CacheRequestConfig } from 'axios-cache-interceptor'

describe('axiosCacheKeyGenerator', () => {
  const query = 'query {}'
  const authorizationHeader = 'Bearer abc123'
  const authorizedRequest: CacheRequestConfig = {
    method: 'post',
    url: 'https://example.com',
    data: query,
    headers: {
      authorization: authorizationHeader,
    },
  }

  it('should include method, url, query in key to distinguish requests', async () => {
    expect(axiosCacheKeyGenerator(authorizedRequest)).toMatchObject({
      method: 'post',
      url: 'https://example.com',
      data: query,
    })
  })

  it('should not include user in key when authorization header is missing', async () => {
    const unauthorizedRequest = { ...authorizedRequest }
    delete unauthorizedRequest['headers']

    expect(axiosCacheKeyGenerator(unauthorizedRequest)).not.toHaveProperty(
      'user',
    )
  })

  it('should include user in key even when authorization header is empty', async () => {
    const unauthorizedRequest = { ...authorizedRequest }
    unauthorizedRequest['headers'] = { authorization: '' }

    expect(axiosCacheKeyGenerator(unauthorizedRequest)).toMatchObject({
      user: '',
    })
  })

  it('should include user in key when authorization header is present', async () => {
    expect(axiosCacheKeyGenerator(authorizedRequest)).toMatchObject({
      user: authorizationHeader,
    })
  })
})
