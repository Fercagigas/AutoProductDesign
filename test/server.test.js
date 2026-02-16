import test from "node:test";
import assert from "node:assert/strict";

test("POST /api/message returns 400 without message", async () => {
  // Import dinámico para que dotenv cargue antes
  const { default: app } = await import("../server.js");
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  const res = await fetch(`http://127.0.0.1:${port}/api/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.error);

  await new Promise((resolve) => server.close(resolve));
});
