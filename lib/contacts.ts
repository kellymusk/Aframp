import { useCallback, useEffect, useState } from 'react'
import { getItem, setItem } from '@/lib/storage'

export interface Contact {
  id?: string
  name: string
  address: string
  avatar?: string
  createdAt?: string
}

export const CONTACTS_STORAGE_KEY = 'aframp_contacts'

function defaultContactName(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function isValidStoredContact(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const address = (value as Record<string, unknown>).address
  return typeof address === 'string' && address.trim().length > 0
}

/** Reads saved contacts from localStorage, dropping malformed entries. */
export function readContacts(): Contact[] {
  try {
    const stored = getItem(CONTACTS_STORAGE_KEY)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isValidStoredContact).map((entry) => {
      const address = entry.address as string
      const name = entry.name
      return {
        ...(typeof entry.id === 'string' ? { id: entry.id } : {}),
        name: typeof name === 'string' && name.trim() ? name : defaultContactName(address),
        address,
        ...(typeof entry.avatar === 'string' ? { avatar: entry.avatar } : {}),
        ...(typeof entry.createdAt === 'string' ? { createdAt: entry.createdAt } : {}),
      }
    })
  } catch (error) {
    console.error('Failed to load contacts:', error)
    return []
  }
}

export function writeContacts(contacts: Contact[]): void {
  try {
    setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts))
  } catch (error) {
    console.error('Failed to save contacts:', error)
  }
}

/**
 * Adds a contact, or refreshes the name/avatar of an existing one with the
 * same address and moves it to the front. Used after a send completes, when
 * there's no form to go through `useContacts().saveContacts`.
 */
export function upsertContact(contact: { address: string; name?: string; avatar?: string }): void {
  const contacts = readContacts()
  const existing = contacts.find((c) => c.address === contact.address)
  const updated: Contact = {
    id: existing?.id || `${Date.now()}`,
    name:
      contact.name ||
      existing?.name ||
      `${contact.address.slice(0, 6)}...${contact.address.slice(-4)}`,
    address: contact.address,
    avatar: contact.avatar || existing?.avatar,
    createdAt: existing?.createdAt || new Date().toISOString(),
  }
  writeContacts([updated, ...contacts.filter((c) => c.address !== contact.address)])
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setContacts(readContacts())
    setLoading(false)
  }, [])

  const saveContacts = useCallback((next: Contact[]) => {
    writeContacts(next)
    setContacts(next)
  }, [])

  const deleteContact = useCallback((id: string) => {
    setContacts((prev) => {
      const next = prev.filter((c) => c.id !== id)
      writeContacts(next)
      return next
    })
  }, [])

  return { contacts, loading, saveContacts, deleteContact }
}
