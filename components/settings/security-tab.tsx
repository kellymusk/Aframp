'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

type TwoFAStep = 'overview' | 'setup' | 'verify' | 'backup'

export function SecurityTab() {
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [step, setStep] = useState<TwoFAStep>('overview')
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [copiedBackup, setCopiedBackup] = useState(false)

  // Simulated backup codes
  const backupCodes = [
    'A4K9-M2X7',
    'B8P3-R5W1',
    'C6L2-T9N4',
    'D1J8-V3Q6',
    'E7H5-Y0S2',
    'F3G4-U8K9',
  ]

  const handleEnable2FA = () => {
    setStep('setup')
  }

  const handleVerify2FA = async () => {
    setVerifying(true)
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setVerifying(false)
    if (verificationCode.length === 6) {
      setStep('backup')
    }
  }

  const handleComplete2FA = () => {
    setTwoFAEnabled(true)
    setStep('overview')
    setVerificationCode('')
  }

  const handleDisable2FA = () => {
    setTwoFAEnabled(false)
    setStep('overview')
  }

  const handleChangePassword = async () => {
    setChangingPassword(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setChangingPassword(false)
    setPasswordChanged(true)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPasswordChanged(false), 3000)
  }

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopiedBackup(true)
    setTimeout(() => setCopiedBackup(false), 2000)
  }

  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0
  const passwordStrong = newPassword.length >= 8

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* 2FA Section */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {twoFAEnabled ? (
                <div className="p-2 rounded-lg bg-green-500/10">
                  <ShieldCheck className="w-5 h-5 text-green-500" />
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <ShieldAlert className="w-5 h-5 text-amber-500" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">Two-Factor Authentication</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
            </div>
            <Badge
              id="2fa-status-badge"
              variant={twoFAEnabled ? 'default' : 'secondary'}
              className={
                twoFAEnabled
                  ? 'bg-green-500/10 text-green-500 border-green-500/20'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }
            >
              {twoFAEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {step === 'overview' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Two-factor authentication adds a second verification step when signing in,
                  protecting your account even if your password is compromised.
                </p>
              </div>
              {twoFAEnabled ? (
                <div className="flex items-center gap-3">
                  <Button
                    id="disable-2fa-btn"
                    variant="destructive"
                    size="sm"
                    onClick={handleDisable2FA}
                  >
                    Disable 2FA
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Last verified: 2 days ago
                  </p>
                </div>
              ) : (
                <Button id="enable-2fa-btn" size="sm" onClick={handleEnable2FA}>
                  <Smartphone className="w-4 h-4 mr-1" />
                  Enable 2FA
                </Button>
              )}
            </div>
          )}

          {step === 'setup' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
            >
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Step 1: Scan QR Code</h4>
                <p className="text-xs text-muted-foreground">
                  Scan this code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="flex justify-center py-4">
                  <div className="w-40 h-40 bg-white rounded-xl flex items-center justify-center border">
                    <div className="grid grid-cols-5 gap-1 p-4">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-4 h-4 rounded-sm ${
                            Math.random() > 0.4 ? 'bg-black' : 'bg-white'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                  <Key className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <code className="text-xs font-mono text-muted-foreground break-all">
                    JBSW Y3DP EHZ6 4DS7 KZAU Q5TE MJRG C3TF
                  </code>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Step 2: Enter Verification Code</h4>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app
                </p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Input
                      id="2fa-verification-code"
                      value={verificationCode}
                      onChange={(e) =>
                        setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                      }
                      placeholder="000000"
                      maxLength={6}
                      className="bg-background/50 font-mono text-center text-lg tracking-[0.5em]"
                    />
                  </div>
                  <Button
                    id="verify-2fa-btn"
                    onClick={handleVerify2FA}
                    disabled={verificationCode.length !== 6 || verifying}
                    size="sm"
                  >
                    {verifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('overview')}
                className="text-muted-foreground"
              >
                Cancel Setup
              </Button>
            </motion.div>
          )}

          {step === 'backup' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-5"
            >
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-500">Save Your Backup Codes</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Store these codes safely. You can use them to access your account if you lose
                    your authenticator device.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {backupCodes.map((code) => (
                  <div
                    key={code}
                    className="px-3 py-2 rounded-md bg-muted/50 text-center font-mono text-sm text-foreground"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyBackupCodes}
                  id="copy-backup-codes-btn"
                >
                  {copiedBackup ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedBackup ? 'Copied!' : 'Copy Codes'}
                </Button>
                <Button
                  id="complete-2fa-btn"
                  size="sm"
                  onClick={handleComplete2FA}
                >
                  <ShieldCheck className="w-4 h-4 mr-1" />
                  I&apos;ve Saved My Codes
                </Button>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-sm">
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="bg-background/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-sm">
                New Password
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="bg-background/50"
              />
              {newPassword.length > 0 && (
                <p
                  className={`text-xs ${passwordStrong ? 'text-green-500' : 'text-amber-500'}`}
                >
                  {passwordStrong ? '✓ Strong password' : '⚠ Min 8 characters required'}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-sm">
                Confirm Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-background/50"
              />
              {confirmPassword.length > 0 && (
                <p
                  className={`text-xs ${passwordsMatch ? 'text-green-500' : 'text-destructive'}`}
                >
                  {passwordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button
              id="change-password-btn"
              size="sm"
              onClick={handleChangePassword}
              disabled={
                !currentPassword || !passwordsMatch || !passwordStrong || changingPassword
              }
              className="min-w-[140px]"
            >
              {changingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : passwordChanged ? (
                <>
                  <Check className="w-4 h-4" />
                  Password Updated
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Active Sessions</CardTitle>
          <CardDescription>Manage your logged-in devices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              device: 'Chrome on Windows',
              location: 'Lagos, Nigeria',
              time: 'Active now',
              current: true,
            },
            {
              device: 'Safari on iPhone',
              location: 'Lagos, Nigeria',
              time: '2 hours ago',
              current: false,
            },
          ].map((session, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 px-3 rounded-lg bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    session.current ? 'bg-green-500 pulse-glow' : 'bg-muted-foreground'
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {session.device}
                    {session.current && (
                      <span className="text-xs text-green-500 ml-2">(This device)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.location} · {session.time}
                  </p>
                </div>
              </div>
              {!session.current && (
                <Button variant="ghost" size="sm" className="text-destructive text-xs h-7">
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  )
}
