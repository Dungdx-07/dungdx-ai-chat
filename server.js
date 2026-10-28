import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const FAL_KEY = process.env.FAL_KEY;
const MODEL = process.env.FAL_MODEL || 'google/gemini-2.5-flash';

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Lightweight per-process rate limit. For a public launch, use a durable shared limiter,
// user authentication, and provider-side spending limits as well.
const requests = new Map();
function rateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const record = requests.get(key) || { start: now, count: 0 };
  if (now - record.start > windowMs) { record.start = now; record.count = 0; }
  record.count += 1;
  requests.set(key, record);
  if (record.count > 12) return res.status(429).json({ error: 'Bạn gửi quá nhanh. Hãy đợi khoảng một phút rồi thử lại.' });
  next();
}

app.get('/api/health', (_req, res) => res.json({ ok: true, configured: Boolean(FAL_KEY && !FAL_KEY.includes('put_your_')) }));

app.post('/api/chat', rateLimit, async (req, res) => {
  if (!FAL_KEY || FAL_KEY.includes('put_your_')) {
    return res.status(503).json({ error: 'Máy chủ chưa được cấu hình FAL_KEY. Hãy thêm khóa vào tệp .env rồi khởi động lại.' });
  }
  const incoming = req.body?.messages;
  if (!Array.isArray(incoming) || incoming.length === 0 || incoming.length > 20) {
    return res.status(400).json({ error: 'Tin nhắn không hợp lệ (giới hạn 20 lượt gần nhất).' });
  }
  const messages = [];
  for (const m of incoming) {
    if (!m || !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string') continue;
    const content = m.content.trim().slice(0, 6000);
    if (content) messages.push({ role: m.role, content });
  }
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'Tin nhắn cuối cùng phải là câu hỏi của bạn.' });
  }
  try {
    const response = await fetch('https://fal.run/openrouter/router/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'Bạn là Dũng AI, một trợ lý trò chuyện hữu ích. Trả lời bằng tiếng Việt tự nhiên trừ khi người dùng yêu cầu ngôn ngữ khác. Với câu hỏi khó, giải thích rõ ràng theo từng bước; nếu không chắc, hãy nói rõ thay vì bịa. Giữ câu trả lời phù hợp với người dùng trẻ tuổi.' },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 700
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('fal API error status:', response.status, data?.error?.message || data?.message || 'unknown');
      return res.status(502).json({ error: 'Dịch vụ AI chưa trả lời được. Kiểm tra khóa API, số dư và tên mô hình trong tài khoản fal.ai.' });
    }
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) {
      return res.status(502).json({ error: 'Mô hình không trả về nội dung. Hãy thử lại.' });
    }
    res.json({ answer: answer.trim(), usage: data.usage ? {
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens
    } : undefined, model: MODEL });
  } catch (err) {
    console.error('Chat request failed:', err?.message || err);
    res.status(502).json({ error: 'Không kết nối được dịch vụ AI. Kiểm tra mạng máy chủ rồi thử lại.' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dũng AI Chat đang chạy tại http://localhost:${PORT}`);
  if (!FAL_KEY || FAL_KEY.includes('put_your_')) console.log('Thiếu FAL_KEY: hãy tạo .env từ .env.example và thêm khóa mới.');
});
