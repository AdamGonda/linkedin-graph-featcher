import type { PersonCard } from '../shared/person'

const DB_NAME = 'linkedin-graph'
const DB_VERSION = 2
const STORE = 'people'

export type StoredPerson = PersonCard & {
  degree: 1 | 2
  updatedAt: string
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'profileId' })
      }
      if (!db.objectStoreNames.contains('screenshots')) {
        const shots = db.createObjectStore('screenshots', { keyPath: 'id' })
        shots.createIndex('by_job', 'jobId', { unique: false })
      }
    }
  })
}

export async function upsertPeople(
  people: PersonCard[],
  degree: 1 | 2,
): Promise<number> {
  if (people.length === 0) return 0
  const db = await openDb()
  const now = new Date().toISOString()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    let count = 0

    for (const p of people) {
      const row: StoredPerson = {
        ...p,
        degree,
        updatedAt: now,
      }
      store.put(row)
      count++
    }

    tx.oncomplete = () => {
      db.close()
      resolve(count)
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('upsertPeople failed'))
    }
  })
}

export async function clearPeople(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).clear()
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error ?? new Error('clearPeople failed'))
    }
  })
}

export async function listPeople(): Promise<StoredPerson[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      db.close()
      const rows = (req.result as StoredPerson[]).slice()
      rows.sort((a, b) => a.name.localeCompare(b.name))
      resolve(rows)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

export async function countPeople(): Promise<number> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).count()
    req.onsuccess = () => {
      db.close()
      resolve(req.result)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}
