import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM;

function getAppUrl() {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function sendUserInviteEmail(params: {
  email: string;
  name?: string | null;
  token: string;
  companyName?: string | null;
  companyLogoUrl?: string | null;
}) {
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    throw new Error("SMTP configuration is missing");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  const safeCompany = params.companyName || "نظام إدارة المخزون";

  const appUrl = getAppUrl();
  const inviteUrl = `${appUrl}/invite?token=${encodeURIComponent(
    params.token,
  )}`;
  const logoBlock = params.companyLogoUrl
    ? `
  <tr>
    <td align="center" style="padding-bottom: 20px;">
      <img 
        src="${params.companyLogoUrl}" 
        alt="${safeCompany}" 
        width="90"
        height="90"
        style="display:block; border-radius:20px; object-fit:contain;"
      />
    </td>
  </tr>`
    : "";

  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>

<body style="margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:20px 0;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb,#1e3a8a); padding:30px; text-align:center; color:#fff;">
              <h1 style="margin:0; font-size:20px;">نظام إدارة المخزون</h1>
              <p style="margin:5px 0 0; font-size:14px; opacity:0.9;">${safeCompany}</p>
            </td>
          </tr>

          <!-- Logo -->
          ${logoBlock}

          <!-- Content -->
          <tr>
            <td style="padding:30px; color:#111; line-height:1.8; text-align:right;">
              
              <h2 style="margin-top:0; font-size:18px;">مرحباً ${params.name ?? ""} 👋</h2>

              <p>
                تمت دعوتك للانضمام إلى حساب الشركة.
              </p>

              <p>
                اضغط على الزر أدناه لتعيين كلمة المرور والبدء باستخدام النظام:
              </p>

              <!-- Button -->
              <div style="text-align:center; margin:30px 0;">
                <a href="${inviteUrl}"
                  style="
                    background:#2563eb;
                    color:#fff;
                    padding:14px 24px;
                    border-radius:8px;
                    text-decoration:none;
                    font-weight:bold;
                    display:inline-block;
                    font-size:14px;
                  ">
                  قبول الدعوة
                </a>
              </div>

              <p style="font-size:13px; color:#555;">
                إذا لم يعمل الزر، يمكنك نسخ الرابط التالي:
              </p>

              <p style="word-break:break-all; font-size:12px; color:#2563eb;">
                ${inviteUrl}
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px; background:#f9fafb; text-align:center; font-size:12px; color:#888;">
              © ${new Date().getFullYear()} ${safeCompany} — جميع الحقوق محفوظة
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
`;

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: params.email,
    subject: ` دعوة من نظام اي ام اس  للانضمام  إلى  ${safeCompany}`,
    html,
  });
}
