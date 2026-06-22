const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { queues } = require('../lib/queues');
const path = require('path');
const fs = require('fs');

const QUEUE_MAP = {
  notifications: queues.notifications,
  billing:       queues.billing,
  reports:       queues.reports,
  imports:       queues.imports,
};

// GET /api/jobs/:queue/:jobId — poll job status + result
router.get('/:queue/:jobId', auth, async (req, res) => {
  const q = QUEUE_MAP[req.params.queue];
  if (!q) return res.status(404).json({ error: 'Queue not found' });
  try {
    const job = await q.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    res.json({ jobId: job.id, name: job.name, state, progress, result, failedReason, attemptsMade: job.attemptsMade });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/jobs/reports/:jobId/download — stream the generated file
router.get('/reports/:jobId/download', auth, async (req, res) => {
  const q = queues.reports;
  if (!q) return res.status(503).json({ error: 'Queue not available' });
  try {
    const job = await q.getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const state = await job.getState();
    if (state !== 'completed') return res.status(400).json({ error: `Job state: ${state}` });
    const { filepath, filename } = job.returnvalue || {};
    if (!filepath || !fs.existsSync(filepath)) return res.status(404).json({ error: 'File not found — may have expired' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filepath).pipe(res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
