'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Key,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  fetchApiKeys,
  createApiKey,
  revokeApiKey,
  type ApiKey,
  type CreateApiKeyResult,
} from '@/lib/business/api-keys'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function ApiKeysTab() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<CreateApiKeyResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const data = await fetchApiKeys()
    setKeys(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setCreating(true)
    setError('')
    try {
      const result = await createApiKey({ name: newKeyName.trim() })
      setCreatedKey(result)
      await load()
      setNewKeyName('')
    } catch {
      setError('Failed to create API key.')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    await revokeApiKey(id)
    await load()
  }

  const handleCopy = async (secret: string) => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
    }
  }

  const toggleSecret = (id: string) => {
    setShowSecrets((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              API Keys
            </CardTitle>
            <CardDescription>
              Create and manage API keys for programmatic access
            </CardDescription>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Key
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {keys.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No API keys yet</p>
                <p className="text-sm">Create your first API key to get started.</p>
              </div>
            ) : (
              keys.map((apiKey, i) => (
                <motion.div
                  key={apiKey.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <div className="flex items-center justify-between py-3 px-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Key className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {apiKey.name}
                          </p>
                          <Badge
                            variant={apiKey.status === 'active' ? 'default' : 'secondary'}
                          >
                            {apiKey.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {apiKey.maskedKey}
                          </code>
                          <span className="text-xs text-muted-foreground">
                            Created {formatDate(apiKey.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="h-8 w-8"
                        onClick={() => toggleSecret(apiKey.id)}
                        title={showSecrets[apiKey.id] ? 'Hide secret' : 'Show secret'}
                      >
                        {showSecrets[apiKey.id] ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      {apiKey.status === 'active' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently revoke &ldquo;{apiKey.name}&rdquo;. Any
                                services using this key will immediately lose access.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Key</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevoke(apiKey.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Revoke
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>
                  Copy this key now. You won&apos;t be able to see it again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Key Name</Label>
                  <p className="text-sm font-medium">{createdKey.key.name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Secret Key</Label>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs font-mono p-2.5 rounded-lg bg-muted border border-border break-all select-all">
                      {createdKey.rawSecret}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(createdKey.rawSecret)}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setCreatedKey(null)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Give your key a descriptive name so you can remember what it&apos;s for.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="key-name">Key Name</Label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Production, Staging, CLI tool"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreate(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} className="gap-2">
                    {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Key
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Usage notes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            Pass the key as a bearer token: <code className="text-xs bg-muted px-1 rounded">Authorization: Bearer &lt;key&gt;</code>
          </p>
          <p className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            Keys are rate-limited to 100 requests per minute per key
          </p>
          <p className="flex items-start gap-2">
            <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
            Revoking a key is permanent and immediate
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
