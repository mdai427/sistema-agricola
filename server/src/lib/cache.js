const Redis = require('ioredis');

let redis = null;

// Initialize Redis — gracefully degrade if not available
function getRedis() {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
    redis.on('error', () => { /* silently degrade */ });
    return redis;
  } catch {
    return null;
  }
}

const TTL = {
  DASHBOARD: 60,        // 1 min — KPIs de hoy/mes
  CATALOG: 300,         // 5 min — categorías, marcas, almacenes
  STOCK: 30,            // 30s — niveles de inventario
  REPORTS: 120,         // 2 min — reportes de ventas
  CUSTOMERS: 300,       // 5 min — listado de clientes/proveedores
  ALERTS: 30,           // 30s — alertas de stock bajo
};

/**
 * Get a cached value. Returns null on miss or if Redis is unavailable.
 */
async function get(key) {
  const r = getRedis();
  if (!r) return null;
  try {
    const val = await r.get(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

/**
 * Set a cached value with TTL in seconds.
 */
async function set(key, value, ttl) {
  const r = getRedis();
  if (!r) return;
  try {
    await r.set(key, JSON.stringify(value), 'EX', ttl);
  } catch { /* degrade silently */ }
}

/**
 * Delete one or more keys (supports glob patterns via SCAN+DEL).
 */
async function del(...keys) {
  const r = getRedis();
  if (!r) return;
  try {
    const pipeline = r.pipeline();
    for (const key of keys) {
      if (key.includes('*')) {
        // Pattern delete via SCAN
        let cursor = '0';
        do {
          const [next, found] = await r.scan(cursor, 'MATCH', key, 'COUNT', 100);
          cursor = next;
          if (found.length) pipeline.del(...found);
        } while (cursor !== '0');
      } else {
        pipeline.del(key);
      }
    }
    await pipeline.exec();
  } catch { /* degrade silently */ }
}

/**
 * Wrap an async function with cache-aside logic.
 * fn() is called on miss; result is cached for ttl seconds.
 */
async function wrap(key, ttl, fn) {
  const cached = await get(key);
  if (cached !== null) return cached;
  const result = await fn();
  await set(key, result, ttl);
  return result;
}

module.exports = { get, set, del, wrap, TTL };
