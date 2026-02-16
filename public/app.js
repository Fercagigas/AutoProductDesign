let sessionId = null;

const form = document.getElementById('messageForm');
const prompt = document.getElementById('prompt');
const feed = document.getElementById('feed');
const sessionLabel = document.getElementById('sessionLabel');
const iteration = document.getElementById('iteration');
const humanReview = document.getElementById('humanReview');
const vision = document.getElementById('vision');
const docs = document.getElementById('docs');
const workflowStatus = document.getElementById('workflowStatus');
const connectionStatus = document.getElementById('connectionStatus');
const statusDot = document.getElementById('statusDot');
const charCounter = document.getElementById('charCounter');
const messageCounter = document.getElementById('messageCounter');
const quickPrompts = document.getElementById('quickPrompts');
const submitButton = form.querySelector('button[type="submit"]');

let totalMessages = 0;

const statusLabels = {
  awaiting_vision: 'Esperando definición de visión',
  debating: 'Debate en curso',
  awaiting_feedback: 'Esperando human review',
  completed: 'Workflow completado'
};

const roleClass = {
  user: 'border-zinc-700 bg-zinc-900/80',
  assistant: 'border-accent/40 bg-accent/5'
};

function appendMessage(role, content) {
  const bubble = document.createElement('article');
  bubble.className = `stagger-item rounded-xl border p-3 text-sm leading-relaxed ${roleClass[role] || roleClass.assistant}`;

  const title = document.createElement('p');
  title.className = 'mb-2 text-xs uppercase tracking-[0.18em] text-zinc-400';
  title.textContent = role === 'user' ? 'User Input' : 'System Output';

  const body = document.createElement('pre');
  body.className = 'whitespace-pre-wrap font-mono text-xs md:text-sm';
  body.textContent = content;

  bubble.append(title, body);
  feed.appendChild(bubble);
  totalMessages += 1;
  messageCounter.textContent = `${totalMessages} mensajes`;

  requestAnimationFrame(() => bubble.classList.add('visible'));
  feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
}

function updateConnectionStatus(text, isLive = false) {
  connectionStatus.textContent = text;
  statusDot.classList.toggle('live', isLive);
}

function setWorkflowStatus(status) {
  workflowStatus.textContent = statusLabels[status] || 'Idle';
}

function setSubmitting(isSubmitting) {
  prompt.disabled = isSubmitting;
  submitButton.disabled = isSubmitting;
  submitButton.classList.toggle('opacity-60', isSubmitting);
  submitButton.classList.toggle('cursor-not-allowed', isSubmitting);
  submitButton.innerHTML = isSubmitting
    ? '<i data-lucide="loader-circle" class="h-4 w-4 animate-spin"></i> Procesando'
    : '<i data-lucide="send" class="h-4 w-4"></i> Enviar';

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderSummary(summary) {
  iteration.textContent = summary.iterationCount;
  humanReview.textContent = summary.pendingHumanReview ? 'Sí' : 'No';
  vision.textContent = summary.projectVision || 'Sin definir';

  docs.innerHTML = '';
  if (!summary.docs.length) {
    const li = document.createElement('li');
    li.className = 'text-zinc-500';
    li.textContent = 'Aún no hay documentos generados.';
    docs.appendChild(li);
    return;
  }

  summary.docs.forEach((docName, idx) => {
    const li = document.createElement('li');
    li.className = 'stagger-item';
    li.textContent = `${idx + 1}. ${docName}`;
    docs.appendChild(li);
    setTimeout(() => li.classList.add('visible'), idx * 70);
  });
}

prompt.addEventListener('input', () => {
  charCounter.textContent = `${prompt.value.length} caracteres`;
});

quickPrompts?.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-prompt]');
  if (!button) return;
  prompt.value = button.dataset.prompt || '';
  prompt.dispatchEvent(new Event('input'));
  prompt.focus();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = prompt.value.trim();
  if (!message) return;

  prompt.value = '';
  prompt.dispatchEvent(new Event('input'));
  appendMessage('user', message);
  setSubmitting(true);
  updateConnectionStatus('Enviando al servidor...', true);

  try {
    const response = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    });

    const data = await response.json();
    if (!response.ok) {
      appendMessage('assistant', `Error: ${data.error || 'Unknown error'}`);
      updateConnectionStatus('Error de respuesta del servidor.', false);
      return;
    }

    sessionId = data.sessionId;
    sessionLabel.textContent = `Session: ${sessionId}`;
    setWorkflowStatus(data.status);
    updateConnectionStatus('Respuesta recibida correctamente.', true);

    data.events.forEach((evt, idx) => {
      setTimeout(() => {
        appendMessage('assistant', `[${evt.node}]\n${evt.message.content}`);
      }, idx * 130);
    });

    renderSummary(data.summary);
  } catch (error) {
    appendMessage('assistant', `Fallo de red: ${error.message}`);
    updateConnectionStatus(`Fallo de red: ${error.message}`, false);
  } finally {
    setSubmitting(false);
    if (connectionStatus.textContent.includes('correctamente')) {
      setTimeout(() => updateConnectionStatus('Conectado. Listo para enviar instrucciones.', false), 1200);
    }
  }
});

appendMessage('assistant', 'Inicializado. Describe tu idea y comenzaré a construir la visión del producto.');
renderSummary({ iterationCount: 0, pendingHumanReview: false, projectVision: '', docs: [] });
if (window.lucide) {
  window.lucide.createIcons();
}
