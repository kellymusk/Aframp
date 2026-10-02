import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContactsPage from '../page'

const STORAGE_KEY = 'aframp_contacts'
const ADDRESS = 'G' + 'A'.repeat(55)
const OTHER = 'G' + 'B'.repeat(55)

function stored() {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
}

async function addContact(user: ReturnType<typeof userEvent.setup>, name: string, address: string) {
  await user.clear(screen.getByLabelText('Name'))
  if (name) await user.type(screen.getByLabelText('Name'), name)
  await user.clear(screen.getByLabelText('Stellar address'))
  if (address) await user.type(screen.getByLabelText('Stellar address'), address)
  await user.click(screen.getByRole('button', { name: /add contact|update/i }))
}

beforeEach(() => {
  window.localStorage.clear()
  jest.restoreAllMocks()
})

describe('ContactsPage', () => {
  it('starts empty', async () => {
    render(<ContactsPage />)
    expect(await screen.findByText(/no contacts yet/i)).toBeInTheDocument()
  })

  it('adds a contact and saves it', async () => {
    const user = userEvent.setup()
    render(<ContactsPage />)
    await screen.findByText(/no contacts yet/i)

    await addContact(user, 'Supplier', ADDRESS)

    expect(screen.getByText('Supplier', { selector: 'p.font-bold' })).toBeInTheDocument()
    expect(screen.getAllByText(ADDRESS).length).toBeGreaterThan(0)
    expect(stored()).toEqual([expect.objectContaining({ name: 'Supplier', address: ADDRESS })])
  })

  it('validates the name, the address format and duplicates', async () => {
    const user = userEvent.setup()
    render(<ContactsPage />)
    await screen.findByText(/no contacts yet/i)

    await addContact(user, '', ADDRESS)
    expect(screen.getByText('Name is required.')).toBeInTheDocument()

    await addContact(user, 'Supplier', '')
    expect(screen.getByText('Address is required.')).toBeInTheDocument()

    await addContact(user, 'Supplier', 'GSHORT')
    expect(screen.getByText(/valid 56-character Stellar address/)).toBeInTheDocument()

    await addContact(user, 'Supplier', ADDRESS)
    await addContact(user, 'Again', ADDRESS)
    expect(screen.getByText('You already have a contact with this address.')).toBeInTheDocument()
  })

  it('loads saved contacts, edits one and cancels an edit', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: '1', name: 'Supplier', address: ADDRESS, createdAt: '2026-10-02T09:00:00Z' },
      ])
    )
    const user = userEvent.setup()
    render(<ContactsPage />)
    expect(await screen.findByText('Supplier', { selector: 'p.font-bold' })).toBeInTheDocument()
    expect(screen.getByText(/Added 2 Oct 2026/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByLabelText('Name')).toHaveValue('Supplier')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByLabelText('Name')).toHaveValue('')

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await addContact(user, 'Main supplier', OTHER)
    expect(screen.getByText('Main supplier', { selector: 'p.font-bold' })).toBeInTheDocument()
    expect(stored()[0]).toEqual(expect.objectContaining({ name: 'Main supplier', address: OTHER }))
  })

  it('asks before deleting a contact', async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { id: '1', name: 'Supplier', address: ADDRESS, createdAt: '2026-10-02T09:00:00Z' },
      ])
    )
    const confirm = jest
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
    const user = userEvent.setup()
    render(<ContactsPage />)
    const item = (await screen.findByText('Supplier', { selector: 'p.font-bold' })).closest(
      'div'
    )!.parentElement!

    await user.click(within(item).getByRole('button', { name: 'Delete Supplier' }))
    expect(confirm).toHaveBeenCalledWith('Delete Supplier from your contacts?')
    expect(screen.getByText('Supplier', { selector: 'p.font-bold' })).toBeInTheDocument()

    await user.click(within(item).getByRole('button', { name: 'Delete Supplier' }))
    expect(screen.queryByText('Supplier', { selector: 'p.font-bold' })).not.toBeInTheDocument()
    expect(stored()).toEqual([])
  })

  it('ignores corrupt saved data', async () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json')
    jest.spyOn(console, 'error').mockImplementation(() => {})
    render(<ContactsPage />)
    expect(await screen.findByText(/no contacts yet/i)).toBeInTheDocument()
  })
})
