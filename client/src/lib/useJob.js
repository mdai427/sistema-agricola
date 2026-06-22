import { useQuery } from '@tanstack/react-query'
import api from './api'

/**
 * Poll a background job until it completes or fails.
 *
 * Usage:
 *   const { data, isComplete, isFailed } = useJob('reports', jobId)
 *
 * @param {string} queue  - queue name: 'reports' | 'billing' | 'notifications' | 'imports'
 * @param {string} jobId  - job ID returned from the enqueue endpoint
 * @param {object} opts   - optional overrides
 */
export function useJob(queue, jobId, opts = {}) {
  const { pollInterval = 1500 } = opts

  const query = useQuery({
    queryKey: ['job', queue, jobId],
    queryFn: () => api.get(`/jobs/${queue}/${jobId}`).then(r => r.data),
    enabled: !!queue && !!jobId,
    // Stop polling once the job reaches a terminal state
    refetchInterval: (query) => {
      const state = query.state.data?.state
      if (state === 'completed' || state === 'failed') return false
      return pollInterval
    },
    staleTime: 0,
  })

  const state = query.data?.state
  return {
    ...query,
    state,
    progress: query.data?.progress ?? 0,
    result: query.data?.result,
    failedReason: query.data?.failedReason,
    isWaiting: state === 'waiting' || state === 'delayed',
    isActive: state === 'active',
    isComplete: state === 'completed',
    isFailed: state === 'failed',
  }
}

/**
 * Download a completed report job's file.
 * Call only when useJob.isComplete === true.
 */
export async function downloadReportJob(jobId, defaultFilename = 'reporte.xlsx') {
  const response = await api.get(`/jobs/reports/${jobId}/download`, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const a = document.createElement('a')
  a.href = url
  a.download = defaultFilename
  a.click()
  URL.revokeObjectURL(url)
}
