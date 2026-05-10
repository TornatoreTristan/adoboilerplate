import type Bull from 'bull'

export interface AdminQueueStatsDto {
  active: number
  waiting: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

export interface AdminQueueDto {
  name: string
  isDeadLetter: boolean
  isPaused: boolean
  stats: AdminQueueStatsDto
}

export interface AdminQueueFailedJobDto {
  id: string
  name: string
  data: unknown
  failedReason: string
  attemptsMade: number
  maxAttempts: number
  timestampIso: string
  processedOnIso: string | null
  finishedOnIso: string | null
  stacktrace: string[]
}

export interface AdminQueueDetailDto {
  name: string
  isDeadLetter: boolean
  isPaused: boolean
  stats: AdminQueueStatsDto
  failedJobs: AdminQueueFailedJobDto[]
}

function epochToIso(ms: number | undefined | null): string | null {
  if (ms === undefined || ms === null) return null
  return new Date(ms).toISOString()
}

export class AdminQueueDtoPresenter {
  static presentStats(raw: AdminQueueStatsDto): AdminQueueStatsDto {
    return {
      active: raw.active,
      waiting: raw.waiting,
      completed: raw.completed,
      failed: raw.failed,
      delayed: raw.delayed,
      paused: raw.paused,
    }
  }

  static presentQueue(
    queueMeta: { name: string; isDeadLetter: boolean },
    isPaused: boolean,
    stats: AdminQueueStatsDto
  ): AdminQueueDto {
    return {
      name: queueMeta.name,
      isDeadLetter: queueMeta.isDeadLetter,
      isPaused,
      stats: AdminQueueDtoPresenter.presentStats(stats),
    }
  }

  static presentFailedJob(raw: {
    id: Bull.JobId
    name: string
    data: unknown
    failedReason: string | undefined
    attemptsMade: number
    maxAttempts: number
    timestamp: number
    processedOn: number | undefined
    finishedOn: number | undefined
    stacktrace: string[]
  }): AdminQueueFailedJobDto {
    return {
      id: String(raw.id),
      name: raw.name,
      data: raw.data,
      failedReason: raw.failedReason ?? 'Unknown error',
      attemptsMade: raw.attemptsMade,
      maxAttempts: raw.maxAttempts,
      timestampIso: new Date(raw.timestamp).toISOString(),
      processedOnIso: epochToIso(raw.processedOn),
      finishedOnIso: epochToIso(raw.finishedOn),
      stacktrace: raw.stacktrace,
    }
  }
}
