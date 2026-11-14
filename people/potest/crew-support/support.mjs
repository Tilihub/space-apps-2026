const transcript = document.querySelector('#transcript');
const feedback = document.querySelector('#feedback');
const modeLabel = document.querySelector('#mode');
const form = document.querySelector('#composer');
const input = document.querySelector('#message');
const send = document.querySelector('#send');
const humanSupport = document.querySelector('#human-support');
const messages = [];
const crew = new URLSearchParams(location.search).get('crew');
if (/^[123]$/.test(crew)) document.querySelector('#back-to-mind').href = `/?crew=${crew}#mind`;

let ready = false;
let pending;

function appendMessage(role, content) {
  const bubble = document.createElement('div');
  bubble.className = 'message';
  bubble.dataset.role = role;
  const author = document.createElement('strong');
  author.textContent = role === 'user' ? 'You' : 'Crew Support';
  const text = document.createElement('p');
  text.textContent = content;
  bubble.append(author, text);
  transcript.append(bubble);
  transcript.scrollTop = transcript.scrollHeight;
  return bubble;
}

function reset() {
  pending?.abort();
  pending = undefined;
  messages.length = 0;
  transcript.replaceChildren();
  appendMessage('assistant', 'What’s been on your mind today?');
  input.value = '';
  input.disabled = send.disabled = !ready;
  humanSupport.open = false;
  feedback.textContent = '';
}

document.querySelector('#clear').addEventListener('click', () => {
  reset();
  feedback.textContent = 'Chat cleared.';
  if (ready) input.focus();
});
window.addEventListener('pagehide', reset);
reset();

try {
  const response = await fetch('/api/crew-support/status');
  if (!response.ok) throw new Error();
  const { mode } = await response.json();
  const labels = {
    live: 'Live AI · Recent messages go to OpenAI. Use fictional details in this demo.',
    demo: 'Scripted demo · No messages go to OpenAI. Use fictional details.',
    unconfigured: 'AI chat unavailable · Set OPENAI_API_KEY on the server or start in scripted demo mode.',
  };
  modeLabel.textContent = labels[mode];
  ready = mode === 'live' || mode === 'demo';
  input.disabled = send.disabled = !ready;
} catch {
  modeLabel.textContent = 'The chat server is unavailable. Reload the page to reconnect.';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!ready || pending || !text) return;

  const controller = new AbortController();
  pending = controller;
  const latest = { role: 'user', content: text };
  const bubble = appendMessage(latest.role, latest.content);
  input.value = '';
  input.disabled = send.disabled = true;
  feedback.textContent = 'Waiting for a reply…';
  try {
    const response = await fetch('/api/crew-support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [...messages, latest] }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (pending !== controller) return;
    if (!response.ok) {
      feedback.textContent = data.error ?? 'Chat is unavailable. Try sending again.';
      bubble.remove();
      input.value = text;
      return;
    }
    messages.push(latest, { role: 'assistant', content: data.reply });
    if (messages.length > 10) messages.splice(0, 2);
    appendMessage('assistant', data.reply);
    if (data.urgent) humanSupport.open = true;
    feedback.textContent = '';
  } catch {
    if (pending !== controller) return;
    bubble.remove();
    input.value = text;
    feedback.textContent = 'The chat server could not be reached. Try sending again.';
  } finally {
    if (pending === controller) {
      pending = undefined;
      input.disabled = send.disabled = false;
      input.focus();
    }
  }
});
