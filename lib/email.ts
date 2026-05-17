import nodemailer from "nodemailer";
import path from "path/win32";
import fs from "fs";
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
function generateConfetti(count: number = 12): string {
  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
  ];
  let html = "";

  for (let i = 0; i < count; i++) {
    const color = colors[i % colors.length];
    const left = Math.random() * 100;
    const delay = Math.random() * 3;
    const duration = 2 + Math.random() * 3;
    const size = 6 + Math.random() * 8;

    html += `
    <div style="
      position:absolute;
      left:${left}%;
      top:-10px;
      width:${size}px;
      height:${size}px;
      background:${color};
      border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
      animation: confetti-fall ${duration}s ${delay}s infinite linear;
      opacity:0.7;
      z-index:1;
    "></div>`;
  }
  return html;
}

// export async function sendUserInviteEmail(params: {
//   email: string;
//   name?: string | null;
//   token: string;
//   companyName?: string | null;
//   companyLogoUrl?: string | null;
// }) {
//   if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
//     throw new Error("SMTP configuration is missing");
//   }

//   const transporter = nodemailer.createTransport({
//     host: SMTP_HOST,
//     port: Number(SMTP_PORT),
//     secure: Number(SMTP_PORT) === 465,
//     auth: {
//       user: SMTP_USER,
//       pass: SMTP_PASS,
//     },
//   });
//   const safeCompany = params.companyName || "نظام إدارة المخزون";

//   const appUrl = getAppUrl();
//   const inviteUrl = `${appUrl}/invite?token=${encodeURIComponent(
//     params.token,
//   )}`;
//   const logoBlock = params.companyLogoUrl
//     ? `
//   <tr>
//     <td align="center" style="padding-bottom: 20px;">
//       <img
//         src="${params.companyLogoUrl}"
//         alt="${safeCompany}"
//         width="90"
//         height="90"
//         style="display:block; border-radius:20px; object-fit:contain;"
//       />
//     </td>
//   </tr>`
//     : "";

//   const html = `
// <!DOCTYPE html>
// <html lang="ar" dir="rtl">
// <head>
//   <meta charset="UTF-8" />
//   <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
// </head>

// <body style="margin:0; padding:0; background-color:#f3f4f6; font-family:Arial, sans-serif;">

//   <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:20px 0;">
//     <tr>
//       <td align="center">

//         <!-- Container -->
//         <table width="100%" max-width="600" cellpadding="0" cellspacing="0"
//           style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05);">

//           <!-- Header -->
//           <tr>
//             <td style="background:linear-gradient(135deg,#2563eb,#1e3a8a); padding:30px; text-align:center; color:#fff;">
//               <h1 style="margin:0; font-size:20px;">نظام إدارة المخزون</h1>
//               <p style="margin:5px 0 0; font-size:14px; opacity:0.9;">${safeCompany}</p>
//             </td>
//           </tr>

//           <!-- Logo -->
//           ${logoBlock}

//           <!-- Content -->
//           <tr>
//             <td style="padding:30px; color:#111; line-height:1.8; text-align:right;">

//               <h2 style="margin-top:0; font-size:18px;">مرحباً ${params.name ?? ""} 👋</h2>

//               <p>
//                 تمت دعوتك للانضمام إلى حساب الشركة.
//               </p>

//               <p>
//                 اضغط على الزر أدناه لتعيين كلمة المرور والبدء باستخدام النظام:
//               </p>

//               <!-- Button -->
//               <div style="text-align:center; margin:30px 0;">
//                 <a href="${inviteUrl}"
//                   style="
//                     background:#2563eb;
//                     color:#fff;
//                     padding:14px 24px;
//                     border-radius:8px;
//                     text-decoration:none;
//                     font-weight:bold;
//                     display:inline-block;
//                     font-size:14px;
//                   ">
//                   قبول الدعوة
//                 </a>
//               </div>

//               <p style="font-size:13px; color:#555;">
//                 إذا لم يعمل الزر، يمكنك نسخ الرابط التالي:
//               </p>

//               <p style="word-break:break-all; font-size:12px; color:#2563eb;">
//                 ${inviteUrl}
//               </p>

//             </td>
//           </tr>

//           <!-- Footer -->
//           <tr>
//             <td style="padding:20px; background:#f9fafb; text-align:center; font-size:12px; color:#888;">
//               © ${new Date().getFullYear()} ${safeCompany} — جميع الحقوق محفوظة
//             </td>
//           </tr>

//         </table>

//       </td>
//     </tr>
//   </table>

// </body>
// </html>
// `;

//   await transporter.sendMail({
//     from: EMAIL_FROM,
//     to: params.email,
//     subject: ` دعوة من نظام اي ام اس  للانضمام  إلى  ${safeCompany}`,
//     html,
//   });
// }
const ICONS = {
  package: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,

  cart: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,

  chart: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,

  users: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,

  shield: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>`,

  clock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,

  mail: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,

  sparkles: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`,

  party: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.4 2.4 0 0 1-1.95 0L12 0l-2 2.24a2.4 2.4 0 0 1-1.95 0L2 2v4.24a2.4 2.4 0 0 0 .82 1.97l5.5 5.5a2.4 2.4 0 0 0 1.97.82H22V2Z"/></svg>`,

  check: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
};

// ─── CSS ANIMATIONS ───
const CONFETTI_CSS = `
@keyframes confetti-fall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(200px) rotate(720deg); opacity: 0; }
}
@keyframes float-up {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 4px 14px rgba(59,130,246,0.35); }
  50% { box-shadow: 0 4px 28px rgba(59,130,246,0.6), 0 0 40px rgba(59,130,246,0.2); }
}
@keyframes icon-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

export async function sendUserInviteEmail(params: {
  email: string;
  name?: string | null;
  token: string;
  companyName?: string | null;
  companyLogoUrl?: string | null; // ← You can still use this if you prefer URL
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
  const inviteUrl = `${appUrl}/invite?token=${encodeURIComponent(params.token)}`;
  // Try local file
  const logoPath = path.join(
    process.cwd(),
    "public",
    "icons",
    "icon-rounded-192.png",
  );
  // ─── IMAGE SETUP ───
  const attachments: any[] = [];
  let heroHtml = "";
  let logoHtml = "";

  // 1. HERO BANNER IMAGE (optional - wide banner at top)
  // Uncomment if you have a hero banner image

  const heroPath = path.join(
    process.cwd(),
    "public",
    "images",
    "email-hero.png",
  );
  const hasHero = fs.existsSync(heroPath);

  // AFTER:
  if (hasHero) {
    attachments.push({
      filename: "icon-rounded-192.png",
      path: logoPath,
      cid: "logo@ims",
    });

    heroHtml = `
    <tr>
      <td style="padding:0; text-align:center; background:linear-gradient(135deg, #0f172a, #1e3a8a); position:relative; overflow:hidden;">
        <div style="position:relative; display:inline-block; width:100%;">
          ${generateConfetti(8)}
          <img src="cid:hero@ims" alt="Welcome" width="600" style="display:block; width:100%; max-width:600px; height:auto; border:0; position:relative; z-index:2;"/>
        </div>
      </td>
    </tr>`;
  } else {
    // Default: CSS animated hero (your existing code)
    heroHtml = `
    <tr>
      <td style="padding:0; background:linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%); text-align:center; position:relative; overflow:hidden;">
        <!-- Animated background particles -->
        <div style="position:absolute; inset:0; overflow:hidden;">
          <div style="position:absolute; width:4px; height:4px; background:#60a5fa; border-radius:50%; top:20%; left:10%; animation: float-up 3s ease-in-out infinite;"></div>
          <div style="position:absolute; width:6px; height:6px; background:#a78bfa; border-radius:50%; top:60%; left:80%; animation: float-up 4s ease-in-out infinite 1s;"></div>
          <div style="position:absolute; width:3px; height:3px; background:#34d399; border-radius:50%; top:40%; left:50%; animation: float-up 3.5s ease-in-out infinite 0.5s;"></div>
          <div style="position:absolute; width:5px; height:5px; background:#f472b6; border-radius:50%; top:70%; left:30%; animation: float-up 2.5s ease-in-out infinite 1.5s;"></div>
          <div style="position:absolute; width:4px; height:4px; background:#60a5fa; border-radius:50%; top:30%; left:70%; animation: float-up 3.2s ease-in-out infinite 0.8s;"></div>
        </div>

        <table role="presentation" cellpadding="0" cellspacing="0" style="position:relative; z-index:2;">
          <tr>
            <td style="text-align:center; padding:40px 30px 20px;">
              <span style="color:#60a5fa; display:inline-block; animation: icon-bounce 2s ease-in-out infinite;">${ICONS.package}</span>
              <span style="color:#a78bfa; display:inline-block; margin:0 16px; animation: icon-bounce 2s ease-in-out infinite 0.3s;">${ICONS.cart}</span>
              <span style="color:#34d399; display:inline-block; animation: icon-bounce 2s ease-in-out infinite 0.6s;">${ICONS.chart}</span>
            </td>
          </tr>
          <tr>
            <td style="text-align:center; padding:0 30px 10px;">
              <h1 style="margin:0; font-size:26px; font-weight:800; color:#ffffff; letter-spacing:-0.5px;">
                نظام إدارة المخزون
              </h1>
              <p style="margin:8px 0 0; font-size:14px; color:#94a3b8;">
                ${safeCompany}
              </p>
            </td>
          </tr>
          <tr>
            <td style="text-align:center; padding:20px 30px 30px;">
              <span style="color:#64748b; display:inline-block; margin:0 8px; animation: icon-bounce 2s ease-in-out infinite 0.9s;">${ICONS.users}</span>
              <span style="color:#64748b; display:inline-block; margin:0 8px; animation: icon-bounce 2s ease-in-out infinite 1.2s;">${ICONS.cart}</span>
              <span style="color:#64748b; display:inline-block; margin:0 8px; animation: icon-bounce 2s ease-in-out infinite 1.5s;">${ICONS.chart}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }
  // 2. LOGO IMAGE (CID embedded - most reliable)
  // Priority: 1. companyLogoUrl param, 2. Local file, 3. Skip
  if (params.companyLogoUrl) {
    // Use external URL from database
    logoHtml = `
    <tr>
      <td align="center" style="padding:24px 0 8px;">
        <div style="display:inline-block; position:relative;">
          <div style="position:absolute; inset:-8px; border:2px solid #3b82f6; border-radius:24px; opacity:0.3; animation: pulse-glow 2s ease-in-out infinite;"></div>
          <img src="${params.companyLogoUrl}" alt="${safeCompany}" width="64" height="64"
            style="display:block; border-radius:16px; object-fit:contain; box-shadow:0 4px 12px rgba(0,0,0,0.15); position:relative; z-index:2;"/>
        </div>
      </td>
    </tr>`;
  } else {
    const hasLogo = fs.existsSync(logoPath);

    if (hasLogo) {
      attachments.push({
        filename: "icon-rounded-192.png",
        path: logoPath,
        cid: "logo@ims",
      });

      logoHtml = `
      <tr>
        <td align="center" style="padding:24px 0 8px;">
          <div style="display:inline-block; position:relative;">
            <div style="position:absolute; inset:-8px; border:2px solid #3b82f6; border-radius:24px; opacity:0.3; animation: pulse-glow 2s ease-in-out infinite;"></div>
            <img src="cid:logo@ims" alt="${safeCompany}" width="64" height="64"
              style="display:block; border-radius:16px; box-shadow:0 4px 12px rgba(0,0,0,0.15); position:relative; z-index:2;"/>
          </div>
        </td>
      </tr>`;
    }
  }

  // ─── REST OF YOUR EXISTING HTML TEMPLATE ───
  const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>🎉 دعوة للانضمام إلى ${safeCompany}</title>
  <style>
    ${CONFETTI_CSS}

    .shimmer-text {
      background: linear-gradient(90deg, #60a5fa, #a78bfa, #ec4899, #60a5fa);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: shimmer 3s linear infinite;
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>
</head>

<body style="margin:0; padding:0; background-color:#f1f5f9; font-family:'Segoe UI', system-ui, -apple-system, sans-serif; -webkit-font-smoothing:antialiased;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <!-- Main Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="max-width:600px; background:#ffffff; border-radius:24px; overflow:hidden; box-shadow:0 20px 60px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.04); border:1px solid #e2e8f0;">

          ${heroHtml}
          ${logoHtml}

          <!-- Welcome with sparkle -->
          <tr>
            <td style="padding:16px 40px 8px; text-align:center;">
              <h2 style="margin:0; font-size:22px; font-weight:700; color:#0f172a;">
                <span style="display:inline-block; animation: icon-bounce 2s ease-in-out infinite;">${ICONS.sparkles}</span>
                مرحباً ${params.name ? `، ${params.name}` : ""}
                <span style="display:inline-block; animation: icon-bounce 2s ease-in-out infinite 0.5s;">${ICONS.party}</span>
              </h2>
            </td>
          </tr>

          <!-- Animated divider -->
          <tr>
            <td style="padding:16px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-top:2px solid #e2e8f0; position:relative;">
                    <div style="text-align:center; margin-top:-14px;">
                      <span style="display:inline-block; background:#ffffff; padding:0 16px; color:#3b82f6; font-size:0; animation: icon-bounce 2s ease-in-out infinite;">
                        ${ICONS.mail}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:8px 40px 24px; color:#475569; line-height:1.8; font-size:15px; text-align:right;">

              <p style="margin:0 0 16px;">
                تمت دعوتك للانضمام إلى <strong style="color:#0f172a;">${safeCompany}</strong> في نظام إدارة المخزون والمبيعات.
              </p>

              <p style="margin:0 0 28px;">
                اضغط على الزر المضيء أدناه لتعيين كلمة المرور والبدء:
              </p>

              <!-- Glowing CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="border-radius:14px; background:linear-gradient(135deg, #3b82f6, #2563eb); text-align:center; animation: pulse-glow 2s ease-in-out infinite;">
                    <a href="${inviteUrl}"
                      style="display:inline-block; padding:18px 48px; color:#ffffff; text-decoration:none; font-weight:700; font-size:15px; border-radius:14px;">
                      <span style="display:inline-block; margin-left:8px; animation: icon-bounce 2s ease-in-out infinite;">${ICONS.sparkles}</span>
                      قبول الدعوة وإنشاء الحساب
                      <span style="display:inline-block; margin-right:8px; animation: icon-bounce 2s ease-in-out infinite 0.5s;">${ICONS.sparkles}</span>
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px; font-size:13px; color:#94a3b8; text-align:center;">
                إذا لم يعمل الزر، انسخ هذا الرابط:
              </p>

              <p style="margin:0; word-break:break-all; font-size:12px; color:#3b82f6; text-align:center; direction:ltr; font-family:monospace; background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0;">
                ${inviteUrl}
              </p>

            </td>
          </tr>

          <!-- Features -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align:center; padding:16px 8px; background:#eff6ff; border-radius:12px;">
                    <div style="color:#3b82f6; margin-bottom:8px; animation: icon-bounce 2s ease-in-out infinite;">${ICONS.package}</div>
                    <p style="margin:0; font-size:12px; color:#1e40af; font-weight:700;">إدارة المخزون</p>
                  </td>
                  <td width="8px"></td>
                  <td width="33%" style="text-align:center; padding:16px 8px; background:#f5f3ff; border-radius:12px;">
                    <div style="color:#8b5cf6; margin-bottom:8px; animation: icon-bounce 2s ease-in-out infinite 0.3s;">${ICONS.cart}</div>
                    <p style="margin:0; font-size:12px; color:#5b21b6; font-weight:700;">المبيعات</p>
                  </td>
                  <td width="8px"></td>
                  <td width="33%" style="text-align:center; padding:16px 8px; background:#fdf2f8; border-radius:12px;">
                    <div style="color:#ec4899; margin-bottom:8px; animation: icon-bounce 2s ease-in-out infinite 0.6s;">${ICONS.chart}</div>
                    <p style="margin:0; font-size:12px; color:#9d174d; font-weight:700;">التقارير</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Celebration banner -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, #fef3c7, #fde68a); border-radius:12px; overflow:hidden; position:relative;">
                <tr>
                  <td style="padding:20px; text-align:center; position:relative;">
                    <div style="position:absolute; top:5px; left:20px; animation: icon-bounce 2s ease-in-out infinite;">${ICONS.party}</div>
                    <div style="position:absolute; top:5px; right:20px; animation: icon-bounce 2s ease-in-out infinite 0.5s;">${ICONS.party}</div>
                    <p style="margin:0; font-size:14px; color:#92400e; font-weight:700;">
                      🎉 انضم إلى ${Math.floor(Math.random() * 500 + 1000)}+ شركة تستخدم نظامنا!
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Security Notice -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7; border-radius:12px; border-right:4px solid #f59e0b;">
                <tr>
                  <td style="padding:16px 20px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-left:12px;">
                          <div style="color:#f59e0b; animation: icon-bounce 2s ease-in-out infinite;">${ICONS.clock}</div>
                        </td>
                        <td style="color:#92400e; font-size:13px; line-height:1.6;">
                          <strong>صالح لمدة 48 ساعة</strong><br/>
                          إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل هذا البريد بأمان.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px; background:#0f172a; text-align:center; position:relative; overflow:hidden;">
              <div style="position:absolute; width:3px; height:3px; background:#334155; border-radius:50%; top:30%; left:20%; animation: float-up 4s ease-in-out infinite;"></div>
              <div style="position:absolute; width:4px; height:4px; background:#334155; border-radius:50%; top:60%; left:75%; animation: float-up 3s ease-in-out infinite 1s;"></div>

              <p style="margin:0 0 6px; font-size:14px; font-weight:700; color:#ffffff; position:relative; z-index:2;">
                ${safeCompany}
              </p>
              <p style="margin:0; font-size:12px; color:#64748b; position:relative; z-index:2;">
                © ${new Date().getFullYear()} — جميع الحقوق محفوظة
              </p>
              <p style="margin:8px 0 0; font-size:11px; color:#475569; position:relative; z-index:2;">
                <span style="color:#3b82f6; display:inline-block; animation: icon-bounce 2s ease-in-out infinite;">${ICONS.shield}</span>
                نظام آمن وموثوق
              </p>
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
    from: `"🎉 نظام IMS" <${EMAIL_FROM}>`,
    to: params.email,
    subject: `🎉 دعوة خاصة للانضمام إلى ${safeCompany}`,
    html,
    attachments: attachments.length > 0 ? attachments : undefined, // ← Images attached here
  });
}
