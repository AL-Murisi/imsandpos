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

  const appUrl = getAppUrl();
  const inviteUrl = `${appUrl}/invite?token=${encodeURIComponent(
    params.token,
  )}`;

  const safeCompany = params.companyName || "نظام إدارة المخزون";
  const logoBlock = params.companyLogoUrl
    ? `<div style="text-align:center; margin-bottom:16px;">
         <img src="${params.companyLogoUrl}" alt="${safeCompany}" style="max-width:120px; max-height:120px; object-fit:contain; border-radius:40%" />
       </div>`
    : "";
  const html = `
  <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.8; color: #111;">
    ${logoBlock}
    <h2 style="text-align:center;">مرحباً بك في ${safeCompany}</h2>
    <p>مرحباً ${params.name ?? ""}،</p>
    <p> تمت دعوتك للانضمام إلى حساب الشركة .</p>
    <p>اضغط على الزر بالأسفل لتعيين كلمة المرور وتسجيل الدخول:</p>
    <p style="text-align:center;">
      <a href="${inviteUrl}" style="display: inline-block; padding: 12px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px;">قبول الدعوة</a>
    </p>
    <p>إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:</p>
    <p>${inviteUrl}</p>
  </div>
  `;

  await transporter.sendMail({
    from: EMAIL_FROM,
    to: params.email,
    subject: ` دعوة من نظام اي ام اس  للانضمام  إلى  ${safeCompany}`,
    html,
  });
}
