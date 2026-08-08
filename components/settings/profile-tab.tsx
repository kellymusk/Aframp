'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Phone, MapPin, Camera, Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'

interface ProfileData {
  displayName: string
  username: string
  email: string
  phone: string
  bio: string
  location: string
  avatarUrl: string
}

export function ProfileTab() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [profile, setProfile] = useState<ProfileData>({
    displayName: 'Aframp User',
    username: 'aframp_user',
    email: 'user@aframp.com',
    phone: '+234 800 000 0000',
    bio: 'Crypto enthusiast building the future of African finance.',
    location: 'Lagos, Nigeria',
    avatarUrl: '',
  })

  const handleChange = (field: keyof ProfileData, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const initials = profile.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Avatar Section */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Profile Photo</CardTitle>
          <CardDescription>Update your profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
                <AvatarImage src={profile.avatarUrl} alt={profile.displayName} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                id="avatar-upload-btn"
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                aria-label="Upload profile photo"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{profile.displayName}</p>
              <p className="text-xs text-muted-foreground">@{profile.username}</p>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-display-name" className="flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                Display Name
              </Label>
              <Input
                id="profile-display-name"
                value={profile.displayName}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder="Your display name"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-username" className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground font-mono text-xs">@</span>
                Username
              </Label>
              <Input
                id="profile-username"
                value={profile.username}
                onChange={(e) => handleChange('username', e.target.value)}
                placeholder="username"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-email" className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                Email Address
              </Label>
              <Input
                id="profile-email"
                type="email"
                value={profile.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="your@email.com"
                className="bg-background/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-phone" className="flex items-center gap-2 text-sm">
                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                Phone Number
              </Label>
              <Input
                id="profile-phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+234 xxx xxx xxxx"
                className="bg-background/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-location" className="flex items-center gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
              Location
            </Label>
            <Input
              id="profile-location"
              value={profile.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="City, Country"
              className="bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-bio" className="text-sm">Bio</Label>
            <textarea
              id="profile-bio"
              value={profile.bio}
              onChange={(e) => handleChange('bio', e.target.value)}
              placeholder="Tell us a bit about yourself..."
              rows={3}
              maxLength={160}
              className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {profile.bio.length}/160 characters
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" size="sm" id="profile-cancel-btn">
              Cancel
            </Button>
            <Button
              id="profile-save-btn"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="min-w-[100px]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
