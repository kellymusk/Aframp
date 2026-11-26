import { request, type UUID } from './shared'

/** A payee saved for a merchant on the server (replaces the `aframp_contacts` localStorage list). */
export interface SavedContact {
  id: UUID
  merchant_id: UUID
  name: string
  address: string
  /** When the payee address was last changed, so the UI can flag a swapped address. */
  address_changed_at: string
  created_at: string
  updated_at: string
}

export interface SavedContactInput {
  name: string
  address: string
}

export function listSavedContacts(token: string, signal?: AbortSignal): Promise<SavedContact[]> {
  return request<SavedContact[]>('/contacts', { token, signal })
}

export function createSavedContact(token: string, input: SavedContactInput): Promise<SavedContact> {
  return request<SavedContact>('/contacts', { method: 'POST', token, body: input })
}

export function updateSavedContact(
  token: string,
  id: UUID,
  input: Partial<SavedContactInput>
): Promise<SavedContact> {
  return request<SavedContact>(`/contacts/${id}`, { method: 'PUT', token, body: input })
}

export function deleteSavedContact(token: string, id: UUID): Promise<void> {
  return request<void>(`/contacts/${id}`, { method: 'DELETE', token })
}

export const contactsApi = {
  listSavedContacts,
  createSavedContact,
  updateSavedContact,
  deleteSavedContact,
}
