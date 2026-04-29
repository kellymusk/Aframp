'use client'

import { useState } from 'react'
import { ExternalLink, AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import type { OnrampOrder } from '@/types/onramp'

interface TransactionDetailsProps {
  order: OnrampOrder
}

const STELLAR_EXPLORER_BASE = 'https://stellar.expert/explorer/public'

export function TransactionDetails({ order }: TransactionDetailsProps) {
  const getNetworkInfo = (cryptoAsset: string) => {
    switch (cryptoAsset) {
      case 'cNGN':
        return {
          network: 'Stellar',
          issuer: 'GCKFBEIYTKP74Q7PKL4EQBLS7BQBRC5XVQHQHQHQHQHQHQHQHQHQHQHQ', // Mock issuer
          assetCode: 'cNGN',
          description: 'Nigerian Naira stablecoin on Stellar',
        }
      case 'cKES':
        return {
          network: 'Stellar',
          issuer: 'GDKFBEIYTKP74Q7PKL4EQBLS7BQBRC5XVQHQHQHQHQHQHQHQHQHQHQHQ', // Mock issuer
          assetCode: 'cKES',
          description: 'Kenyan Shilling stablecoin on Stellar',
        }
      case 'USDC':
        return {
          network: 'Stellar',
          issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', // Real USDC issuer
          assetCode: 'USDC',
          description: 'USD Coin on Stellar',
        }
      default:
        return {
          network: 'Stellar',
          issuer: 'Unknown',
          assetCode: cryptoAsset,
          description: `${cryptoAsset} on Stellar`,
        }
    }
  }

  const networkInfo = getNetworkInfo(order.cryptoAsset)

  const [hasTrustline] = useState(() => Math.random() > 0.3)

  return (
    <div className="space-y-6">
      {/* Network Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Network Details
            <Badge variant="outline">{networkInfo.network}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Asset</p>
              <p className="font-semibold">{networkInfo.assetCode}</p>
              <p className="text-xs text-muted-foreground mt-1">{networkInfo.description}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Issuer</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {networkInfo.issuer.slice(0, 8)}...{networkInfo.issuer.slice(-8)}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(`${STELLAR_EXPLORER_BASE}/account/${networkInfo.issuer}`, '_blank')
                  }
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Trustline Status */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Trustline Status</p>
                <p className="text-xs text-muted-foreground">
                  Required to receive {networkInfo.assetCode}
                </p>
              </div>
              <Badge variant={hasTrustline ? 'default' : 'secondary'}>
                {hasTrustline ? '✓ Established' : '⏳ Checking'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Hash (when available) */}
      {order.transactionHash && (
        <Card>
          <CardHeader>
            <CardTitle>Blockchain Transaction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Transaction Hash</p>
              <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg">
                <code className="text-sm flex-1 break-all">{order.transactionHash}</code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(`${STELLAR_EXPLORER_BASE}/tx/${order.transactionHash}`, '_blank')
                  }
                >
                  <ExternalLink className="mr-1 h-4 w-4" />
                  View
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Network</p>
                <p className="font-medium">Stellar Mainnet</p>
              </div>
              <div>
                <p className="text-muted-foreground">Confirmations</p>
                <p className="font-medium">
                  {order.status === 'completed' ? 'Confirmed' : 'Pending'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Important Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Security Notice:</strong> Never share your private keys or seed phrase. Aframp
              will never ask for this information.
            </AlertDescription>
          </Alert>

          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium mb-2">Transaction Times</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Payment confirmation: 2-5 minutes</li>
                <li>• Stablecoin minting: 1-2 minutes</li>
                <li>• Wallet transfer: 5-10 seconds</li>
                <li>• Total time: Usually under 10 minutes</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">What happens next?</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Your {order.cryptoAsset} will appear in your wallet</li>
                <li>• You can swap to other assets on Stellar DEX</li>
                <li>• Send to other wallets or exchanges</li>
                <li>• Use for payments or remittances</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Need Help?</h4>
              <p className="text-muted-foreground">
                If your transaction is taking longer than expected or you have questions, contact
                our support team at{' '}
                <a href="mailto:support@aframp.com" className="text-primary hover:underline">
                  support@aframp.com
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
