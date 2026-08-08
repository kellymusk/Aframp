'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, User, Bell, Shield, Wallet, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ProfileTab } from '@/components/settings/profile-tab'
import { NotificationsTab } from '@/components/settings/notifications-tab'
import { SecurityTab } from '@/components/settings/security-tab'
import { WalletsTab } from '@/components/settings/wallets-tab'

const tabs = [
  { value: 'profile', label: 'Profile', icon: User },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'wallets', label: 'Wallets', icon: Wallet },
] as const

interface SettingsPageClientProps {
  initialTab?: string
  walletAddress?: string
}

export function SettingsPageClient({ initialTab, walletAddress }: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState(initialTab || 'profile')

  return (
    <DashboardLayout walletAddress={walletAddress}>
      <div className="max-w-4xl mx-auto">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon-sm" className="rounded-full" id="back-to-dashboard-btn">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Settings className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your account preferences and security
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1.5 rounded-xl" id="settings-tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  id={`settings-tab-${tab.value}`}
                  className="flex-1 min-w-[100px] gap-2 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-md transition-all"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="profile" id="settings-content-profile">
            <ProfileTab />
          </TabsContent>

          <TabsContent value="notifications" id="settings-content-notifications">
            <NotificationsTab />
          </TabsContent>

          <TabsContent value="security" id="settings-content-security">
            <SecurityTab />
          </TabsContent>

          <TabsContent value="wallets" id="settings-content-wallets">
            <WalletsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
