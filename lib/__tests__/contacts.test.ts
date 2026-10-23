import { act, renderHook } from '@testing-library/react'
import {
  CONTACTS_STORAGE_KEY,
  readContacts,
  upsertContact,
  useContacts,
  writeContacts,
} from '../contacts'

const ADDRESS = 'GBSN2ZJBRFWTQHWRJQE4GKDJJDSGPVTLQNQCQX7QR5W5VKHNHQHA'

beforeEach(() => {
  localStorage.clear()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

describe('readContacts / writeContacts', () => {
  it('round-trips contacts through localStorage', () => {
    writeContacts([{ id: '1', name: 'Ada', address: ADDRESS }])
    expect(readContacts()).toEqual([{ id: '1', name: 'Ada', address: ADDRESS }])
  })

  it('returns [] for missing, corrupt or non-array data', () => {
    expect(readContacts()).toEqual([])
    localStorage.setItem(CONTACTS_STORAGE_KEY, '{not json')
    expect(readContacts()).toEqual([])
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify({ name: 'x' }))
    expect(readContacts()).toEqual([])
  })

  it('swallows storage write failures', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => writeContacts([])).not.toThrow()
    expect(console.error).toHaveBeenCalled()
  })
})

describe('upsertContact', () => {
  it('adds a new contact with a shortened address as its default name', () => {
    upsertContact({ address: ADDRESS })
    const [saved] = readContacts()
    expect(saved).toMatchObject({ address: ADDRESS, name: 'GBSN2Z...HQHA' })
    expect(saved.id).toBeTruthy()
    expect(saved.createdAt).toBeTruthy()
  })

  it('refreshes an existing contact and moves it to the front', () => {
    writeContacts([
      { id: 'other', name: 'Other', address: 'GOTHER' },
      { id: 'ada', name: 'Ada', address: ADDRESS, createdAt: '2026-01-01T00:00:00Z' },
    ])
    upsertContact({ address: ADDRESS, name: 'Ada Okafor' })
    const [first, second] = readContacts()
    expect(first).toMatchObject({
      id: 'ada',
      name: 'Ada Okafor',
      createdAt: '2026-01-01T00:00:00Z',
    })
    expect(second.id).toBe('other')
  })
})

describe('useContacts', () => {
  it('loads, saves and deletes contacts', () => {
    writeContacts([{ id: 'a', name: 'A', address: 'GA' }])
    const { result } = renderHook(() => useContacts())

    expect(result.current.loading).toBe(false)
    expect(result.current.contacts).toHaveLength(1)

    act(() =>
      result.current.saveContacts([
        { id: 'a', name: 'A', address: 'GA' },
        { id: 'b', name: 'B', address: 'GB' },
      ])
    )
    expect(readContacts()).toHaveLength(2)

    act(() => result.current.deleteContact('a'))
    expect(result.current.contacts.map((c) => c.id)).toEqual(['b'])
    expect(readContacts().map((c) => c.id)).toEqual(['b'])
  })
})
