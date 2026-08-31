'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, KeyRound, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyStateIllustration } from '@/components/ui/empty-state-illustration'
import { api, ApiError, type ApiKey } from '@/lib/api'
import { useAuthenticatedSession } from '@/components/session-provider'

function formatWhen(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ApiKeysPage() {
  const { token } = useAuthenticatedSession()
  const [keys, setKeys] = useState<ApiKey[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyResult, setNewKeyResult] = useState<{ apiKey: ApiKey; fullKey: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null)

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const data = await api.listApiKeys(token, signal)
        setKeys(data)
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        if (cause instanceof ApiError && cause.status === 0) throw cause
        setError(cause instanceof Error ? cause.message : 'Could not load API keys')
      } finally {
        setLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function createKey(event: React.FormEvent) {
    event.preventDefault()
    const name = newKeyName.trim()
    if (!name) return

    setCreating(true)
    setError(null)
    try {
      const result = await api.createApiKey(token, name)
      setNewKeyResult({ apiKey: result.api_key, fullKey: result.full_key })
      setNewKeyName('')
      setCreateDialogOpen(false)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create API key')
    } finally {
      setCreating(false)
    }
  }

  async function copyFullKey() {
    if (!newKeyResult) return
    await navigator.clipboard.writeText(newKeyResult.fullKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openRevoke(key: ApiKey) {
    setRevokeTarget(key)
    setRevokeDialogOpen(true)
  }

  async function confirmRevoke() {
    if (!revokeTarget) return
    setRevokingId(revokeTarget.id)
    setError(null)
    try {
      await api.revokeApiKey(token, revokeTarget.id)
      setRevokeDialogOpen(false)
      setRevokeTarget(null)
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not revoke API key')
    } finally {
      setRevokingId(null)
    }
  }

  function dismissNewKey() {
    setNewKeyResult(null)
  }

  if (error && !keys) {
    return <ErrorState message={error} onRetry={() => void load()} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">API Keys</h2>
          <p className="text-dim text-sm">
            Manage keys for programmatic access to your merchant account.
          </p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" aria-hidden />
              New key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Give your key a name so you can tell it apart later. You will only see the full
                value once.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={createKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. Production server"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={creating || !newKeyName.trim()}
                >
                  {creating ? 'Creating…' : 'Create key'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {newKeyResult && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <KeyRound className="size-4 text-amber-400" aria-hidden />
          <AlertTitle className="text-amber-200">Your new API key</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <p className="text-sm text-amber-100/80">
              Copy this now — you will never see it again.
            </p>
            <div className="flex items-center gap-2">
              <code className="bg-raised flex-1 rounded-lg px-3 py-2 text-xs break-all font-mono text-white">
                {newKeyResult.fullKey}
              </code>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={copyFullKey}
                aria-label="Copy API key"
              >
                {copied ? <X className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={dismissNewKey} className="h-7 text-xs">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading && !keys ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      ) : !keys || keys.length === 0 ? (
        <div className="bg-panel border-hairline flex flex-col items-center gap-3 rounded-2xl border py-12 text-center">
          <EmptyStateIllustration variant="empty" className="size-16" />
          <p className="text-dim text-sm max-w-xs">
            No API keys yet. Create one to start building integrations.
          </p>
        </div>
      ) : (
        <div className="bg-panel border-hairline rounded-2xl border overflow-hidden">
          <ul className="divide-y">
            {keys.map((key) => (
              <li
                key={key.id}
                className="flex items-start justify-between gap-4 px-5 py-4"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{key.name}</span>
                    {key.revoked_at && (
                      <Badge variant="secondary" className="text-xs">
                        Revoked
                      </Badge>
                    )}
                  </div>
                  <p className="text-dim text-xs font-mono">{key.key_preview}</p>
                  <p className="text-dim text-xs">
                    Created {formatWhen(key.created_at)}
                    {key.last_used_at && ` · Last used ${formatWhen(key.last_used_at)}`}
                  </p>
                </div>

                {!key.revoked_at && (
                  <Dialog open={revokeDialogOpen && revokeTarget?.id === key.id} onOpenChange={(open) => {
                    if (!open) {
                      setRevokeDialogOpen(false)
                      setRevokeTarget(null)
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
                        onClick={() => openRevoke(key)}
                        aria-label={`Revoke ${key.name}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Revoke API key</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to revoke <strong>{key.name}</strong>? Any
                          integration using this key will immediately stop working. This cannot be
                          undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setRevokeDialogOpen(false)}
                          disabled={revokingId === key.id}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={confirmRevoke}
                          disabled={revokingId === key.id}
                        >
                          {revokingId === key.id ? 'Revoking…' : 'Revoke key'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}