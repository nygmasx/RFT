type EmailInput = { to: string; subject: string; text: string; actionUrl?: string; actionLabel?: string };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]!);
}

export async function sendTransactionalEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn(JSON.stringify({ level: 'warn', event: 'email_not_configured', to: input.to }));
    return;
  }
  const action = input.actionUrl
    ? `<p><a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;padding:12px 18px;background:#C8362D;color:white;text-decoration:none;border-radius:4px">${escapeHtml(input.actionLabel ?? 'Continuer')}</a></p>`
    : '';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: `${input.text}${input.actionUrl ? `\n\n${input.actionUrl}` : ''}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h1 style="font-size:22px">Ronin Fight Team</h1><p>${escapeHtml(input.text)}</p>${action}<p style="color:#666;font-size:12px">Si tu n’es pas à l’origine de cette demande, ignore cet email.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
}
