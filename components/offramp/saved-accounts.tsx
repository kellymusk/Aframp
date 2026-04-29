'use client'

import * as React from 'react'
import { History, Plus, Trash2, Check, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  BankAccount,
  getSavedAccounts,
  deleteSavedAccount,
  NIGERIAN_BANKS,
} from '@/lib/offramp/bank-service'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SavedAccountsProps {
  onSelect: (account: BankAccount) => void
  onAddNew: () => void
}

export function SavedAccounts({ onSelect, onAddNew }: SavedAccountsProps) {
  const [accounts, setAccounts] = React.useState<BankAccount[]>([])
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    setAccounts(getSavedAccounts())
  }, [])

  const handleDelete = (id: string) => {
    deleteSavedAccount(id)
    setAccounts(getSavedAccounts())
    setDeletingId(null)
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-border bg-accent/10 space-y-4">
        <div className="p-3 bg-primary/10 rounded-full">
          <Banknote className="h-6 w-6 text-primary/60" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">No saved accounts</p>
          <p className="text-[11px] text-muted-foreground">Add a new account to get started</p>
        </div>
        <Button
          onClick={onAddNew}
          variant="outline"
          size="sm"
          className="rounded-lg h-9 bg-background border-border hover:bg-accent/50"
        >
          <Plus className="h-3.5 w-3.5 mr-2" />
          Add New Account
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Quick Select</h3>
        </div>
        <Button
          onClick={onAddNew}
          variant="ghost"
          size="sm"
          className="h-8 text-[11px] uppercase tracking-wider font-bold text-primary hover:text-primary/80 hover:bg-primary/5"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add New
        </Button>
      </div>

      <div className="grid gap-3">
        {accounts.map((account) => {
          const bank = NIGERIAN_BANKS.find((b) => b.code === account.bankCode)
          return (
            <div
              key={account.id}
              className="group relative flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer overflow-hidden"
              onClick={() => onSelect(account)}
            >
              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    setDeletingId(account.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <Avatar className="h-10 w-10 border border-border">
                <AvatarImage src={bank?.logo} alt={account.bankName} />
                <AvatarFallback className="bg-primary/5 text-primary text-xs">BN</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground truncate uppercase">
                    {account.accountName}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-medium">{account.bankName}</span>
                  <span className="opacity-30">•</span>
                  <span className="font-mono">{account.accountNumber}</span>
                </div>
              </div>

              <div className="flex flex-col items-end opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Saved Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This account will be removed from your saved list. You can always add it back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && handleDelete(deletingId)}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
