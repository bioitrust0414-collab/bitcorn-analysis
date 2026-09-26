// Vercel Serverless Function: POST /api/notify
// Secrets stay server-side in Vercel environment variables.
// Configure one or both channels:
// TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
// LINE_CHANNEL_ACCESS_TOKEN + LINE_USER_ID

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }

  const message = body?.message ? String(body.message).slice(0, 1000) : '';
  if (!message) {
    return res.status(400).json({ ok: false, error: 'Missing message' });
  }

  const results = {};
  let configured = false;

  const tgToken = process.env.TELEGRAM_BOT_TOKEN;
  const tgChatId = process.env.TELEGRAM_CHAT_ID;
  if (tgToken && tgChatId) {
    configured = true;
    try {
      const r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: message }),
      });
      results.telegram = r.ok;
    } catch (_) {
      results.telegram = false;
    }
  }

  const lineToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const lineUserId = process.env.LINE_USER_ID;
  if (lineToken && lineUserId) {
    configured = true;
    try {
      const r = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${lineToken}`,
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [{ type: 'text', text: message }],
        }),
      });
      results.line = r.ok;
    } catch (_) {
      results.line = false;
    }
  }

  if (!configured) {
    return res.status(503).json({
      ok: false,
      error: 'No notification channel configured',
      results,
    });
  }

  const delivered = Object.values(results).some(Boolean);
  return res.status(delivered ? 200 : 502).json({
    ok: delivered,
    results,
  });
}
