const https = require('https');

function postForm(url, data) {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(data).toString();
    const u = new URL(url);
    const options = {
      method: 'POST',
      hostname: u.hostname,
      path: u.pathname,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(body || '{}');
          resolve(json);
        } catch (e) {
          resolve({ success: false });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function isLocalhostHost(h) {
  if (!h) return false;
  const host = String(h).split(':')[0].toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function isTurnstileEnabled(req) {
  const flag = (process.env.TURNSTILE_ENABLED || 'true').toLowerCase();
  if (flag === 'false' || flag === '0' || flag === 'off') return false;
  if (process.env.NODE_ENV !== 'production') {
    // Auto-disable on localhost during development for convenience
    if (req && (isLocalhostHost(req.hostname) || isLocalhostHost(req.headers && req.headers.host))) return false;
  }
  return true;
}

async function verifyTurnstile(response, remoteip, req) {
  // Shortcut if disabled (env or localhost dev)
  if (!isTurnstileEnabled(req)) return true;
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    // If not configured, allow to avoid blocking local/dev accidentally
    console.warn('TURNSTILE_SECRET not set; skipping Turnstile verification');
    return true;
  }
  if (!response) return false;
  try {
    const result = await postForm('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      secret,
      response,
      remoteip: remoteip || ''
    });
    return !!(result && result.success);
  } catch (e) {
    console.error('Turnstile verify error:', e && e.message ? e.message : e);
    return false;
  }
}

function requireTurnstile() {
  return async (req, res, next) => {
    try {
      const token = req.body && (req.body['cf-turnstile-response'] || req.body['cf_turnstile_response']);
      const ok = await verifyTurnstile(token, req.ip, req);
      if (ok) return next();
    } catch (e) {
      console.error('Turnstile middleware error:', e);
    }
    // On failure, redirect back or send 400
    const back = req.body && (req.body.returnTo || req.body.redirectHash) ? (req.get('referer') || '/') : (req.get('referer') || '/');
    if (req.accepts('html')) return res.status(400).redirect(back);
    res.status(400).send('Turnstile verification failed');
  };
}

module.exports = { verifyTurnstile, requireTurnstile, isTurnstileEnabled };
