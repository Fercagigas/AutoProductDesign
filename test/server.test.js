const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

let server;
let baseUrl;

test.before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('POST /api/message creates session and returns summary', async () => {
  const res = await fetch(`${baseUrl}/api/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Quiero una app para gestión de inventario. Ready.' })
  });

  assert.equal(res.status, 200);
  const body = await res.json();

  assert.ok(body.sessionId);
  assert.ok(Array.isArray(body.events));
  assert.ok(body.summary);
  assert.equal(typeof body.summary.iterationCount, 'number');
});
