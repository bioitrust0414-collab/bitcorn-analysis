export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', Allow: 'POST' }
    });
  }

  let body = {};
  try { body = await req.json(); } catch (_) {}
  const message = body?.message ? String(body.message).slice(0, 1000) : '';

  if (!message) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing message' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const results = {};
  let configured = false;

  const tgToken = Netlify.env.get('TELEGRAM_BOT_TOKEN');
  const tgChatId = Netlify.env.get('TELEGRAM_CHAT_ID');
  if (tgToken && tgChatId) {
    configured = true;
    try {
      const r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: message })
      });
      results.telegram = r.ok;
    } catch (_) {
      results.telegram = false;
    }
  }

  const lineToken = Netlify.env.get('LINE_CHANNEL_ACCESS_TOKEN');
  const lineUserId = Netlify.env.get('LINE_USER_ID');
  if (lineToken && lineUserId) {
    configured = true;
    try {
      const r = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${lineToken}`
        },
        body: JSON.stringify({
          to: lineUserId,
          messages: [{ type: 'text', text: message }]
        })
      });
      results.line = r.ok;
    } catch (_) {
      results.line = false;
    }
  }

  if (!configured) {
    return new Response(JSON.stringify({ ok: false, error: 'No notification channel configured', results }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  const delivered = Object.values(results).some(Boolean);
  return new Response(JSON.stringify({ ok: delivered, results }), {
    status: delivered ? 200 : 502,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
};

export const config = { path: '/api/notify' };
