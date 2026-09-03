import { describe, it, expect } from 'vitest'
import { MemoryTopicRepository } from '../../src/storage/memory-topic-repository'
import type { Topic } from '../../src/types'

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 'topic-1',
    name: 'AI / Python',
    score: 0,
    growthRate: 0,
    confidence: 0,
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('MemoryTopicRepository', () => {
  it('saves a topic and finds it by id', async () => {
    const repo = new MemoryTopicRepository()
    const topic = makeTopic()

    await repo.save(topic)

    expect(await repo.findById(topic.id)).toEqual(topic)
  })

  it('returns null when a topic does not exist', async () => {
    const repo = new MemoryTopicRepository()

    expect(await repo.findById('missing')).toBeNull()
  })

  it('saves many topics and finds them all', async () => {
    const repo = new MemoryTopicRepository()
    const topics = [makeTopic({ id: 'topic-1' }), makeTopic({ id: 'topic-2', name: 'Rust / Compilers' })]

    await repo.saveMany(topics)

    expect(await repo.findAll()).toHaveLength(2)
    expect(await repo.findById('topic-2')).toEqual(topics[1])
  })

  it('replaces an existing topic on second save (no duplicates)', async () => {
    const repo = new MemoryTopicRepository()
    await repo.save(makeTopic({ id: 'topic-1', name: 'Old Name' }))
    await repo.save(makeTopic({ id: 'topic-1', name: 'New Name' }))

    const all = await repo.findAll()
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('New Name')
  })

  it('deletes a topic', async () => {
    const repo = new MemoryTopicRepository()
    await repo.save(makeTopic({ id: 'topic-1' }))

    await repo.delete('topic-1')

    expect(await repo.findById('topic-1')).toBeNull()
    expect(await repo.findAll()).toHaveLength(0)
  })

  it('clears all topics', async () => {
    const repo = new MemoryTopicRepository()
    await repo.saveMany([makeTopic({ id: 'topic-1' }), makeTopic({ id: 'topic-2' })])

    await repo.clear()

    expect(await repo.findAll()).toHaveLength(0)
  })
})