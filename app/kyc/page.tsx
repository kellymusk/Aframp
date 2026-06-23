'use client'

import { useState } from 'react'
import { KycForm } from '@/components/kyc/kyc-form'
import { KycStatusDisplay } from '@/components/kyc/kyc-status'
import { useKyc } from '@/contexts/kyc-context'
import { Button } from '@/components/ui/button'

export default function KycPage() {
  const { kycStatus, isVerified, clearKyc } = useKyc()
  const [showForm, setShowForm] = useState(!isVerified)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg bg-white shadow-lg">
          <div className="border-b border-gray-200 px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Identity Verification
            </h1>
            <p className="mt-2 text-gray-600">
              Complete your KYC verification to unlock all features and increase your withdrawal limits.
            </p>
          </div>

          <div className="px-6 py-8">
            {isVerified && kycStatus === 'approved' ? (
              <div className="space-y-6">
                <KycStatusDisplay status="approved" />

                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <h3 className="font-semibold text-green-900">
                    🎉 Verification Complete!
                  </h3>
                  <p className="mt-2 text-sm text-green-700">
                    Your identity has been verified. You now have access to all features including:
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-green-700">
                    <li>✓ Unlimited withdrawals</li>
                    <li>✓ Higher transaction limits</li>
                    <li>✓ Priority support</li>
                    <li>✓ Advanced features</li>
                  </ul>
                </div>

                <Button
                  onClick={() => {
                    clearKyc()
                    setShowForm(true)
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Start Over
                </Button>
              </div>
            ) : showForm ? (
              <KycForm
                onComplete={() => {
                  setShowForm(false)
                }}
              />
            ) : (
              <div className="space-y-4 text-center">
                <KycStatusDisplay
                  status={kycStatus || 'pending'}
                  isPolling={kycStatus === 'pending'}
                />
                <Button
                  onClick={() => setShowForm(true)}
                  className="mx-auto bg-blue-600 hover:bg-blue-700"
                >
                  Back to Form
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="font-semibold text-gray-900">What We Need</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>✓ Valid government ID (front & back)</li>
              <li>✓ Clear selfie photo</li>
              <li>✓ Good lighting</li>
              <li>✓ 5-15 minutes</li>
            </ul>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="font-semibold text-gray-900">Your Privacy</h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-600">
              <li>✓ Encrypted transmission</li>
              <li>✓ Secure storage</li>
              <li>✓ Never shared</li>
              <li>✓ GDPR compliant</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
