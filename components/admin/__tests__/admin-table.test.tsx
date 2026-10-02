import { fireEvent, render, screen } from '@testing-library/react'
import { AdminTable } from '../admin-table'

interface Row {
  id: string
  name: string
}

const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({ id: `r${i}`, name: `Merchant ${i}` }))

function renderTable(props: Partial<React.ComponentProps<typeof AdminTable<Row>>> = {}) {
  return render(
    <AdminTable<Row>
      rows={rows}
      error={null}
      onRetry={jest.fn()}
      getRowKey={(row) => row.id}
      emptyMessage="No rows yet."
      columns={[{ header: 'Name', render: (row) => row.name }]}
      searchText={(row) => row.name}
      searchPlaceholder="Search merchants"
      {...props}
    />
  )
}

describe('AdminTable', () => {
  it('shows the first page and loads more on request', () => {
    renderTable()
    expect(screen.getAllByRole('row')).toHaveLength(26) // header + 25
    expect(screen.getByText('30 rows')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show more (5 left)' }))
    expect(screen.getAllByRole('row')).toHaveLength(31)
    expect(screen.queryByRole('button', { name: /show more/i })).not.toBeInTheDocument()
  })

  it('filters rows by the search text, case-insensitively', () => {
    renderTable()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search merchants' }), {
      target: { value: 'merchant 2' },
    })

    // "Merchant 2" and "Merchant 20".."Merchant 29"
    expect(screen.getByText('11 of 30 rows')).toBeInTheDocument()
    expect(screen.getByText('Merchant 2')).toBeInTheDocument()
    expect(screen.queryByText('Merchant 3')).not.toBeInTheDocument()
  })

  it('says when nothing matches', () => {
    renderTable()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })
    expect(screen.getByText('No rows match “zzz”.')).toBeInTheDocument()
  })

  it('hides the search box when no searchText is given', () => {
    renderTable({ searchText: undefined })
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('shows the empty message when there are no rows at all', () => {
    renderTable({ rows: [] })
    expect(screen.getByText('No rows yet.')).toBeInTheDocument()
  })
})
