// emailTemplates.js
require('dotenv').config();

exports.passwordResetEmailTemplate = ({ firstName = "", resetLink, lang = "en", expiresInMinutes = 15, }) => {
  const isArabic = String(lang)
    .trim()
    .toLowerCase()
    .startsWith("ar");

  const direction = isArabic ? "rtl" : "ltr";

  const safeName = String(firstName || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const safeResetLink = String(resetLink || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const greeting = isArabic
    ? safeName
      ? `مرحباً ${safeName}،`
      : "مرحباً،"
    : safeName
      ? `Hi ${safeName},`
      : "Hi,";

  const title = isArabic
    ? "إعادة تعيين كلمة المرور"
    : "Reset your password";

  const description = isArabic
    ? "تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك."
    : "We received a request to reset the password for your account.";

  const instruction = isArabic
    ? "اضغط على الزر التالي لإنشاء كلمة مرور جديدة:"
    : "Click the button below to create a new password:";

  const buttonText = isArabic
    ? "إعادة تعيين كلمة المرور"
    : "Reset password";

  const expirationText = isArabic
    ? `سينتهي هذا الرابط خلال ${expiresInMinutes} دقيقة.`
    : `This link expires in ${expiresInMinutes} minutes.`;

  const ignoreText = isArabic
    ? "إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان."
    : "If you did not request a password reset, you can safely ignore this email.";

  const copyLinkText = isArabic
    ? "إذا لم يعمل الزر، انسخ الرابط التالي والصقه في المتصفح:"
    : "If the button does not work, copy and paste this link into your browser:";

  return `
    <!DOCTYPE html>
    <html lang="${isArabic ? "ar" : "en"}" dir="${direction}">
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>${title}</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f4f6f8;
          font-family: Arial, Helvetica, sans-serif;
          color: #1f2937;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width: 100%;
            background-color: #f4f6f8;
            padding: 32px 16px;
          "
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  width: 100%;
                  max-width: 560px;
                  background-color: #ffffff;
                  border-radius: 16px;
                  overflow: hidden;
                "
              >
                <tr>
                  <td
                    style="
                      padding: 24px 32px;
                      background-color: #111827;
                      color: #ffffff;
                      text-align: center;
                    "
                  >
                    <h1
                      style="
                        margin: 0;
                        font-size: 22px;
                        line-height: 1.4;
                      "
                    >
                      Electro Task
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 32px;
                      text-align: ${isArabic ? "right" : "left"};
                    "
                  >
                    <h2
                      style="
                        margin: 0 0 20px;
                        color: #111827;
                        font-size: 24px;
                        line-height: 1.3;
                      "
                    >
                      ${title}
                    </h2>

                    <p
                      style="
                        margin: 0 0 12px;
                        color: #374151;
                        font-size: 16px;
                        line-height: 1.7;
                      "
                    >
                      ${greeting}
                    </p>

                    <p
                      style="
                        margin: 0 0 12px;
                        color: #4b5563;
                        font-size: 16px;
                        line-height: 1.7;
                      "
                    >
                      ${description}
                    </p>

                    <p
                      style="
                        margin: 0 0 24px;
                        color: #4b5563;
                        font-size: 16px;
                        line-height: 1.7;
                      "
                    >
                      ${instruction}
                    </p>

                    <div
                      style="
                        margin: 24px 0;
                        text-align: center;
                      "
                    >
                      <a
                        href="${safeResetLink}"
                        target="_blank"
                        rel="noopener noreferrer"
                        style="
                          display: inline-block;
                          padding: 14px 28px;
                          border-radius: 8px;
                          background-color: #111827;
                          color: #ffffff;
                          font-size: 16px;
                          font-weight: 600;
                          text-decoration: none;
                        "
                      >
                        ${buttonText}
                      </a>
                    </div>

                    <p
                      style="
                        margin: 0 0 12px;
                        color: #6b7280;
                        font-size: 14px;
                        line-height: 1.6;
                      "
                    >
                      ${expirationText}
                    </p>

                    <p
                      style="
                        margin: 0 0 20px;
                        color: #6b7280;
                        font-size: 14px;
                        line-height: 1.6;
                      "
                    >
                      ${ignoreText}
                    </p>

                    <p
                      style="
                        margin: 0 0 8px;
                        color: #9ca3af;
                        font-size: 12px;
                        line-height: 1.6;
                      "
                    >
                      ${copyLinkText}
                    </p>

                    <p
                      style="
                        margin: 0;
                        padding: 12px;
                        border-radius: 8px;
                        background-color: #f3f4f6;
                        color: #6b7280;
                        font-size: 12px;
                        line-height: 1.6;
                        overflow-wrap: anywhere;
                        word-break: break-word;
                        direction: ltr;
                        text-align: left;
                      "
                    >
                      ${safeResetLink}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 16px 32px;
                      background-color: #f9fafb;
                      color: #9ca3af;
                      font-size: 12px;
                      text-align: center;
                    "
                  >
                    © ${new Date().getFullYear()} Electro Task.
                    All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};


// ======================================================
// Internal template helpers
// ======================================================

function normalizeTemplateLanguage(lang) {
  return String(lang || "en")
    .trim()
    .toLowerCase()
    .startsWith("ar")
    ? "ar"
    : "en";
}

function escapeTemplateHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ======================================================
// Email-confirmation OTP template
// ======================================================

exports.emailConfirmationOTPTemplate = ({
  otp,
  lang = "en",
  expiresInMinutes = 10,
}) => {
  const normalizedLang =
    normalizeTemplateLanguage(lang);

  const isArabic =
    normalizedLang === "ar";

  const direction = isArabic
    ? "rtl"
    : "ltr";

  const title = isArabic
    ? "تأكيد عنوان البريد الإلكتروني"
    : "Confirm your email address";

  const description = isArabic
    ? "استخدم رمز التحقق التالي لتأكيد عنوان بريدك الإلكتروني:"
    : "Use the verification code below to confirm your email address:";

  const expirationText = isArabic
    ? `سينتهي هذا الرمز خلال ${expiresInMinutes} دقائق.`
    : `This code expires in ${expiresInMinutes} minutes.`;

  const ignoreText = isArabic
    ? "إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة."
    : "If you did not request this code, you can safely ignore this email.";

  const safeOTP =
    escapeTemplateHTML(otp);

  return `
    <!DOCTYPE html>

    <html
      lang="${normalizedLang}"
      dir="${direction}"
    >
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <title>${title}</title>
      </head>

      <body
        style="
          margin: 0;
          padding: 0;
          background-color: #f4f6f8;
          font-family: Arial, Helvetica, sans-serif;
          color: #1f2937;
        "
      >
        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width: 100%;
            padding: 32px 16px;
            background-color: #f4f6f8;
          "
        >
          <tr>
            <td align="center">
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  width: 100%;
                  max-width: 560px;
                  overflow: hidden;
                  background-color: #ffffff;
                  border-radius: 16px;
                "
              >
                <tr>
                  <td
                    style="
                      padding: 24px 32px;
                      background-color: #111827;
                      color: #ffffff;
                      text-align: center;
                    "
                  >
                    <h1
                      style="
                        margin: 0;
                        font-size: 22px;
                      "
                    >
                      Electro Task
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 32px;
                      text-align: ${
                        isArabic
                          ? "right"
                          : "left"
                      };
                    "
                  >
                    <h2
                      style="
                        margin: 0 0 16px;
                        color: #111827;
                        font-size: 24px;
                        line-height: 1.3;
                      "
                    >
                      ${title}
                    </h2>

                    <p
                      style="
                        margin: 0 0 24px;
                        color: #4b5563;
                        font-size: 16px;
                        line-height: 1.7;
                      "
                    >
                      ${description}
                    </p>

                    <div
                      style="
                        margin: 0 0 24px;
                        padding: 18px;
                        border-radius: 12px;
                        background-color: #f0fdf4;
                        color: #00a76a;
                        font-family: monospace;
                        font-size: 32px;
                        font-weight: 700;
                        letter-spacing: 8px;
                        text-align: center;
                      "
                    >
                      ${safeOTP}
                    </div>

                    <p
                      style="
                        margin: 0 0 12px;
                        color: #6b7280;
                        font-size: 14px;
                        line-height: 1.6;
                      "
                    >
                      ${expirationText}
                    </p>

                    <p
                      style="
                        margin: 0;
                        color: #9ca3af;
                        font-size: 14px;
                        line-height: 1.6;
                      "
                    >
                      ${ignoreText}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding: 16px 32px;
                      background-color: #f9fafb;
                      color: #9ca3af;
                      font-size: 12px;
                      text-align: center;
                    "
                  >
                    © ${new Date().getFullYear()}
                    Electro Task. All rights reserved.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};