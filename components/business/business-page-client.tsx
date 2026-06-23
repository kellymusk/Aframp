'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Users, Key, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/dashboard/dashboard-layout'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { TeamTab } from '@/components/business/team-tab'
import { ApiKeysTab } from '@/components/business/api-keys-tab'

const tabs = [
  { value: 'team', label: 'Team Invites', icon: Users },
  { value: 'api-keys', label: 'API Keys', icon: Key },
] as const

export function BusinessPageClient() {
  const [activeTab, setActiveTab] = useState('team')

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon-sm" className="rounded-full">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Business</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your team and API integrations
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="team">
            <TeamTab />
          </TabsContent>

          <TabsContent value="api-keys">
            <ApiKeysTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
