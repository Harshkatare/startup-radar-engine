export class ProcessingLock {
  private locked = false

  acquire(): boolean {
    if (this.locked) return false
    this.locked = true
    return true
  }

  release(): void {
    this.locked = false
  }

  isRunning(): boolean {
    return this.locked
  }
}
