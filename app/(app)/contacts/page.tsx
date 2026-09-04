'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Trash2, ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Contact {
  id: string
  name: string
  address: string
  createdAt: string
}

const STELLAR_ADDRESS_LENGTH = 56
const STORAGE_KEY = 'aframp_contacts'

function isValidStellarAddress(address: string): boolean {
  if (address.length !== STELLAR_ADDRESS_LENGTH) return false
  if (!address.startsWith('G')) return false
  return /^[A-Z0-9]{56}$/.test(address)
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [formState, setFormState] = useState({
    name: '',
    address: '',
    error: '',
    editingId: null as string | null,
  })

  // Load contacts from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Contact[]
        setContacts(parsed)
      }
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Save contacts to localStorage
  const saveContacts = (updatedContacts: Contact[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedContacts))
    } catch (error) {
      console.error('Failed to save contacts:', error)
    }
  }

  function validateForm(): string | null {
    if (!formState.name.trim()) return 'Name is required.'
    if (!formState.address) return 'Address is required.'
    if (!isValidStellarAddress(formState.address)) {
      return 'Address must be a valid 56-character Stellar address starting with G.'
    }

    // Check for duplicates (excluding current edit)
    const isDuplicate = contacts.some(
      (c) => c.address === formState.address && c.id !== formState.editingId
    )
    if (isDuplicate) return 'You already have a contact with this address.'

    return null
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const error = validateForm()

    if (error) {
      setFormState((prev) => ({ ...prev, error }))
      return
    }

    let updatedContacts: Contact[]

    if (formState.editingId) {
      updatedContacts = contacts.map((c) =>
        c.id === formState.editingId
          ? {
              ...c,
              name: formState.name,
              address: formState.address,
            }
          : c
      )
    } else {
      const newContact: Contact = {
        id: `${Date.now()}`,
        name: formState.name,
        address: formState.address,
        createdAt: new Date().toISOString(),
      }
      updatedContacts = [newContact, ...contacts]
    }

    saveContacts(updatedContacts)
    setContacts(updatedContacts)
    setFormState({ name: '', address: '', error: '', editingId: null })
  }

  function startEdit(contact: Contact) {
    setFormState({
      name: contact.name,
      address: contact.address,
      error: '',
      editingId: contact.id,
    })
  }

  function cancelEdit() {
    setFormState({ name: '', address: '', error: '', editingId: null })
  }

  function deleteContact(id: string) {
    const updatedContacts = contacts.filter((c) => c.id !== id)
    saveContacts(updatedContacts)
    setContacts(updatedContacts)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div>
      <header className="flex items-center gap-4">
        <Link href="/send" className="text-dim hover:text-bright transition-colors">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-dim mt-1 text-sm">Save and manage recipient addresses</p>
        </div>
      </header>

      <div className="mt-6 max-w-2xl space-y-6">
        {/* Form */}
        <div className="bg-panel border-hairline rounded-2xl border p-5">
          <h2 className="text-sm font-bold mb-4">
            {formState.editingId ? 'Edit contact' : 'Add new contact'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formState.error && (
              <Alert variant="destructive">
                <AlertDescription>{formState.error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Sister in London"
                value={formState.name}
                onChange={(e) =>
                  setFormState((prev) => ({ ...prev, name: e.target.value, error: '' }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Stellar address</Label>
              <Input
                id="address"
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={formState.address}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    address: e.target.value.toUpperCase(),
                    error: '',
                  }))
                }
              />
              {formState.address && !isValidStellarAddress(formState.address) && (
                <p className="text-xs text-red-500">Invalid Stellar address</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" className="flex-1">
                {formState.editingId ? 'Update' : 'Add contact'}
              </Button>
              {formState.editingId && (
                <Button type="button" size="sm" variant="secondary" onClick={cancelEdit}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Contacts list */}
        {contacts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-dim mb-4">No contacts yet. Add one to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-dim text-xs font-bold tracking-widest uppercase">
              Your contacts ({contacts.length})
            </h2>
            <div className="border-hairline divide-y rounded-lg border">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-panel p-4 flex items-start justify-between gap-4 hover:bg-raised transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white">{contact.name}</p>
                    <p className="text-dim text-xs font-mono break-all">{contact.address}</p>
                    <p className="text-dim text-xs mt-1">
                      Added {new Date(contact.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => startEdit(contact)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteContact(contact.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick send */}
        {contacts.length > 0 && (
          <div className="bg-panel border-hairline rounded-2xl border p-5">
            <h2 className="text-sm font-bold mb-4">Quick send</h2>
            <div className="space-y-2">
              {contacts.map((contact) => (
                <Link key={contact.id} href={`/send?to=${encodeURIComponent(contact.address)}`}>
                  <div className="bg-raised hover:bg-raised/80 p-3 rounded-lg cursor-pointer transition-colors">
                    <p className="font-medium text-sm">{contact.name}</p>
                    <p className="text-dim text-xs font-mono truncate">{contact.address}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
