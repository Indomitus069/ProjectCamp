const nodemailer = require("nodemailer");
const dns = require("dns");

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

const resendApiKey = process.env.RESEND_API_KEY || "";
const hasResendConfig = Boolean(resendApiKey);
const hasMailConfig = Boolean(process.env.MAIL_USER && process.env.MAIL_PASS);
const isGmail = hasMailConfig && (
  (process.env.MAIL_USER || "").includes("gmail.com") ||
  (process.env.MAIL_USER || "").includes("googlemail.com")
);
// Use MAIL_HOST if set (e.g. smtp.gmail.com for Gmail/Workspace); else default by provider
const defaultHost = isGmail ? "smtp.gmail.com" : "smtp.ethereal.email";
const smtpConnectionTimeout = Number(process.env.MAIL_CONNECTION_TIMEOUT) || 15000;
const smtpGreetingTimeout = Number(process.env.MAIL_GREETING_TIMEOUT) || 10000;
const smtpSocketTimeout = Number(process.env.MAIL_SOCKET_TIMEOUT) || 20000;
const smtpDnsTimeout = Number(process.env.MAIL_DNS_TIMEOUT) || 10000;
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || defaultHost,
  port: Number(process.env.MAIL_PORT) || 587,
  secure: process.env.MAIL_SECURE === "true",
  family: 4,
  connectionTimeout: smtpConnectionTimeout,
  greetingTimeout: smtpGreetingTimeout,
  socketTimeout: smtpSocketTimeout,
  dnsTimeout: smtpDnsTimeout,
  auth: hasMailConfig
    ? {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      }
    : undefined,
});

if (hasResendConfig) {
  console.log("Mail provider configured: Resend API");
} else if (!hasMailConfig) {
  console.warn("Mail: MAIL_USER/MAIL_PASS not set. Invitation emails will not be sent. Add them to backend/.env for production or use Ethereal for testing.");
} else {
  console.log(
    `Mail transport configured for ${process.env.MAIL_USER} using ${(process.env.MAIL_HOST || defaultHost)}:${Number(process.env.MAIL_PORT) || 587}`
  );
}

const from = process.env.MAIL_FROM || "ProjectCamp <noreply@projectcamp.dev>";
const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
let mailTransportVerified = false;

async function verifyMailTransport() {
  if (hasResendConfig) {
    return { ok: true, provider: "resend" };
  }

  if (!hasMailConfig) {
    return { ok: false, error: "No mail provider configured. Set RESEND_API_KEY or SMTP env vars." };
  }

  if (mailTransportVerified) {
    return { ok: true, provider: "smtp" };
  }

  try {
    await transporter.verify();
    mailTransportVerified = true;
    console.log(`Mail transport verified for ${process.env.MAIL_USER}`);
    return { ok: true, provider: "smtp" };
  } catch (err) {
    console.error("Mail transport verification failed:", err.message);
    return { ok: false, error: err.message };
  }
}

async function sendWithResend(mailOptions) {
  try {
    console.log(`Sending invitation email via Resend to ${mailOptions.to}`);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: mailOptions.from,
        to: [mailOptions.to],
        subject: mailOptions.subject,
        html: mailOptions.html,
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = json?.message || json?.error?.message || `Resend request failed with status ${response.status}`;
      console.error("Invitation email send failed:", error);
      return { sent: false, error };
    }

    console.log(`Invitation email sent to ${mailOptions.to} via Resend (id: ${json?.id || "unknown"})`);
    return { sent: true, messageId: json?.id || null, accepted: [mailOptions.to] };
  } catch (err) {
    console.error("Invitation email send failed:", err.message);
    return { sent: false, error: err.message };
  }
}

async function sendInvitationEmail({ to, inviterEmail, workspaceName, role, acceptUrl }) {
  const roleLabel = role === "org:admin" ? "Admin" : "Member";
  const subject = `You're invited to join ${workspaceName || "the team"} on ProjectCamp`;
  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #1f2937;">You're invited</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        ${inviterEmail || "A team member"} has invited you to join <strong>${workspaceName || "the workspace"}</strong> on ProjectCamp as <strong>${roleLabel}</strong>.
      </p>
      <p style="color: #4b5563; line-height: 1.6;">
        Sign up or log in to accept the invitation:
      </p>
      <p style="margin: 24px 0;">
        <a href="${acceptUrl || appUrl}" style="display: inline-block; padding: 12px 24px; background: linear-gradient(to bottom right, #3b82f6, #2563eb); color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">Accept Invitation</a>
      </p>
      <p style="color: #9ca3af; font-size: 14px;">
        If you didn't expect this invitation, you can ignore this email.
      </p>
    </div>
  `;

  const mailOptions = {
    from,
    to,
    subject,
    html,
  };

  try {
    const verification = await verifyMailTransport();
    if (!verification.ok) {
      return { sent: false, error: verification.error || "Mail transport is not configured correctly" };
    }

    if (verification.provider === "resend") {
      return sendWithResend(mailOptions);
    }

    console.log(`Sending invitation email to ${to}`);
    const info = await transporter.sendMail(mailOptions);
    const accepted = Array.isArray(info.accepted) ? info.accepted : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected : [];

    if (accepted.length === 0) {
      const error = rejected.length > 0
        ? `Mail rejected for recipient(s): ${rejected.join(", ")}`
        : "Mail provider did not accept the message";
      console.error("Invitation email send failed:", error);
      return { sent: false, error };
    }

    console.log(`Invitation email sent to ${accepted.join(", ")} (messageId: ${info.messageId})`);
    return { sent: true, accepted, messageId: info.messageId };
  } catch (err) {
    console.error("Invitation email send failed:", err.message);
    return { sent: false, error: err.message };
  }
}

module.exports = { sendInvitationEmail, verifyMailTransport };
