// Intentionally insecure fixture — do NOT copy patterns from this file.
import express from 'express';

const app = express();

app.use(
  require('cors')({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }),
);

// IDOR: no ownership check on the requested order.
app.get('/api/orders/:id', async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  res.json(order);
});

// Unsafe flow: request param reaches the query without sanitization.
app.post('/api/users', async (req, res) => {
  const rows = await db.query(`SELECT * FROM users WHERE name = '${req.body.name}'`);
  res.json(rows);
});

// Client-supplied privilege flag.
app.delete('/api/admin/wipe', async (req, res) => {
  if (req.body.isAdmin) {
    await db.dropAll();
  }
  res.sendStatus(204);
});
