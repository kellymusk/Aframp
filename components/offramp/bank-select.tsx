'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bank, NIGERIAN_BANKS } from '@/lib/offramp/bank-service'

interface BankSelectProps {
  value?: string
  onSelect: (bank: Bank) => void
  disabled?: boolean
}

export function BankSelect({ value, onSelect, disabled }: BankSelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedBank = NIGERIAN_BANKS.find((bank) => bank.code === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-14 px-4 bg-background border-border hover:bg-accent/50 text-foreground rounded-xl transition-all duration-200"
          disabled={disabled}
        >
          {selectedBank ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-6 w-6 border border-border">
                <AvatarImage src={selectedBank.logo} alt={selectedBank.name} />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {selectedBank.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{selectedBank.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Select a bank...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl border-border bg-popover shadow-xl"
        align="start"
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search bank..."
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden p-1">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              No bank found.
            </CommandEmpty>
            <CommandGroup>
              {NIGERIAN_BANKS.map((bank) => (
                <CommandItem
                  key={bank.id}
                  value={bank.name}
                  onSelect={() => {
                    onSelect(bank)
                    setOpen(false)
                  }}
                  className="flex items-center gap-3 px-3 py-3 cursor-pointer rounded-lg hover:bg-accent transition-colors"
                >
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarImage src={bank.logo} alt={bank.name} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {bank.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{bank.name}</span>
                    <span className="text-xs text-muted-foreground">Nigeria</span>
                  </div>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4 text-primary',
                      value === bank.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
