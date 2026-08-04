import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'

export class SQLiteClient {
  private db: Database.Database | null = null

  constructor(private readonly dbPath: string = 'startup-radar.db') {}

  open(): void {
    const dir = path.dirname(this.dbPath)
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }

  execute(sql: string, params: unknown[] = []): void {
    if (!this.db) throw new Error('Database not open')
    this.db.prepare(sql).run(...params)
  }

  query<T>(sql: string, params: unknown[] = []): T[] {
    if (!this.db) throw new Error('Database not open')
    return this.db.prepare(sql).all(...params) as T[]
  }

  queryOne<T>(sql: string, params: unknown[] = []): T | undefined {
    if (!this.db) throw new Error('Database not open')
    return this.db.prepare(sql).get(...params) as T | undefined
  }

  transaction<T>(fn: () => T): T {
    if (!this.db) throw new Error('Database not open')
    const txn = this.db.transaction(fn)
    return txn()
  }

  isOpen(): boolean {
    return this.db !== null
  }
}
