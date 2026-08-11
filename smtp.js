import { connect } from "cloudflare:sockets";

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function encodedSubject(subject) {
  return `=?UTF-8?B?${utf8ToBase64(subject)}?=`;
}

class SmtpConn {
  constructor(socket) {
    this.socket = socket;
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
    this.decoder = new TextDecoder();
    this.buffer = "";
  }

  async readResponse() {
    while (true) {
      const lines = this.buffer.split("\r\n").filter(Boolean);
      const last = lines[lines.length - 1];
      if (last && /^\d{3} /.test(last)) {
        const code = parseInt(last.slice(0, 3), 10);
        this.buffer = this.buffer.slice(this.buffer.lastIndexOf(last) + last.length + 2);
        return { code, lines };
      }
      const { value, done } = await this.reader.read();
      if (done) throw new Error("smtp_connection_closed");
      this.buffer += this.decoder.decode(value, { stream: true });
    }
  }

  async send(line) {
    await this.writer.write(new TextEncoder().encode(line + "\r\n"));
  }

  async command(line, expectCode) {
    if (line !== null) await this.send(line);
    const { code, lines } = await this.readResponse();
    if (expectCode && code !== expectCode) {
      throw new Error(`smtp_unexpected_response: ${lines.join(" | ")}`);
    }
    return { code, lines };
  }

  async close() {
    try { await this.send("QUIT"); } catch {}
    try { this.writer.releaseLock(); } catch {}
    try { this.reader.releaseLock(); } catch {}
    try { await this.socket.close(); } catch {}
  }
}

export async function sendMail(env, { to, cc, subject, text }) {
  const user = env.GMAIL_USER;
  const pass = env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("missing_gmail_credentials");

  const socket = connect({ hostname: "smtp.gmail.com", port: 465 }, { secureTransport: "on" });
  const conn = new SmtpConn(socket);

  try {
    await conn.readResponse();
    await conn.command("EHLO polimer-etp.cl");
    await conn.command("AUTH LOGIN", 334);
    await conn.command(utf8ToBase64(user), 334);
    await conn.command(utf8ToBase64(pass), 235);
    await conn.command(`MAIL FROM:<${user}>`, 250);

    const recipients = [to, ...(cc ? [cc] : [])];
    for (const rcpt of recipients) {
      await conn.command(`RCPT TO:<${rcpt}>`, 250);
    }

    await conn.command("DATA", 354);

    const headers = [
      `From: ETP Polimer <${user}>`,
      `To: ${to}`,
      cc ? `Cc: ${cc}` : null,
      `Subject: ${encodedSubject(subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset="UTF-8"`,
      `Content-Transfer-Encoding: 8bit`,
    ].filter(Boolean).join("\r\n");

    const escapedText = text.replace(/\r\n\./g, "\r\n..").replace(/\n\./g, "\n..");
    const message = `${headers}\r\n\r\n${escapedText}\r\n.`;
    await conn.writer.write(new TextEncoder().encode(message + "\r\n"));
    await conn.readResponse();

    await conn.close();
    return true;
  } catch (err) {
    try { await conn.close(); } catch {}
    throw err;
  }
}
