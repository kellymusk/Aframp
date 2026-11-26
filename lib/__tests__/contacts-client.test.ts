import { contactsApi } from '@/lib/api/contacts'
import { ApiError } from '@/lib/api/shared'

const fetchMock = jest.fn()
const originalFetch = globalThis.fetch

beforeEach(() => {
  fetchMock.mockReset()
  globalThis.fetch = fetchMock as unknown as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('saved contacts client', () => {
  it('sends the bearer token on every call and JSON only when there is a body', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json({})))
    await contactsApi.listSavedContacts('tok-1')
    await contactsApi.createSavedContact('tok-1', { name: 'Ada', address: 'GDEST' })

    const [list, create] = fetchMock.mock.calls.map(([, init]) => init.headers)
    expect(list).toEqual({ Authorization: 'Bearer tok-1' })
    expect(create).toEqual({ Authorization: 'Bearer tok-1', 'Content-Type': 'application/json' })
  })

  it('updates with only the fields it is given', async () => {
    fetchMock.mockResolvedValue(json({}))

    await contactsApi.updateSavedContact('tok-1', 'c-1', { address: 'GNEW' })

    expect(fetchMock.mock.calls[0][1].body).toBe('{"address":"GNEW"}')
  })

  it('resolves a delete that answers 204 with no body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(contactsApi.deleteSavedContact('tok-1', 'c-1')).resolves.toBeUndefined()
  })

  it('surfaces a field-level validation error from the server', async () => {
    fetchMock.mockResolvedValue(
      json({ error: 'Address is not valid', code: 'INVALID_ADDRESS', field: 'address' }, 422)
    )

    const error = await contactsApi
      .createSavedContact('tok-1', { name: 'Ada', address: 'nope' })
      .catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      message: 'Address is not valid',
      status: 422,
      code: 'INVALID_ADDRESS',
      field: 'address',
    })
  })

  it('does not show a server error message verbatim', async () => {
    fetchMock.mockResolvedValue(json({ error: 'pq: relation "contacts" does not exist' }, 500))

    const error = await contactsApi.listSavedContacts('tok-1').catch((cause: unknown) => cause)

    expect(error).toMatchObject({ status: 500 })
    expect((error as ApiError).message).not.toContain('pq:')
  })
})
