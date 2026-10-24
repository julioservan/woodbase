// Envío de emails con Resend (https://resend.com), por su API HTTP: no
// hace falta ninguna dependencia. RESEND_API_KEY es obligatoria; EMAIL_FROM
// es opcional (el remitente de pruebas de Resend solo envía al email de la
// propia cuenta de Resend, que aquí basta).
const DEFAULT_FROM = "Woodbase <onboarding@resend.dev>";

export async function sendLoginCode(to: string, code: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY no está definida");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [to],
      subject: `${code} es tu código de Woodbase`,
      text: `Tu código para entrar en Woodbase es ${code}.\n\nCaduca en 10 minutos. Si no lo has pedido tú, ignora este email.`,
      html: `<div style="font-family:system-ui,sans-serif;color:#3a2c1c">
  <p>Tu código para entrar en <strong>Woodbase</strong> es:</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
  <p style="color:#8a7a61;font-size:13px">Caduca en 10 minutos. Si no lo has pedido tú, ignora este email.</p>
</div>`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend respondió ${res.status}: ${await res.text()}`);
  }
}
