/**
 * Enterprise-grade, bulletproof HTML email template for Domain & Hosting expiry reminders.
 * Designed and tested for flawless cross-client rendering (Gmail, Outlook, Apple Mail, Mobile & Desktop).
 */
const buildReminderHtml = ({
  name,
  type,
  clientName,
  expiryDateFormatted,
  daysOffset,
  clientUrl = process.env.CLIENT_URL || 'http://localhost:3000',
}) => {
  const isDomain = type === 'domain';
  const label = isDomain ? 'Domain' : 'Hosting';
  const targetUrl = `${clientUrl}/${isDomain ? 'domains' : 'hosting'}`;

  const isToday = daysOffset === 0;

  // Visual cues
  const badgeBg = isToday ? '#fee2e2' : '#fef3c7';
  const badgeBorder = isToday ? '#fca5a5' : '#fcd34d';
  const badgeText = isToday ? '#b91c1c' : '#b45309';
  const badgeLabel = isToday ? 'CRITICAL: EXPIRES TODAY' : 'EXPIRING IN 3 DAYS';

  const headingText = isToday ? `${label} Expires Today` : `${label} Expiry Reminder`;
  const summaryNotice = isToday
    ? `Your ${label.toLowerCase()} <strong>${name}</strong> is set to expire <strong>today</strong>. Renew immediately to prevent downtime or suspension.`
    : `Your ${label.toLowerCase()} <strong>${name}</strong> is expiring in <strong>3 days</strong> (${expiryDateFormatted}). Please arrange renewal.`;

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headingText}</title>
</head>
<body style="margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <center style="width: 100%; background-color: #f1f5f9; padding: 36px 0;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 24px rgba(15, 23, 42, 0.05);">
      
      <!-- Top Brand Accent Line -->
      <tr>
        <td height="4" style="background-color: #16a34a; font-size: 0; line-height: 0;">&nbsp;</td>
      </tr>

      <!-- Header with Logo & Urgency Badge -->
      <tr>
        <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="left" valign="middle">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="36" height="36" align="center" valign="middle" style="background-color: #16a34a; border-radius: 10px; color: #ffffff; font-size: 18px; font-weight: bold; font-family: Arial, sans-serif;">
                      R
                    </td>
                    <td style="padding-left: 12px; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                      Remind<span style="color: #16a34a;">Pro</span>
                    </td>
                  </tr>
                </table>
              </td>
              <td align="right" valign="middle">
                <table border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 100px; padding: 5px 12px; font-size: 11px; font-weight: 700; color: ${badgeText}; letter-spacing: 0.4px; text-transform: uppercase;">
                      ${badgeLabel}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- Main Notification Banner -->
      <tr>
        <td style="padding: 28px 32px 12px 32px;">
          <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.4px; line-height: 1.3;">
            ${headingText}
          </h1>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #475569;">
            ${summaryNotice}
          </p>
        </td>
      </tr>

      <!-- Asset Information Table -->
      <tr>
        <td style="padding: 16px 32px 24px 32px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            
            <!-- Row 1: Asset Name -->
            <tr>
              <td style="padding: 14px 18px; font-size: 13px; font-weight: 500; color: #64748b; border-bottom: 1px solid #e2e8f0;" width="38%">
                Asset Name
              </td>
              <td align="right" style="padding: 14px 18px; font-size: 14px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                ${name}
              </td>
            </tr>

            <!-- Row 2: Type -->
            <tr>
              <td style="padding: 14px 18px; font-size: 13px; font-weight: 500; color: #64748b; border-bottom: 1px solid #e2e8f0;">
                Asset Type
              </td>
              <td align="right" style="padding: 14px 18px; font-size: 12px; font-weight: 600; color: #334155; border-bottom: 1px solid #e2e8f0;">
                <span style="display: inline-block; background-color: #e2e8f0; color: #334155; padding: 3px 8px; border-radius: 6px; text-transform: uppercase; font-size: 11px;">
                  ${label}
                </span>
              </td>
            </tr>

            <!-- Row 3: Client -->
            <tr>
              <td style="padding: 14px 18px; font-size: 13px; font-weight: 500; color: #64748b; border-bottom: 1px solid #e2e8f0;">
                Client Account
              </td>
              <td align="right" style="padding: 14px 18px; font-size: 13px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
                ${clientName || 'N/A'}
              </td>
            </tr>

            <!-- Row 4: Expiry Date -->
            <tr>
              <td style="padding: 14px 18px; font-size: 13px; font-weight: 500; color: #64748b;">
                Expiry Date
              </td>
              <td align="right" style="padding: 14px 18px; font-size: 14px; font-weight: 700; color: ${isToday ? '#dc2626' : '#d97706'};">
                ${expiryDateFormatted}
              </td>
            </tr>

          </table>
        </td>
      </tr>

      <!-- CTA Button Section -->
      <tr>
        <td style="padding: 0 32px 28px 32px;" align="center">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center" style="background-color: #16a34a; border-radius: 10px;">
                <a href="${targetUrl}" target="_blank" style="display: block; padding: 14px 24px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Open Asset in Dashboard &rarr;
                </a>
              </td>
            </tr>
          </table>
          <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
            Log in to manage renewal status or update credentials for this client.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
          <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.6;">
            Sent by <strong>RemindPro</strong> &bull; Automated Expiry Reminder System<br />
            &copy; ${new Date().getFullYear()} RemindPro. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </center>
</body>
</html>`;
};

module.exports = { buildReminderHtml };
