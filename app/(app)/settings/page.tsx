'use client'

import { useState } from 'react'
import { useAuthenticatedSession } from '@/components/session-provider'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  const { token, signOut } = useAuthenticatedSession()
  const [destinationAddress, setDestinationAddress] = useState('')
  const [confirmationText, setConfirmationText] = useState('')
  const [isClosing, setIsClosing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValidStellarAddress = (address: string) => {
    return /^G[A-Z0-9]{55}$/.test(address)
  }

  const canProceed = 
    isValidStellarAddress(destinationAddress) && 
    confirmationText === 'CLOSE'

  const handleCloseAccount = async () => {
    if (!canProceed) return

    setIsClosing(true)
    setError(null)

    try {
      await api.closeMerchantAccount(token, destinationAddress)
      
      // Clear session and redirect to login
      signOut()
      window.location.href = '/login?closed=true'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close account')
      setIsClosing(false)
    }
  }

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your merchant account and preferences
        </p>
      </div>

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that permanently affect your merchant account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Close Merchant Account</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This will sweep all remaining balances to your specified Stellar address
                and permanently close your merchant account. This action cannot be undone.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destination">Destination Stellar Address</Label>
              <Input
                id="destination"
                placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
                className={
                  destinationAddress && !isValidStellarAddress(destinationAddress)
                    ? 'border-destructive'
                    : ''
                }
              />
              {destinationAddress && !isValidStellarAddress(destinationAddress) && (
                <p className="text-sm text-destructive">
                  Invalid Stellar address format
                </p>
              )}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  disabled={!isValidStellarAddress(destinationAddress)}
                >
                  Close Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4">
                      <p>
                        This action will:
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Sweep all remaining XLM and token balances to {destinationAddress}</li>
                        <li>Merge your Stellar merchant account</li>
                        <li>Permanently delete your merchant account data</li>
                        <li>Log you out immediately</li>
                      </ul>
                      <p className="font-semibold">
                        This action is irreversible and cannot be undone.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="confirm">
                          Type <span className="font-mono font-bold">CLOSE</span> to confirm
                        </Label>
                        <Input
                          id="confirm"
                          placeholder="Type CLOSE"
                          value={confirmationText}
                          onChange={(e) => setConfirmationText(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmationText('')}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCloseAccount}
                    disabled={!canProceed || isClosing}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isClosing ? 'Closing Account...' : 'Close Account Permanently'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
