'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Phone, Lock, ChevronRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export function SignupClient() {
  const router = useRouter()
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneNumber.length < 10) {
      toast.error('Please enter a valid phone number')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send verification code')
      }
      setStep('otp')
      toast.success('OTP sent to ' + phoneNumber)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length < 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed')
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('isVerified', 'true')
      }
      toast.success('Successfully verified!')
      router.push('/feature-highlights')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="p-8">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6"
            >
              {step === 'phone' ? (
                <Phone className="w-10 h-10 text-primary" />
              ) : (
                <Lock className="w-10 h-10 text-primary" />
              )}
            </motion.div>

            <h1 className="text-3xl font-bold mb-3">
              {step === 'phone' ? 'Get Started' : 'Verify Phone'}
            </h1>
            <p className="text-muted-foreground">
              {step === 'phone' 
                ? 'Enter your phone number to sign up or log in.' 
                : `Enter the 6-digit code sent to ${phoneNumber}`}
            </p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-4 h-12 text-lg"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full h-12 text-lg" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Continue'}
                {!isLoading && <ChevronRight className="ml-2 h-5 w-5" />}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <div className="relative">
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="h-14 text-center text-2xl tracking-widest font-mono"
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full h-12 text-lg" disabled={isLoading || otp.length < 6}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
                {!isLoading && <CheckCircle2 className="ml-2 h-5 w-5" />}
              </Button>
              <div className="text-center mt-4">
                <button 
                  type="button" 
                  onClick={() => setStep('phone')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Change phone number
                </button>
              </div>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
