'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  ChevronRight,
  KeyRound,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { generateMnemonic } from '@/lib/wallet/mnemonic'

const TOTAL_STEPS = 4
const CURRENT_STEP = 3

// Number of words the user must verify
const VERIFY_WORD_COUNT = 3

type Screen = 'show' | 'verify'

/**
 * Pick `count` unique random indices from [0, length)
 */
function pickRandomIndices(length: number, count: number): number[] {
  const indices = Array.from({ length }, (_, i) => i)
  // Fisher-Yates shuffle then slice
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices.slice(0, count).sort((a, b) => a - b)
}

export function WalletSetupClient() {
  const router = useRouter()
  const [mnemonic] = useState<string[]>(() => generateMnemonic())
  const [screen, setScreen] = useState<Screen>('show')

  // ── Show-phrase screen state ──────────────────────────────────────────────
  const [isRevealed, setIsRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [hasAcknowledged, setHasAcknowledged] = useState(false)
  const [skipWarningOpen, setSkipWarningOpen] = useState(false)

  // ── Verify screen state ───────────────────────────────────────────────────
  /** The 3 word positions the user must confirm (0-based) */
  const verifyIndices = useMemo(
    () => pickRandomIndices(mnemonic.length, VERIFY_WORD_COUNT),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mnemonic]
  )
  const [userInputs, setUserInputs] = useState<Record<number, string>>({})
  const [verifyAttempted, setVerifyAttempted] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  // ── Computed ──────────────────────────────────────────────────────────────
  const progressPercentage = (CURRENT_STEP / TOTAL_STEPS) * 100

  // ── Show-phrase handlers ──────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!isRevealed) {
      toast.error('Please reveal the recovery phrase first')
      return
    }
    try {
      await navigator.clipboard.writeText(mnemonic.join(' '))
      setCopied(true)
      toast.success('Recovery phrase copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleContinueToVerify = () => {
    if (!hasAcknowledged) {
      setSkipWarningOpen(true)
      return
    }
    setScreen('verify')
  }

  const handleSkipConfirm = () => {
    setSkipWarningOpen(false)
    router.push('/dashboard')
  }

  // ── Verify handlers ───────────────────────────────────────────────────────
  const handleVerifyInput = (index: number, value: string) => {
    setUserInputs((prev) => ({ ...prev, [index]: value.toLowerCase().trim() }))
    // Clear error while typing
    if (verifyError) setVerifyError(null)
  }

  const handleVerifySubmit = () => {
    setVerifyAttempted(true)

    const wrong = verifyIndices.filter(
      (idx) => (userInputs[idx] ?? '').toLowerCase().trim() !== mnemonic[idx].toLowerCase()
    )

    if (wrong.length > 0) {
      const positions = wrong.map((i) => `#${i + 1}`).join(', ')
      setVerifyError(`Incorrect word(s) at position ${positions}. Please try again.`)
      return
    }

    // All correct
    toast.success('Recovery phrase verified!')
    router.push('/dashboard')
  }

  const handleBackToPhrase = () => {
    setScreen('show')
    setUserInputs({})
    setVerifyAttempted(false)
    setVerifyError(null)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isFieldCorrect = (idx: number) =>
    verifyAttempted && (userInputs[idx] ?? '').toLowerCase().trim() === mnemonic[idx].toLowerCase()

  const isFieldWrong = (idx: number) =>
    verifyAttempted && (userInputs[idx] ?? '').toLowerCase().trim() !== mnemonic[idx].toLowerCase()

  // ═══════════════════════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {CURRENT_STEP} of {TOTAL_STEPS}
            </span>
            <span className="text-sm font-medium text-primary">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <AnimatePresence mode="wait">
          {/* ── SCREEN 1: Show recovery phrase ────────────────────────────── */}
          {screen === 'show' && (
            <motion.div
              key="show"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-8 md:p-12">
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6 relative"
                  >
                    <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-glow" />
                    <Shield className="w-12 h-12 text-primary relative z-10" />
                  </motion.div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-3">Wallet Setup</h1>
                  <p className="text-lg text-muted-foreground">Secure Digital Wallet</p>
                  <p className="text-sm text-primary mt-2 font-medium">
                    Your security is our priority
                  </p>
                </div>

                {/* Instructions */}
                <div className="mb-6">
                  <p className="text-center text-muted-foreground">
                    Write down these 12 words in the correct order and keep them in a safe place.
                    You&apos;ll need them to recover your wallet.
                  </p>
                </div>

                {/* Recovery Phrase Display */}
                <div className="mb-6">
                  <div className="relative">
                    <div
                      className={cn(
                        'grid grid-cols-2 md:grid-cols-3 gap-3 p-6 rounded-xl border-2 transition-all',
                        isRevealed
                          ? 'bg-card border-primary/20'
                          : 'bg-muted/50 border-border blur-sm select-none'
                      )}
                    >
                      {mnemonic.map((word, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: isRevealed ? index * 0.05 : 0 }}
                          className="flex items-center gap-2 p-3 rounded-lg bg-background border"
                        >
                          <span className="text-xs font-mono text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <span className="font-mono font-medium">{word}</span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Reveal Overlay */}
                    {!isRevealed && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        <Button
                          size="lg"
                          onClick={() => setIsRevealed(true)}
                          className="shadow-lg"
                        >
                          <Eye className="mr-2 h-5 w-5" />
                          Reveal Recovery Phrase
                        </Button>
                      </motion.div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {isRevealed && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3 mt-4"
                    >
                      <Button
                        variant="outline"
                        onClick={() => setIsRevealed(false)}
                        className="flex-1"
                      >
                        <EyeOff className="mr-2 h-4 w-4" />
                        Hide
                      </Button>
                      <Button variant="outline" onClick={handleCopy} className="flex-1">
                        {copied ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </motion.div>
                  )}
                </div>

                {/* Security Warning */}
                <Alert className="mb-6 border-warning/50 bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <AlertDescription className="ml-2">
                    <strong className="text-warning">
                      Never share your recovery phrase with anyone.
                    </strong>{' '}
                    Aframp will never ask for this phrase. Anyone with these words can access your
                    funds.
                  </AlertDescription>
                </Alert>

                {/* Acknowledgment Checkbox */}
                <label className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors mb-6">
                  <input
                    type="checkbox"
                    checked={hasAcknowledged}
                    onChange={(e) => setHasAcknowledged(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-sm">
                    I understand that I am responsible for keeping my recovery phrase safe and
                    secure. I have written it down and stored it in a safe place.
                  </span>
                </label>

                {/* Continue Button */}
                <Button
                  size="lg"
                  onClick={handleContinueToVerify}
                  className="w-full"
                  disabled={!isRevealed}
                >
                  Continue to Verification
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </Card>
            </motion.div>
          )}

          {/* ── SCREEN 2: Verify recovery phrase ──────────────────────────── */}
          {screen === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="p-8 md:p-12">
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6"
                  >
                    <KeyRound className="w-12 h-12 text-primary" />
                  </motion.div>
                  <h1 className="text-3xl md:text-4xl font-bold mb-3">Verify Your Phrase</h1>
                  <p className="text-muted-foreground">
                    Enter the words at the positions below to confirm you&apos;ve written down your
                    recovery phrase.
                  </p>
                </div>

                {/* Word inputs */}
                <div className="space-y-4 mb-6">
                  {verifyIndices.map((wordIdx) => (
                    <div key={wordIdx} className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Word #{wordIdx + 1}
                      </label>
                      <div className="relative">
                        <Input
                          type="text"
                          placeholder={`Enter word #${wordIdx + 1}`}
                          value={userInputs[wordIdx] ?? ''}
                          onChange={(e) => handleVerifyInput(wordIdx, e.target.value)}
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          className={cn(
                            'pr-10 font-mono',
                            isFieldCorrect(wordIdx) &&
                              'border-green-500 focus-visible:ring-green-500',
                            isFieldWrong(wordIdx) && 'border-destructive focus-visible:ring-destructive'
                          )}
                        />
                        {isFieldCorrect(wordIdx) && (
                          <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                        )}
                        {isFieldWrong(wordIdx) && (
                          <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Error message */}
                <AnimatePresence>
                  {verifyError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <Alert className="mb-4 border-destructive/50 bg-destructive/10">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <AlertDescription className="ml-2 text-destructive">
                          {verifyError}
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={handleBackToPhrase}
                    className="sm:flex-1"
                  >
                    <ChevronRight className="mr-2 h-4 w-4 rotate-180" />
                    Back to Phrase
                  </Button>
                  <Button
                    size="lg"
                    onClick={handleVerifySubmit}
                    className="sm:flex-1"
                    disabled={verifyIndices.some((idx) => !userInputs[idx]?.trim())}
                  >
                    Confirm & Continue
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip Warning Dialog */}
        <Dialog open={skipWarningOpen} onOpenChange={setSkipWarningOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Warning: Recovery Phrase Not Saved
              </DialogTitle>
              <DialogDescription asChild>
                <div className="space-y-3 pt-4">
                  <p>
                    You haven&apos;t acknowledged that you&apos;ve saved your recovery phrase.
                    Without it, you won&apos;t be able to recover your wallet if you lose access.
                  </p>
                  <p className="font-medium text-foreground">
                    This action is irreversible. Are you sure you want to continue?
                  </p>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setSkipWarningOpen(false)}
                className="w-full sm:w-auto"
              >
                Go Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleSkipConfirm}
                className="w-full sm:w-auto"
              >
                Continue Anyway
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}
