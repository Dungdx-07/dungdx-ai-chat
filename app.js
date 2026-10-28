const $ = (s) => document.querySelector(s);
const chatArea = $('#chatArea');
const messagesEl = $('#messages');
const welcome = $('#welcome');
const input = $('#messageInput');
const sendBtn = $('#sendBtn');
const toast = $('#toast');
const STORAGE_KEY = 'dungdx-ai-chat-v1';
let messages = [];
let busy = false;
let toastTimer;

function notify(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// Small safe Markdown renderer for plain text, lists, headings and fenced code.
function renderMarkdown(raw) {
  const blocks = [];
  let text = escapeHtml(raw).replace(/```([\w-]*)\n([\s\S]*?)```/g, (_m, lang, code) => {
    blocks.push(`<pre><code>${code.trimEnd()}</code></pre>`); return `@@BLOCK${blocks.length-1}@@`;
  });
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^# (.+)$/gm, '<h1>$1</h1>');
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
  const lines = text.split('\n'); let html = ''; let list = '';
  const closeList = () => { if (list) { html += `</${list}>`; list = ''; } };
  for (const line of lines) {
    const ul = /^\s*[-*]\s+(.+)$/.exec(line); const ol = /^\s*\d+\.\s+(.+)$/.exec(line);
    if (ul || ol) { const type = ul ? 'ul' : 'ol'; if (list !== type) { closeList(); list = type; html += `<${type}>`; } html += `<li>${(ul || ol)[1]}</li>`; }
    else { closeList(); if (/^@@BLOCK\d+@@$/.test(line)) html += line; else if (/^<h[1-3]>/.test(line)) html += line; else if (line.trim()) html += `<p>${line}</p>`; }
  }
  closeList();
  html = html.replace(/@@BLOCK(\d+)@@/g, (_m, n) => blocks[Number(n)] || '');
  return html;
}
function save() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))); } catch {} }
function scrollBottom() { chatArea.scrollTop = chatArea.scrollHeight; }
function addMessage(role, content, opts={}) {
  const wrap = document.createElement('article'); wrap.className = `message ${role}`;
  const avatar = document.createElement('div'); avatar.className = 'avatar'; avatar.textContent = role === 'user' ? 'B' : '✦';
  const bubble = document.createElement('div'); bubble.className = 'bubble';
  if (opts.typing) { bubble.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>'; wrap.dataset.typing = '1'; }
  else if (role === 'assistant') bubble.innerHTML = renderMarkdown(content);
  else bubble.textContent = content;
  wrap.append(avatar, bubble); messagesEl.append(wrap); scrollBottom(); return wrap;
}
function showConversation() { welcome.hidden = messages.length > 0; messagesEl.innerHTML = ''; for (const m of messages) addMessage(m.role, m.content); }
function resetChat() { messages = []; save(); showConversation(); input.focus(); }
function fitInput() { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 180)}px`; }
async function send(text) {
  const content = (text ?? input.value).trim();
  if (!content || busy) return;
  if (content.length > 6000) return notify('Tin nhắn tối đa 6.000 ký tự.');
  busy = true; sendBtn.disabled = true; input.value = ''; fitInput(); welcome.hidden = true;
  messages.push({role:'user', content}); addMessage('user', content); save();
  const typing = addMessage('assistant', '', {typing:true});
  try {
    const history = messages.slice(-20).map(({role,content}) => ({role,content}));
    const response = await fetch('/api/chat', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:history})});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Lỗi máy chủ (${response.status})`);
    const answer = data.answer;
    if (typeof answer !== 'string' || !answer.trim()) throw new Error('AI trả về câu trả lời rỗng.');
    messages.push({role:'assistant',content:answer});
    typing.querySelector('.bubble').innerHTML = renderMarkdown(answer); delete typing.dataset.typing; save(); scrollBottom();
  } catch (err) {
    typing.remove();
    addMessage('assistant', `**Chưa gửi được câu hỏi.**\n\n${err.message || 'Đã xảy ra lỗi không xác định.'}`);
    notify('Không kết nối được AI');
  } finally { busy = false; sendBtn.disabled = false; input.focus({preventScroll:true}); }
}
$('#chatForm').addEventListener('submit', e => { e.preventDefault(); send(); });
input.addEventListener('input', fitInput);
input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
$('#newChat').addEventListener('click', () => { resetChat(); $('#sidebar').classList.remove('open'); });
$('#clearChat').addEventListener('click', () => { if (messages.length) resetChat(); else notify('Cuộc trò chuyện đang trống.'); });
$('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
document.querySelectorAll('[data-prompt]').forEach(el => el.addEventListener('click', () => { const p = el.dataset.prompt; $('#sidebar').classList.remove('open'); send(p); }));
try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); if (Array.isArray(saved)) messages = saved.filter(m => m && ['user','assistant'].includes(m.role) && typeof m.content === 'string').slice(-40); } catch {}
showConversation();
