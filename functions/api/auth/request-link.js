export async function onRequestPost(context) {
  const { DB, RESEND_API_KEY, RESEND_FROM_EMAIL, APP_URL } = context.env;

  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await DB.prepare(
    'INSERT INTO magic_tokens (id, email, token, expires_at, used) VALUES (?, ?, ?, ?, 0)'
  ).bind(crypto.randomUUID(), email, token, expiresAt).run();

  const magicLink = `${APP_URL}/api/auth/verify?token=${token}`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: email,
      subject: 'Your Scorecard Club sign-in link',
      html: buildEmailHtml(magicLink),
      text: `Sign in to Scorecard Club:\n${magicLink}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
    }),
  });

  if (!resendRes.ok) {
    const resendError = await resendRes.json().catch(() => ({}));
    console.error('Resend error', resendRes.status, JSON.stringify(resendError));
    return Response.json({ error: 'Failed to send email - please try again', debug: { status: resendRes.status, resend: resendError } }, { status: 500 });
  }

  return Response.json({ ok: true }, { status: 200 });
}

function buildEmailHtml(magicLink) {
  return `<!DOCTYPE html>
<html>
<body style="font-family: Georgia, serif; background: #faf8f5; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 8px; padding: 40px; border: 1px solid #e8e0d5;">
    <p style="font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; color: #8a7a6a; margin: 0 0 24px;">
      Scorecard <span style="color: #c17a5a;">Club</span>
    </p>
    <h1 style="font-size: 24px; font-weight: normal; color: #1a1a1a; margin: 0 0 16px;">Sign in to your account</h1>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.5; margin: 0 0 32px;">
      Click the button below to sign in. This link expires in 15 minutes.
    </p>
    <a href="${magicLink}"
       style="display: inline-block; background: #c17a5a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px;">
      Sign in to Scorecard Club
    </a>
    <p style="color: #8a7a6a; font-size: 13px; margin: 32px 0 0; line-height: 1.5;">
      Or copy this link into your browser:<br>
      <span style="color: #4a4a4a; word-break: break-all;">${magicLink}</span>
    </p>
    <hr style="border: none; border-top: 1px solid #e8e0d5; margin: 32px 0 24px;">
    <p style="color: #8a7a6a; font-size: 12px; margin: 0;">
      Built by Outbuild. If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;
}
