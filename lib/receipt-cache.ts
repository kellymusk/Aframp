import type { BillsTransaction } from '@/hooks/use-bills-transaction'

const DB_NAME = 'aframp-receipts'
const STORE = 'receipts'
const VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveReceipt(tx: BillsTransaction): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE, 'readwrite').objectStore(STORE)
    const req = store.put(tx)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function loadReceipt(id: string): Promise<BillsTransaction | null> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE, 'readonly').objectStore(STORE)
    const req = store.get(id)
    req.onsuccess = () => resolve((req.result as BillsTransaction) ?? null)
    req.onerror = () => reject(req.error)
  })
}
