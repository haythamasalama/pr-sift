import { EventEmitter } from 'node:events'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { StorageChange } from '#shared/ipc'

// A small key-value store kept as one JSON file, written through a temporary file so a crash never leaves half a file.
export class Store extends EventEmitter<{ changed: [Record<string, StorageChange>] }> {
  private data: Record<string, unknown> = {}
  private loaded: Promise<void> | null = null
  private writing: Promise<void> = Promise.resolve()

  constructor(private readonly file: string) {
    super()
  }

  private load(): Promise<void> {
    this.loaded ??= readFile(this.file, 'utf8').then(
      (text) => {
        const parsed: unknown = JSON.parse(text)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) this.data = parsed as Record<string, unknown>
      },
      () => undefined,
    )
    return this.loaded
  }

  private persist(): Promise<void> {
    const text = JSON.stringify(this.data)
    this.writing = this.writing.then(async () => {
      await mkdir(dirname(this.file), { recursive: true })
      const tmp = `${this.file}.${process.pid}.tmp`
      await writeFile(tmp, text, 'utf8')
      await rename(tmp, this.file)
    })
    return this.writing
  }

  async get(keys: string[]): Promise<Record<string, unknown>> {
    await this.load()
    return Object.fromEntries(keys.filter((k) => k in this.data).map((k) => [k, structuredClone(this.data[k])]))
  }

  async getOne<T>(key: string): Promise<T | undefined> {
    return (await this.get([key]))[key] as T | undefined
  }

  async set(values: Record<string, unknown>): Promise<void> {
    await this.load()
    const changes: Record<string, StorageChange> = {}
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) continue
      changes[key] = { oldValue: this.data[key], newValue: structuredClone(value) }
      this.data[key] = structuredClone(value)
    }
    if (!Object.keys(changes).length) return
    await this.persist()
    this.emit('changed', changes)
  }

  async remove(keys: string[]): Promise<void> {
    await this.load()
    const changes: Record<string, StorageChange> = {}
    for (const key of keys) {
      if (!(key in this.data)) continue
      changes[key] = { oldValue: this.data[key] }
      delete this.data[key]
    }
    if (!Object.keys(changes).length) return
    await this.persist()
    this.emit('changed', changes)
  }
}
