/**
 * Workflow multiagente: orchestrator → debate (3 LLMs) → synthesis → human review → scribe
 */
import { createAgents } from "./agents.js";
import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let agents;
function getAgents() {
  if (!agents) agents = createAgents();
  return agents;
}

export function createSession() {
  return {
    messages: [],
    iterationCount: 0,
    projectVision: "",
    currentDebateTopic: "General Architecture and Requirements",
    userFeedback: [],
    pendingHumanReview: false,
    docs: [],
  };
}

async function runOrchestrator(state) {
  if (state.projectVision) {
    return { role: "assistant", content: "Project Vision confirmed. Procediendo al debate." };
  }

  const content = await getAgents().orchestrator.invoke("", state.messages);

  if (content.includes("VISION_CONFIRMED:")) {
    state.projectVision = content.replace("VISION_CONFIRMED:", "").trim();
  }

  return { role: "assistant", content };
}

async function runDebate(state) {
  const context = [
    `Project Vision:\n${state.projectVision || "No vision"}`,
    `Current Iteration: ${state.iterationCount}`,
    `Current Topic: ${state.currentDebateTopic}`,
  ].join("\n");

  const debateExchanges = [];
  const events = [];
  state.iterationCount += 1;

  // 3 agentes debaten secuencialmente, cada uno ve las respuestas previas
  const debaters = [getAgents().architect, getAgents().pm, getAgents().qa];

  for (const agent of debaters) {
    const priorDebate =
      debateExchanges.length > 0
        ? `\n\n--- Intervenciones previas ---\n${debateExchanges.map((d) => `[${d.name}]: ${d.content}`).join("\n\n")}`
        : "";

    const fullContext = `${context}${priorDebate}`;
    const content = await agent.invoke(fullContext, state.messages.slice(-6));

    debateExchanges.push({ id: agent.id, name: agent.name, content });

    const msg = { role: "assistant", content: `${agent.name}\n${content}` };
    state.messages.push(msg);
    events.push({ node: "debater", agent: agent.id, message: msg, iteration: state.iterationCount });
  }

  // Síntesis con un 4to LLM call
  const synthesisContext = [
    context,
    `\nDebate:\n${debateExchanges.map((d) => `[${d.name}]: ${d.content}`).join("\n\n")}`,
  ].join("\n");

  const synthesisContent = await getAgents().synthesis.invoke(synthesisContext, []);
  const synthesisMsg = {
    role: "assistant",
    content: `📊 Síntesis Debate #${state.iterationCount}\n\n${synthesisContent}`,
  };
  state.messages.push(synthesisMsg);
  events.push({ node: "synthesis", message: synthesisMsg, iteration: state.iterationCount });

  return { events };
}

async function runScribe(state) {
  const outputDir = join(__dirname, "..", "output");
  await mkdir(outputDir, { recursive: true });

  const docSpecs = [
    ["requirements.md", "Requisitos funcionales y no funcionales detallados."],
    ["architecture.md", "Arquitectura de sistema con diagramas Mermaid y decisiones técnicas."],
    ["api_specs.md", "Especificación de endpoints, contratos y validaciones."],
    ["implementation_plan.md", "Plan de implementación por fases con riesgos y mitigaciones."],
  ];

  const generated = [];

  for (const [fileName, description] of docSpecs) {
    const context = `Project Vision: ${state.projectVision}\n\nGenera ${fileName}.\nDescripción: ${description}`;
    const content = await getAgents().scribe.invoke(context, state.messages.slice(-10));
    await writeFile(join(outputDir, fileName), content, "utf8");
    generated.push(fileName);
  }

  state.docs = generated;
  return { role: "assistant", content: `📚 Documentación generada: ${generated.join(", ")}` };
}

export async function runWorkflow(state) {
  const events = [];

  // Fase 1: Orchestrator cierra la visión
  if (!state.projectVision) {
    const orchestratorMsg = await runOrchestrator(state);
    state.messages.push(orchestratorMsg);
    events.push({ node: "orchestrator", message: orchestratorMsg });

    if (!state.projectVision) {
      return { events, status: "awaiting_vision" };
    }
  }

  if (state.pendingHumanReview) {
    state.pendingHumanReview = false;
  }

  // Fase 3: Scribe genera docs en iteración 9+
  if (state.iterationCount >= 9 && state.docs.length === 0) {
    const scribeMsg = await runScribe(state);
    state.messages.push(scribeMsg);
    events.push({ node: "scribe", message: scribeMsg });
    return { events, status: "completed" };
  }

  // Fase 2: Debate multiagente (3 LLMs + síntesis)
  const debateResult = await runDebate(state);
  events.push(...debateResult.events);

  // Human review cada 3 iteraciones
  if (state.iterationCount % 3 === 0 && state.iterationCount < 9) {
    state.pendingHumanReview = true;
    const reviewMsg = {
      role: "assistant",
      content: "⏸️ Revisión humana requerida: comparte feedback para continuar al siguiente bloque de debate.",
    };
    state.messages.push(reviewMsg);
    events.push({ node: "human_review", message: reviewMsg });
    return { events, status: "awaiting_feedback" };
  }

  // Scribe al llegar a 9
  if (state.iterationCount >= 9) {
    const scribeMsg = await runScribe(state);
    state.messages.push(scribeMsg);
    events.push({ node: "scribe", message: scribeMsg });
    return { events, status: "completed" };
  }

  return { events, status: "debating" };
}
