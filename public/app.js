let sessionId = null;

const form = document.getElementById('messageForm');
const prompt = document.getElementById('prompt');
const feed = document.getElementById('feed');
const sessionLabel = document.getElementById('sessionLabel');
const iteration = document.getElementById('iteration');
const humanReview = document.getElementById('humanReview');
const vision = document.getElementById('vision');
const docs = document.getElementById('docs');

const roleClass = {
  user: 'border-zinc-700 bg-zinc-900/80',
  assistant: 'border-accent/40 bg-accent/5'
};

function appendMessage(role, content, label) {
  const bubble = document.createElement('article');
  bubble.className = `stagger-item rounded-xl border p-3 text-sm leading-relaxed ${roleClass[role] || roleClass.assistant}`;

  const title = document.createElement('p');
  title.className = 'mb-2 text-xs uppercase tracking-[0.18em] text-zinc-400';
  title.textContent = role === 'user' ? 'User Input' : label || 'System Output';

  const body = document.createElement('pre');
  body.className = 'whitespace-pre-wrap font-mono text-xs md:text-sm';
  body.textContent = content;

  bubble.append(title, body);
  feed.appendChild(bubble);

  requestAnimationFrame(() => bubble.classList.add('visible'));
  feed.scrollTo({ top: feed.scrollHeight, behavior: 'smooth' });
}

function renderSummary(summary) {
  iteration.textContent = summary.iterationCount;
  humanReview.textContent = summary.pendingHumanReview ? 'Sí' : 'No';
  vision.textContent = summary.projectVision || 'Sin definir';

  docs.innerHTML = '';
  summary.docs.forEach((docName, idx) => {
    const li = document.createElement('li');
    li.className = 'stagger-item';
    li.textContent = `${idx + 1}. ${docName}`;
    docs.appendChild(li);
    setTimeout(() => li.classList.add('visible'), idx * 70);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = prompt.value.trim();
  if (!message) return;

  prompt.value = '';
  appendMessage('user', message);

  try {
    const response = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, message })
    });

    const data = await response.json();
    if (!response.ok) {
      appendMessage('assistant', `Error: ${data.error || 'Unknown error'}`);
      return;
    }

    sessionId = data.sessionId;
    sessionLabel.textContent = `Session: ${sessionId}`;

    data.events.forEach((evt, idx) => {
      setTimeout(() => {
        const label = evt.agent ? evt.node : evt.node;
        appendMessage('assistant', `[${evt.node}]\n${evt.message.content}`, label);
      }, idx * 130);
    });

    renderSummary(data.summary);
  } catch (error) {
    appendMessage('assistant', `Fallo de red: ${error.message}`);
  }
});

appendMessage('assistant', 'Inicializado. Describe tu idea y comenzaré a construir la visión del producto.');
if (window.lucide) {
  window.lucide.createIcons();
}
