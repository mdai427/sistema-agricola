require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Start background workers (no-op if Redis unavailable)
require('./workers/notifications.worker');
require('./workers/billing.worker');
require('./workers/reports.worker');
require('./workers/imports.worker');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/brands', require('./routes/brands'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/quotes', require('./routes/quotes'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/shipments', require('./routes/shipments'));
app.use('/api/cash', require('./routes/cash'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/users', require('./routes/users'));
app.use('/api/warehouses', require('./routes/warehouses'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use('/api/fichas', require('./routes/fichas'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/imports', require('./routes/imports'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/config', require('./routes/config'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Serve React client in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
    }
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
