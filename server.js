import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { createSession, runWorkflow } from "./src/workflow.js";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use('/assets', express.static(join(__dirname, 'assets')));
app.use(express.static(join(__dirname, 'public')));

const sessions = new Map();

function getSession(sessionId) {
  if (!sessionId || !sessions.has(sessionId)) {
    const newId = crypto.randomUUID();
    const state = createSession();
    sessions.set(newId, state);
    return { sessionId: newId, state };
  }
  return { sessionId, state: sessions.get(sessionId) };
}

app.post("/api/message", async (req, res) => {
  try {
    const { sessionId: clientSessionId, message } = req.body;
    const { sessionId, state } = getSession(clientSessionId);

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message es obligatorio." });
    }

    state.messages.push({ role: "user", content: message.trim() });

    if (state.pendingHumanReview) {
      state.userFeedback.push(message.trim());
      state.currentDebateTopic = `Feedback-driven refinement: ${message.trim().slice(0, 120)}`;
    }

    const result = await runWorkflow(state);

    return res.json({
      sessionId,
      status: result.status,
      events: result.events,
      summary: {
        projectVision: state.projectVision,
        iterationCount: state.iterationCount,
        pendingHumanReview: state.pendingHumanReview,
        docs: state.docs,
      },
    });
  } catch (error) {
    console.error("Workflow error:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/session/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session no encontrada." });
  }
  return res.json({
    sessionId: req.params.sessionId,
    state: {
      projectVision: session.projectVision,
      iterationCount: session.iterationCount,
      pendingHumanReview: session.pendingHumanReview,
      docs: session.docs,
      messages: session.messages,
    },
  });
});

app.get("*", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`AutoProductDesign multiagente running on http://localhost:${PORT}`);
});

export default app;
