# AutoProductDesign // Web Edition

Migración completa desde CLI en Python a aplicación web full-stack en JavaScript.

## Stack
- **Backend**: Node.js + Express
- **Frontend**: HTML + CSS + JS (sin frameworks pesados)
- **UI utilities**: Tailwind CSS (CDN) + Lucide Icons
- **LLM provider**: OpenRouter (opcional, con fallback local)

## Ejecución

```bash
npm install
npm start
```

Servidor en: `http://localhost:3000`

## Variables de entorno

1. Copia `.env.example` a `.env`
2. Configura tu llave de OpenRouter

```bash
cp .env.example .env
```

## Flujo funcional

1. Usuario describe el proyecto en la interfaz web.
2. **Orchestrator** construye y confirma visión (`VISION_CONFIRMED:`).
3. **Debater** ejecuta iteraciones de debate técnico.
4. Cada 3 iteraciones se solicita **human review**.
5. En la iteración 9, **Scribe** genera documentación en `output/`:
   - `requirements.md`
   - `architecture.md`
   - `api_specs.md`
   - `implementation_plan.md`

## Tests

```bash
npm test
```
