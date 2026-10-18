import { useCallback, useEffect, useState } from 'react'

export interface Contact {
  id?: string
  name: string
  address: string
  avatar?: string
  createdAt?: string
}

export const CONTACTS_STORAGE_KEY = 'aframp_contacts'

/** Reads saved contacts from localStorage. Returns `[]` for missing or corrupt data. */
export function readContacts(): Contact[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(CONTACTS_STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as Contact[]
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Failed to load contacts:', error)
    return []
  }
}

export function writeContacts(contacts: Contact[]): void {
  try {
    localStorage.setItem(CONTACTS_STORAGE_KEY, JSON.stringify(contacts))
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
