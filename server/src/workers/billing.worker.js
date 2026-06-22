const { Worker } = require('bullmq');
const { connection, enqueue } = require('../lib/queues');
const prisma = require('../lib/prisma');
const cache = require('../lib/cache');

if (!connection) {
  console.warn('[worker:billing] Redis not available — worker not started');
  module.exports = null;
  return;
}

const worker = new Worker('billing', async (job) => {
  const { name, data } = job;

  if (name === 'stamp-cfdi') {
    const { orderId, cfdiPayload } = data;

    await job.updateProgress(10);
    const company = await prisma.company.findFirst();
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, items: { include: { product: true } } },
    });
    if (!order) throw new Error(`Order ${orderId} not found`);

    await job.updateProgress(30);

    let result;
    if (company?.finkocUser && company?.finkocPassword) {
      const axios = require('axios');
      const base = company.finkocEnv === 'production'
        ? 'https://api.finkoc.com/v1'
        : 'https://sandbox.finkoc.com/v1';

      await job.updateProgress(50);
      const response = await axios.post(`${base}/cfdi40/stamp`, cfdiPayload, {
        auth: { username: company.finkocUser, password: company.finkocPassword },
        timeout: 20000,
      });
      await job.updateProgress(80);
      result = { uuid: response.data.uuid, xml: response.data.xml, qr: response.data.qr, mode: 'finkoc' };
    } else {
      // Simulate
      await new Promise(r => setTimeout(r, 500)); // simulate network
      const uuid = `SIM-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      result = {
        uuid,
        xml: `<!-- CFDI 4.0 SIMULADO -->\n<Comprobante UUID="${uuid}" Total="${cfdiPayload.total}" />`,
        qr: null,
        mode: 'simulado',
      };
    }

    await job.updateProgress(90);
    await prisma.order.update({
      where: { id: orderId },
      data: {
        cfdiUse: cfdiPayload.receptor?.usoCFDI || 'G03',
        regimenFiscal: cfdiPayload.receptor?.regimenFiscal || '616',
      },
    });

    // Invalidate alerts cache (pedido ya no está pendiente de facturar)
    await cache.del('alerts:main');

    // Fire WhatsApp notification if customer has number
    if (order.customer?.whatsapp) {
      await enqueue('notifications', 'whatsapp-order', { orderId, event: 'FACTURADO' });
    }

    await job.updateProgress(100);
    return result;
  }

  throw new Error(`Unknown billing job: ${name}`);
}, {
  connection,
  concurrency: 2, // CFDI calls are external — keep concurrency low
});

worker.on('failed', (job, err) => console.error(`[worker:billing] job ${job?.id} failed:`, err.message));
worker.on('completed', (job, result) => console.log(`[worker:billing] job ${job.id} done — UUID: ${result?.uuid}`));

module.exports = worker;
