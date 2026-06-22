const { Queue, Worker, QueueEvents } = require('bullmq');

const REDIS_URL = process.env.REDIS_URL;

// If no Redis, return no-op stubs so the app works without a queue
if (!REDIS_URL) {
  console.warn('[queues] REDIS_URL not set — async jobs disabled, calls will be synchronous');
}

function parseRedisUrl(url) {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: parseInt(u.port) || 6379,
      password: u.password || undefined,
      tls: u.protocol === 'rediss:' ? {} : undefined,
    };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

const connection = REDIS_URL ? parseRedisUrl(REDIS_URL) : null;

const defaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { age: 60 * 60 * 24 },  // keep 24h
  removeOnFail: { age: 60 * 60 * 24 * 7 },  // keep 7 days on failure
};

function makeQueue(name) {
  if (!connection) return null;
  return new Queue(name, { connection, defaultJobOptions });
}

function makeQueueEvents(name) {
  if (!connection) return null;
  return new QueueEvents(name, { connection });
}

// ── Queue instances ──────────────────────────────────────────────────────────
const queues = {
  notifications: makeQueue('notifications'), // WhatsApp / email
  billing:       makeQueue('billing'),        // CFDI stamping via FINKOC
  reports:       makeQueue('reports'),        // Heavy PDF/Excel generation
  imports:       makeQueue('imports'),        // Excel product/invoice import
};

const queueEvents = {
  notifications: makeQueueEvents('notifications'),
  billing:       makeQueueEvents('billing'),
  reports:       makeQueueEvents('reports'),
  imports:       makeQueueEvents('imports'),
};

/**
 * Enqueue a job. Returns { jobId } or runs fn() inline if queues are disabled.
 * @param {string} queueName
 * @param {string} jobName
 * @param {object} data
 * @param {Function} [fallback] - async fn to run synchronously when Redis is unavailable
 */
async function enqueue(queueName, jobName, data, fallback) {
  const q = queues[queueName];
  if (!q) {
    // No Redis — run synchronously, swallow errors for fire-and-forget jobs
    if (fallback) {
      try { await fallback(); } catch (e) { console.error(`[${queueName}/${jobName}] inline error:`, e.message); }
    }
    return { jobId: null, mode: 'inline' };
  }
  const job = await q.add(jobName, data);
  return { jobId: job.id, mode: 'queued' };
}

module.exports = { queues, queueEvents, enqueue, connection, Worker };
