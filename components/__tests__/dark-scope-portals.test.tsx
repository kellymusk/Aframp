import { render } from '@testing-library/react'
import { DarkScopeContext } from '@/components/dark-scope'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

describe('dark-scoped Radix portals', () => {
  it('mounts dialog, alert dialog, and tooltip content inside the dark scope', () => {
    const darkScope = document.createElement('div')
    document.body.appendChild(darkScope)

    const { unmount } = render(
      <DarkScopeContext.Provider value={darkScope}>
        <Dialog open>
          <DialogContent aria-label="Dialog content">Dialog</DialogContent>
        </Dialog>
        <AlertDialog open>
          <AlertDialogContent>
            <AlertDialogTitle>Alert dialog content</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialog>
        <TooltipProvider>
          <Tooltip open>
            <TooltipTrigger>Tooltip trigger</TooltipTrigger>
            <TooltipContent>Tooltip content</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DarkScopeContext.Provider>
    )

    expect(darkScope.querySelector('[role="dialog"]')).toBeInTheDocument()
    expect(darkScope.querySelector('[role="alertdialog"]')).toBeInTheDocument()
    expect(darkScope.querySelector('[role="tooltip"]')).toBeInTheDocument()

    unmount()
    darkScope.remove()
  })
})
