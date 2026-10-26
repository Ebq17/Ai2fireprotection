// Kontaktformular → Brevo (Transaktions-E-Mails)
//
// Verschickt pro Anfrage zwei E-Mails über die Brevo-API:
//   1. Benachrichtigung an Ai2fireprotection (Antworten gehen direkt an den Kunden)
//   2. Eingangsbestätigung an den Kunden (Deutsch oder Englisch, je nach Seite)
// Optional: Kunde wird zusätzlich als Kontakt in einer Brevo-Liste gespeichert.
//
// Benötigte Umgebungsvariablen in Netlify (Project configuration → Environment variables):
//   BREVO_API_KEY        Pflicht – API-Schlüssel aus Brevo (SMTP & API → API-Schlüssel)
//   BREVO_SENDER_EMAIL   optional – verifizierter Absender in Brevo (Standard: ai2fireprotection@gmail.com)
//   BREVO_SENDER_NAME    optional – Absendername (Standard: Ai2fireprotection)
//   CONTACT_TO_EMAIL     optional – Empfänger der Benachrichtigung (Standard: ai2fireprotection@gmail.com)
//   BREVO_LIST_ID        optional – Listen-ID, wenn Anfragende als Kontakt gespeichert werden sollen

const BREVO_URL = "https://api.brevo.com/v3";
const DEFAULT_EMAIL = "ai2fireprotection@gmail.com";
const SITE_URL = "https://ai2fireprotection.com";
const ACCENT = "#ff5a1f";

const LIMITS = { name: 120, company: 160, email: 200, phone: 60, topic: 80, message: 5000 };

const TEXT = {
  de: {
    confirmSubject: "Ihre Anfrage bei Ai2fireprotection",
    hello: (n) => `Guten Tag ${n},`,
    intro:
      "vielen Dank für Ihre Nachricht. Ihre Anfrage ist bei uns eingegangen – wir melden uns in der Regel innerhalb von 1–2 Werktagen bei Ihnen.",
    summary: "Ihre Angaben im Überblick",
    labels: { topic: "Thema", company: "Unternehmen", phone: "Telefon", message: "Nachricht" },
    urgent: "Bei dringenden Anliegen erreichen Sie uns auch direkt per Antwort auf diese E-Mail.",
    regards: "Mit freundlichen Grüßen",
    footer: "Vorbeugender Brandschutz · Mainz & Rhein-Main",
    note: "Diese E-Mail wurde automatisch versendet, weil Sie das Kontaktformular auf ai2fireprotection.com ausgefüllt haben.",
  },
  en: {
    confirmSubject: "Your inquiry to Ai2fireprotection",
    hello: (n) => `Hello ${n},`,
    intro:
      "thank you for your message. We have received your inquiry and will usually get back to you within 1–2 business days.",
    summary: "Your details at a glance",
    labels: { topic: "Topic", company: "Company", phone: "Phone", message: "Message" },
    urgent: "For urgent matters, you can also simply reply to this email.",
    regards: "Kind regards",
    footer: "Preventive fire protection · Mainz & Rhine-Main",
    note: "This email was sent automatically because you filled in the contact form on ai2fireprotection.com.",
  },
};

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clean(v, max) {
  return typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max) : "";
}

// Kopfzeilen dürfen keine Zeilenumbrüche enthalten
function oneLine(v) {
  return v.replace(/[\r\n]+/g, " ").trim();
}

function isEmail(v) {
  return /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/.test(v);
}

function rows(pairs) {
  return pairs
    .filter(([, v]) => v)
    .map(
      ([k, v]) => `
        <tr>
          <td style="padding:8px 12px 8px 0;color:#7a6f66;font-size:13px;vertical-align:top;white-space:nowrap;">${esc(k)}</td>
          <td style="padding:8px 0;color:#17110c;font-size:14px;vertical-align:top;">${esc(v).replace(/\n/g, "<br>")}</td>
        </tr>`
    )
    .join("");
}

function layout({ preheader, title, body, footerNote }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f7f3ee;font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ee;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid rgba(23,17,12,0.08);">
        <tr><td style="background:#0e0c0b;padding:20px 28px;">
          <span style="font-family:Oswald,Arial Narrow,Arial,sans-serif;font-size:20px;font-weight:700;letter-spacing:.04em;color:#f2ede8;text-transform:uppercase;">Ai2<span style="color:${ACCENT};">fire</span>protection</span>
        </td></tr>
        <tr><td style="height:4px;background:${ACCENT};line-height:4px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:28px;color:#17110c;font-size:15px;line-height:1.6;">${body}</td></tr>
        <tr><td style="padding:18px 28px;background:#efe9e1;color:#7a6f66;font-size:12px;line-height:1.5;">
          Ai2fireprotection · Isaac Addae · Jakob-Sieben-Str. 10, 55130 Mainz<br>
          <a href="${SITE_URL}" style="color:${ACCENT};text-decoration:none;">ai2fireprotection.com</a> · ${esc(DEFAULT_EMAIL)}
          ${footerNote ? `<br><br>${esc(footerNote)}` : ""}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function notificationEmail(d) {
  const subject = oneLine(`Neue Anfrage: ${d.topic || "Kontaktformular"} – ${d.name}`);
  const body = `
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${ACCENT};font-weight:700;">Neue Anfrage über die Website</p>
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:#17110c;">${esc(d.topic || "Kontaktformular")}</h1>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      ${rows([
        ["Name", d.name],
        ["Unternehmen", d.company],
        ["E-Mail", d.email],
        ["Telefon", d.phone],
        ["Thema", d.topic],
        ["Sprache", d.lang === "en" ? "Englisch" : "Deutsch"],
      ])}
    </table>
    <div style="margin:20px 0 0;padding:16px 18px;background:#f7f3ee;border-left:3px solid ${ACCENT};border-radius:4px;white-space:normal;">
      ${esc(d.message).replace(/\n/g, "<br>")}
    </div>
    <p style="margin:22px 0 0;">
      <a href="mailto:${esc(d.email)}?subject=${encodeURIComponent("Re: " + (d.topic || "Ihre Anfrage"))}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:6px;">Antworten →</a>
    </p>
    <p style="margin:14px 0 0;font-size:12px;color:#7a6f66;">Du kannst auch einfach auf diese E-Mail antworten – die Antwort geht direkt an ${esc(d.email)}.</p>`;
  const text = [
    "Neue Anfrage über die Website",
    "",
    `Name: ${d.name}`,
    `Unternehmen: ${d.company || "-"}`,
    `E-Mail: ${d.email}`,
    `Telefon: ${d.phone || "-"}`,
    `Thema: ${d.topic || "-"}`,
    "",
    d.message,
  ].join("\n");
  return { subject, html: layout({ preheader: `${d.name}: ${d.message.slice(0, 90)}`, title: subject, body }), text };
}

function confirmationEmail(d) {
  const t = TEXT[d.lang] || TEXT.de;
  const body = `
    <p style="margin:0 0 14px;">${esc(t.hello(d.name))}</p>
    <p style="margin:0 0 22px;">${esc(t.intro)}</p>
    <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${ACCENT};font-weight:700;">${esc(t.summary)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      ${rows([
        [t.labels.topic, d.topic],
        [t.labels.company, d.company],
        [t.labels.phone, d.phone],
        [t.labels.message, d.message],
      ])}
    </table>
    <p style="margin:22px 0 0;">${esc(t.urgent)}</p>
    <p style="margin:22px 0 0;">${esc(t.regards)}<br><strong>Isaac Addae</strong><br><span style="color:#7a6f66;font-size:13px;">Ai2fireprotection · ${esc(t.footer)}</span></p>`;
  const text = [
    t.hello(d.name),
    "",
    t.intro,
    "",
    `${t.labels.topic}: ${d.topic || "-"}`,
    `${t.labels.message}:`,
    d.message,
    "",
    t.urgent,
    "",
    t.regards,
    "Isaac Addae – Ai2fireprotection",
    SITE_URL,
  ].join("\n");
  return {
    subject: t.confirmSubject,
    html: layout({ preheader: t.intro, title: t.confirmSubject, body, footerNote: t.note }),
    text,
  };
}

async function brevo(path, apiKey, payload) {
  const res = await fetch(`${BREVO_URL}${path}`, {
    method: "POST",
    headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo ${path} → ${res.status} ${detail.slice(0, 300)}`);
  }
  return res;
}

export default async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.error("BREVO_API_KEY fehlt");
    return json(500, { ok: false, error: "not_configured" });
  }

  let input;
  try {
    input = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  // Honeypot: echte Besucher lassen dieses Feld leer
  if (clean(input.website, 200)) return json(200, { ok: true });

  const d = {
    name: oneLine(clean(input.name, LIMITS.name)),
    company: oneLine(clean(input.company, LIMITS.company)),
    email: oneLine(clean(input.email, LIMITS.email)),
    phone: oneLine(clean(input.phone, LIMITS.phone)),
    topic: oneLine(clean(input.topic, LIMITS.topic)),
    message: clean(input.message, LIMITS.message),
    lang: input.lang === "en" ? "en" : "de",
    consent: input.consent === true,
  };

  if (!d.name || !d.message || !isEmail(d.email) || !d.consent) {
    return json(422, { ok: false, error: "validation" });
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || DEFAULT_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "Ai2fireprotection";
  const ownerEmail = process.env.CONTACT_TO_EMAIL || DEFAULT_EMAIL;
  const sender = { email: senderEmail, name: senderName };

  // 1) Benachrichtigung an Ai2fireprotection – muss klappen
  const n = notificationEmail(d);
  try {
    await brevo("/smtp/email", apiKey, {
      sender: { email: senderEmail, name: "Website Ai2fireprotection" },
      to: [{ email: ownerEmail, name: "Ai2fireprotection" }],
      replyTo: { email: d.email, name: d.name },
      subject: n.subject,
      htmlContent: n.html,
      textContent: n.text,
      tags: ["kontaktformular", "benachrichtigung"],
    });
  } catch (err) {
    console.error(err);
    return json(502, { ok: false, error: "send_failed" });
  }

  // 2) Bestätigung an den Kunden + optionaler Listeneintrag – Fehler hier blockieren die Anfrage nicht
  const c = confirmationEmail(d);
  const extras = [
    brevo("/smtp/email", apiKey, {
      sender,
      to: [{ email: d.email, name: d.name }],
      replyTo: { email: ownerEmail, name: senderName },
      subject: c.subject,
      htmlContent: c.html,
      textContent: c.text,
      tags: ["kontaktformular", "bestaetigung"],
    }),
  ];

  const listId = Number(process.env.BREVO_LIST_ID);
  if (Number.isInteger(listId) && listId > 0) {
    const [first, ...rest] = d.name.split(" ");
    extras.push(
      brevo("/contacts", apiKey, {
        email: d.email,
        attributes: { FIRSTNAME: first, LASTNAME: rest.join(" ") },
        listIds: [listId],
        updateEnabled: true,
      })
    );
  }

  const results = await Promise.allSettled(extras);
  results.forEach((r) => r.status === "rejected" && console.error(r.reason));

  return json(200, { ok: true });
};

export const config = { path: "/api/contact" };
