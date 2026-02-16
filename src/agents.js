/**
 * Agentes del sistema multiagente.
 * Cada agente tiene su propio LLM (modelo distinto) y system prompt.
 */
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { getNemotron, getQwen, getGptOss } from "./models.js";

// --- System Prompts ---

const ORCHESTRATOR_PROMPT = `Eres Lead Architect + Product Strategist.
Tu objetivo es cerrar una Project Vision clara.
- Haz preguntas de aclaración si falta detalle.
- Si la visión ya es suficiente o el usuario dice "Ready", responde iniciando con "VISION_CONFIRMED:" seguido del resumen.
- Responde siempre en español técnico y concreto.`;

const ARCHITECT_PROMPT = `Eres Senior Architect en un panel de diseño de producto.
Tu enfoque: escalabilidad, performance, trade-offs técnicos, patrones de arquitectura.
- Sé concreto y técnico.
- Propón soluciones con justificación.
- Señala riesgos técnicos.
- Responde en español técnico.`;

const PM_PROMPT = `Eres Product Manager en un panel de diseño de producto.
Tu enfoque: valor de usuario, alcance del MVP, priorización, tiempo de entrega.
- Evalúa las propuestas técnicas desde la perspectiva de negocio y usuario.
- Cuestiona complejidad innecesaria.
- Propón prioridades claras.
- Responde en español técnico.`;

const QA_PROMPT = `Eres QA Lead en un panel de diseño de producto.
Tu enfoque: riesgos, casos límite, validación, testing, seguridad.
- Identifica lo que puede fallar.
- Propón estrategias de testing.
- Cuestiona supuestos no validados.
- Responde en español técnico.`;

const SYNTHESIS_PROMPT = `Eres un facilitador neutral. Resume el debate entre los expertos.
Genera:
- AGREED POINTS (puntos de consenso)
- OPEN QUESTIONS (preguntas abiertas)
- RECOMMENDED NEXT STEPS
Responde en español técnico.`;

const SCRIBE_PROMPT = `Eres Technical Writer senior.
Incluye markdown profesional, alta precisión y casos borde.
Responde en español técnico.`;

// --- Agent class ---

class Agent {
  constructor(id, name, systemPrompt, llm) {
    this.id = id;
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.llm = llm;
  }

  async invoke(context, history = []) {
    const messages = [new SystemMessage(`${this.systemPrompt}\n\n${context}`)];
    for (const msg of history) {
      if (msg.role === "user") {
        messages.push(new HumanMessage(msg.content));
      } else {
        messages.push(new AIMessage(msg.content));
      }
    }
    const response = await this.llm.invoke(messages);
    return response.content;
  }
}

// --- Agent factory ---

export function createAgents() {
  return {
    orchestrator: new Agent("orchestrator", "🎯 Orchestrator", ORCHESTRATOR_PROMPT, getQwen(0.7)),
    architect:    new Agent("architect",    "🏗️ Senior Architect", ARCHITECT_PROMPT, getNemotron(0.7)),
    pm:           new Agent("pm",           "📋 Product Manager",  PM_PROMPT,        getQwen(0.7)),
    qa:           new Agent("qa",           "🧪 QA Lead",          QA_PROMPT,        getGptOss(0.7)),
    synthesis:    new Agent("synthesis",    "📊 Synthesis",        SYNTHESIS_PROMPT, getQwen(0.3)),
    scribe:       new Agent("scribe",       "📚 Scribe",           SCRIBE_PROMPT,    getQwen(0.3)),
  };
}
