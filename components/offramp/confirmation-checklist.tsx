import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'

interface ConfirmationChecklistProps {
  onConfirm: () => void
  onEdit: () => void
  bankName: string
  accountNumber: string
  isValid: boolean
  setIsValid: (valid: boolean) => void
  checkedItems: {
    bankDetails: boolean
    fees: boolean
    address: boolean
    memo: boolean
  }
  setCheckedItems: React.Dispatch<
    React.SetStateAction<{
      bankDetails: boolean
      fees: boolean
      address: boolean
      memo: boolean
    }>
  >
  isSubmitting?: boolean
}

export function ConfirmationChecklist({
  onConfirm,
  onEdit,
  bankName,
  accountNumber,
  isValid,
  setIsValid,
  checkedItems,
  setCheckedItems,
  isSubmitting = false,
}: ConfirmationChecklistProps) {
  const handleCheck = (key: keyof typeof checkedItems) => {
    const newChecked = { ...checkedItems, [key]: !checkedItems[key] }
    setCheckedItems(newChecked)

    // Check if all are true
    const allChecked = Object.values(newChecked).every(Boolean)
    setIsValid(allChecked)
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <div className="h-6 w-1 bg-primary rounded-full" />
        <h3 className="text-lg font-black tracking-tight uppercase tracking-widest text-[12px]">
          Safety Verification
        </h3>
      </div>

      <div className="space-y-5 bg-card border border-border/50 p-8 rounded-[2rem] shadow-2xl transition-all duration-300">
        <div className="flex items-start space-x-4 group">
          <Checkbox
            id="check-bank"
            checked={checkedItems.bankDetails}
            onCheckedChange={() => handleCheck('bankDetails')}
            className="mt-1 h-5 w-5 rounded-lg border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-300"
          />
          <Label
            htmlFor="check-bank"
            className="text-xs font-bold py-1 leading-relaxed cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wide opacity-80 group-hover:opacity-100"
          >
            I&apos;ve verified my bank account details ({bankName} - {accountNumber})
          </Label>
        </div>

        <div className="flex items-start space-x-4 group">
          <Checkbox
            id="check-fees"
            checked={checkedItems.fees}
            onCheckedChange={() => handleCheck('fees')}
            className="mt-1 h-5 w-5 rounded-lg border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-300"
          />
          <Label
            htmlFor="check-fees"
            className="text-xs font-bold py-1 leading-relaxed cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wide opacity-80 group-hover:opacity-100"
          >
            I understand that fees will be deducted from the total amount
          </Label>
        </div>

        <div className="flex items-start space-x-4 group">
          <Checkbox
            id="check-address"
            checked={checkedItems.address}
            onCheckedChange={() => handleCheck('address')}
            className="mt-1 h-5 w-5 rounded-lg border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all duration-300"
          />
          <Label
            htmlFor="check-address"
            className="text-xs font-bold py-1 leading-relaxed cursor-pointer text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-wide opacity-80 group-hover:opacity-100"
          >
            I&apos;ll send the EXACT crypto amount to the address shown above
          </Label>
        </div>

        <div className="pt-4 border-t border-border/30">
          <div className="flex items-start space-x-4 group">
            <Checkbox
              id="check-memo"
              checked={checkedItems.memo}
              onCheckedChange={() => handleCheck('memo')}
              className="mt-1 h-5 w-5 rounded-lg border-destructive/30 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive transition-all duration-300"
            />
            <Label
              htmlFor="check-memo"
              className="text-xs font-black py-1 leading-relaxed cursor-pointer text-destructive/70 group-hover:text-destructive transition-colors uppercase tracking-widest underline decoration-destructive/30 underline-offset-4"
            >
              I&apos;ll include the REQUIRED memo in my transaction
            </Label>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 pt-4">
        <Button
          className="w-full h-16 text-sm font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all rounded-[1.5rem] bg-primary text-primary-foreground group"
          size="lg"
          disabled={!isValid || isSubmitting}
          onClick={onConfirm}
        >
          Confirm & Send Crypto
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>

        <Button
          variant="ghost"
          className="w-full h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-xl hover:bg-transparent"
          onClick={onEdit}
        >
          <ArrowRight className="mr-2 h-3 w-3 rotate-180" />
          Edit Details
        </Button>
      </div>
    </div>
  )
}
