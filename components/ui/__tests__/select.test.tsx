import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../select'

// jsdom doesn't implement these, and Radix's Select relies on them to open,
// scroll to, and highlight items.
beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {}
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
})

function renderAssetSelect(props: { onValueChange?: (value: string) => void; disabled?: boolean } = {}) {
  const onValueChange = props.onValueChange ?? jest.fn()
  render(
    <Select defaultValue="XLM" onValueChange={onValueChange} disabled={props.disabled}>
      <SelectTrigger aria-label="Asset">
        <SelectValue placeholder="Choose an asset" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="XLM">XLM</SelectItem>
        <SelectItem value="USDC">USDC</SelectItem>
        <SelectItem value="EURC">EURC</SelectItem>
      </SelectContent>
    </Select>
  )
  return onValueChange
}

describe('Select', () => {
  it('shows the selected value on the trigger', () => {
    renderAssetSelect()

    expect(screen.getByRole('combobox')).toHaveTextContent('XLM')
  })

  it('shows the placeholder when no value is selected', () => {
    render(
      <Select onValueChange={jest.fn()}>
        <SelectTrigger aria-label="Asset">
          <SelectValue placeholder="Choose an asset" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="XLM">XLM</SelectItem>
        </SelectContent>
      </Select>
    )

    expect(screen.getByText('Choose an asset')).toBeInTheDocument()
  })

  it('does not render the listbox until the trigger is opened', () => {
    renderAssetSelect()

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens and lists every option when the trigger is clicked', async () => {
    const user = userEvent.setup()
    renderAssetSelect()

    await user.click(screen.getByRole('combobox'))

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'XLM' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'USDC' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'EURC' })).toBeInTheDocument()
  })

  it('selects an option on click and reports the new value', async () => {
    const user = userEvent.setup()
    const onValueChange = renderAssetSelect()

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: 'USDC' }))

    expect(onValueChange).toHaveBeenCalledWith('USDC')
    expect(screen.getByRole('combobox')).toHaveTextContent('USDC')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('opens with the keyboard and selects the highlighted option with Enter', async () => {
    const user = userEvent.setup()
    const onValueChange = renderAssetSelect()

    screen.getByRole('combobox').focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    expect(onValueChange).toHaveBeenCalledWith('USDC')
  })

  it('closes without selecting when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onValueChange = renderAssetSelect()

    await user.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('does not open when disabled', async () => {
    const user = userEvent.setup()
    renderAssetSelect({ disabled: true })

    const trigger = screen.getByRole('combobox')
    expect(trigger).toBeDisabled()

    await user.click(trigger)

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
