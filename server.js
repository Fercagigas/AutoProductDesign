const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.static(path.join(__dirname, 'public')));

const sessions = new Map();

function createSession() {
  return {
    messages: [],
    iterationCount: 0,
    projectVision: '',
    currentDebateTopic: 'General Architecture and Requirements',
    userFeedback: [],
    pendingHumanReview: false,
    docs: [],
    timeline: []
  };
}

function getSession(sessionId) {
  if (!sessionId || !sessions.has(sessionId)) {
    const newId = crypto.randomUUID();
    const state = createSession();
    sessions.set(newId, state);
    return { sessionId: newId, state };
  }

  return { sessionId, state: sessions.get(sessionId) };
}

async function callLLM(systemPrompt, messages, temperature = 0.7) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      content: 'OPENROUTER_API_KEY no está configurada. Ejecutando en modo local sin LLM.'
    };
  }

  const payload = {
    model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001',
    temperature,
    messages: [{ role: 'system', content: systemPrompt }, ...messages]
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.OPENROUTER_REFERER || 'https://autoproductdesign.local',
      'X-Title': 'AutoProductDesign'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${error}`);
  }

  const data = await response.json();
  return { content: data.choices?.[0]?.message?.content || 'Sin respuesta del modelo.' };
}

async function runOrchestrator(state) {
  if (state.projectVision) {
    return { role: 'assistant', content: 'Project Vision confirmed. Procediendo al debate.' };
  }

  const systemPrompt = `Eres Lead Architect + Product Strategist.
Tu objetivo es cerrar una Project Vision clara.
- Haz preguntas de aclaración si falta detalle.
- Si la visión ya es suficiente o el usuario dice "Ready", responde iniciando con "VISION_CONFIRMED:" seguido del resumen.
- Responde siempre en español técnico y concreto.`;

  const llmResponse = await callLLM(systemPrompt, state.messages, 0.7);

  if (llmResponse.content.includes('VISION_CONFIRMED:')) {
    state.projectVision = llmResponse.content.replace('VISION_CONFIRMED:', '').trim();
  }

  return { role: 'assistant', content: llmResponse.content };
}

async function runDebater(state) {
  const systemPrompt = `Eres un panel de 3 expertos discutiendo implementación.
Project Vision:\n${state.projectVision || 'No vision'}
Current Iteration: ${state.iterationCount}
Current Topic: ${state.currentDebateTopic}

Panel:
1) Senior Architect (escalabilidad, performance, trade-offs)
2) Product Manager (valor de usuario, alcance, tiempo)
3) QA Lead (riesgos, casos límite, validación)

Salida requerida:
- Debate breve por roles
- AGREED POINTS
- OPEN QUESTIONS`;

  const llmResponse = await callLLM(systemPrompt, state.messages.slice(-6), 0.7);
  state.iterationCount += 1;

  return {
    role: 'assistant',
    content: `🧠 Debate #${state.iterationCount}\n\n${llmResponse.content}`
  };
}

async function runScribe(state) {
  const outputDir = path.join(__dirname, 'output');
  await fs.mkdir(outputDir, { recursive: true });

  const docs = [
    ['requirements.md', 'Requisitos funcionales y no funcionales detallados.'],
    ['architecture.md', 'Arquitectura de sistema con diagramas Mermaid y decisiones técnicas.'],
    ['api_specs.md', 'Especificación de endpoints, contratos y validaciones.'],
    ['implementation_plan.md', 'Plan de implementación por fases con riesgos y mitigaciones.']
  ];

  const generated = [];

  for (const [fileName, description] of docs) {
    const prompt = `Eres Technical Writer senior.\nProject Vision: ${state.projectVision}\n\nGenera ${fileName}.\nDescripción: ${description}\n\nIncluye markdown profesional, alta precisión y casos borde.`;
    const llmResponse = await callLLM(prompt, state.messages.slice(-10), 0.3);
    await fs.writeFile(path.join(outputDir, fileName), llmResponse.content, 'utf8');
    generated.push(fileName);
  }

  state.docs = generated;
  return {
    role: 'assistant',
    content: `📚 Documentación generada: ${generated.join(', ')}`
  };
}

async function runWorkflow(state) {
  const events = [];

  if (!state.projectVision) {
    const orchestratorMsg = await runOrchestrator(state);
    state.messages.push(orchestratorMsg);
    events.push({ node: 'orchestrator', message: orchestratorMsg });

    if (!state.projectVision) {
      return { events, status: 'awaiting_vision' };
    }
  }

  if (state.pendingHumanReview) {
    state.pendingHumanReview = false;
  }

  if (state.iterationCount >= 9 && state.docs.length === 0) {
    const scribeMsg = await runScribe(state);
    state.messages.push(scribeMsg);
    events.push({ node: 'scribe', message: scribeMsg });
    return { events, status: 'completed' };
  }

  const debateMsg = await runDebater(state);
  state.messages.push(debateMsg);
  events.push({ node: 'debater', message: debateMsg, iteration: state.iterationCount });

  if (state.iterationCount % 3 === 0 && state.iterationCount < 9) {
    state.pendingHumanReview = true;
    const reviewMsg = {
      role: 'assistant',
      content: '⏸️ Revisión humana requerida: comparte feedback para continuar al siguiente bloque de debate.'
    };
    state.messages.push(reviewMsg);
    events.push({ node: 'human_review', message: reviewMsg });
    return { events, status: 'awaiting_feedback' };
  }

  if (state.iterationCount >= 9) {
    const scribeMsg = await runScribe(state);
    state.messages.push(scribeMsg);
    events.push({ node: 'scribe', message: scribeMsg });
    return { events, status: 'completed' };
  }

  return { events, status: 'debating' };
}

app.post('/api/message', async (req, res) => {
  try {
    const { sessionId: clientSessionId, message } = req.body;
    const { sessionId, state } = getSession(clientSessionId);

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message es obligatorio.' });
    }

    const userMsg = { role: 'user', content: message.trim() };
    state.messages.push(userMsg);

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
        docs: state.docs
      }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Session no encontrada.' });
  }

  return res.json({
    sessionId,
    state: {
      projectVision: session.projectVision,
      iterationCount: session.iterationCount,
      pendingHumanReview: session.pendingHumanReview,
      docs: session.docs,
      messages: session.messages
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`AutoProductDesign web running on http://localhost:${PORT}`);
  });
}

module.exports = app;
