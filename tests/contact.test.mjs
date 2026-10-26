// Tests für netlify/functions/contact.mjs – Brevo wird simuliert, es geht nichts raus.
// Ausführen: node --test tests/*.test.mjs
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

let calls = [];
let failOn = null; // z. B. "notification" | "confirmation" | "contacts"

globalThis.fetch = async (url, opts) => {
  const body = JSON.parse(opts.body);
  const kind = url.endsWith("/contacts") ? "contacts" : body.tags?.includes("benachrichtigung") ? "notification" : "confirmation";
  calls.push({ url, kind, body, headers: opts.headers });
  if (failOn === kind) return new Response('{"message":"simulated error"}', { status: 400 });
  return new Response('{"messageId":"x"}', { status: 201 });
};

const { default: handler } = await import("../netlify/functions/contact.mjs");

const valid = {
  name: "Max Mustermann",
  company: "Muster Immobilien GmbH",
  email: "max@example.com",
  phone: "06131 123456",
  topic: "Brandschutzbegehung",
  message: "Bitte um ein Angebot für eine Begehung.",
  consent: true,
  lang: "de",
};

const post = (b, raw) =>
  handler(new Request("http://x/api/contact", { method: "POST", body: raw ?? JSON.stringify(b) }));
const byKind = (k) => calls.find((c) => c.kind === k);

beforeEach(() => {
  calls = [];
  failOn = null;
  process.env.BREVO_API_KEY = "test-key";
  for (const k of ["BREVO_LIST_ID", "BREVO_SENDER_EMAIL", "BREVO_SENDER_NAME", "CONTACT_TO_EMAIL"]) delete process.env[k];
});

test("gültige Anfrage: Benachrichtigung + Bestätigung", async () => {
  const r = await post(valid);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true });
  assert.equal(calls.length, 2);
  const n = byKind("notification"), c = byKind("confirmation");
  assert.equal(n.body.to[0].email, "ai2fireprotection@gmail.com");
  assert.equal(n.body.replyTo.email, "max@example.com");
  assert.match(n.body.subject, /Brandschutzbegehung/);
  assert.equal(c.body.to[0].email, "max@example.com");
  assert.equal(c.body.replyTo.email, "ai2fireprotection@gmail.com");
  assert.equal(c.body.subject, "Ihre Anfrage bei Ai2fireprotection");
  assert.equal(n.headers["api-key"], "test-key");
});

test("englische Seite → englische Bestätigung", async () => {
  await post({ ...valid, lang: "en" });
  const c = byKind("confirmation");
  assert.equal(c.body.subject, "Your inquiry to Ai2fireprotection");
  assert.match(c.body.htmlContent, /Kind regards/);
});

test("unbekannte Sprache fällt auf Deutsch zurück", async () => {
  await post({ ...valid, lang: "fr" });
  assert.equal(byKind("confirmation").body.subject, "Ihre Anfrage bei Ai2fireprotection");
});

for (const [label, patch] of [
  ["ohne Name", { name: "  " }],
  ["ohne Nachricht", { message: "" }],
  ["ungültige E-Mail", { email: "max@" }],
  ["E-Mail mit Leerzeichen", { email: "max @example.com" }],
  ["ohne Einwilligung", { consent: false }],
  ["Einwilligung als Text statt Häkchen", { consent: "true" }],
]) {
  test(`abgelehnt: ${label}`, async () => {
    const r = await post({ ...valid, ...patch });
    assert.equal(r.status, 422);
    assert.equal(calls.length, 0);
  });
}

test("Spam-Bot (Honeypot ausgefüllt): stilles OK, nichts verschickt", async () => {
  const r = await post({ ...valid, website: "http://spam.example" });
  assert.equal(r.status, 200);
  assert.equal(calls.length, 0);
});

test("GET wird abgelehnt", async () => {
  const r = await handler(new Request("http://x/api/contact"));
  assert.equal(r.status, 405);
});

test("kaputtes JSON → 400", async () => {
  const r = await post(null, "{nicht json");
  assert.equal(r.status, 400);
});

test("fehlender API-Schlüssel → 500, nichts verschickt", async () => {
  delete process.env.BREVO_API_KEY;
  const r = await post(valid);
  assert.equal(r.status, 500);
  assert.equal(calls.length, 0);
});

test("Brevo-Fehler bei Benachrichtigung → 502 (Besucher sieht Fehlermeldung)", async () => {
  failOn = "notification";
  const r = await post(valid);
  assert.equal(r.status, 502);
  assert.equal(calls.length, 1, "Bestätigung darf dann nicht rausgehen");
});

test("Brevo-Fehler nur bei Bestätigung → Anfrage gilt trotzdem als angekommen", async () => {
  failOn = "confirmation";
  const r = await post(valid);
  assert.equal(r.status, 200);
});

test("Kontaktliste nur mit BREVO_LIST_ID", async () => {
  await post(valid);
  assert.equal(byKind("contacts"), undefined);
  calls = [];
  process.env.BREVO_LIST_ID = "7";
  await post(valid);
  const k = byKind("contacts");
  assert.deepEqual(k.body.listIds, [7]);
  assert.equal(k.body.attributes.FIRSTNAME, "Max");
  assert.equal(k.body.attributes.LASTNAME, "Mustermann");
  assert.equal(k.body.updateEnabled, true);
});

test("Fehler beim Listeneintrag blockiert die Anfrage nicht", async () => {
  process.env.BREVO_LIST_ID = "7";
  failOn = "contacts";
  const r = await post(valid);
  assert.equal(r.status, 200);
});

test("HTML/Script im Text wird entschärft", async () => {
  await post({ ...valid, name: '<b>Max</b>', message: '<script>alert(1)</script><img src=x onerror=alert(2)>' });
  for (const c of calls) {
    assert.ok(!c.body.htmlContent.includes("<script>alert"), c.kind);
    assert.ok(!c.body.htmlContent.includes("<img src=x"), c.kind);
    assert.ok(!c.body.htmlContent.includes("<b>Max</b>"), c.kind);
  }
});

test("Zeilenumbrüche im Namen landen nicht im Betreff", async () => {
  await post({ ...valid, name: "Max\r\nBcc: evil@example.com" });
  const n = byKind("notification");
  assert.ok(!/[\r\n]/.test(n.body.subject));
  assert.ok(!/[\r\n]/.test(n.body.replyTo.name));
});

test("überlange Nachricht wird auf 5000 Zeichen gekürzt", async () => {
  await post({ ...valid, message: "a".repeat(20000) });
  assert.equal(byKind("notification").body.textContent.match(/a+$/)[0].length, 5000);
});

test("Umlaute und Sonderzeichen bleiben erhalten", async () => {
  await post({ ...valid, name: "Jörg Müßig", message: "Prüfung für Büro & Lager – „dringend“" });
  const n = byKind("notification");
  assert.match(n.body.subject, /Jörg Müßig/);
  assert.match(n.body.textContent, /Prüfung für Büro & Lager – „dringend“/);
});

test("Absender/Empfänger über Umgebungsvariablen umstellbar", async () => {
  process.env.BREVO_SENDER_EMAIL = "info@ai2fireprotection.com";
  process.env.CONTACT_TO_EMAIL = "isaac@ai2fireprotection.com";
  await post(valid);
  assert.equal(byKind("notification").body.to[0].email, "isaac@ai2fireprotection.com");
  assert.equal(byKind("confirmation").body.sender.email, "info@ai2fireprotection.com");
});

test("optionale Felder leer → keine leeren Zeilen in der Mail", async () => {
  await post({ ...valid, company: "", phone: "" });
  const html = byKind("confirmation").body.htmlContent;
  assert.ok(!html.includes(">Unternehmen<"));
  assert.ok(!html.includes(">Telefon<"));
});
