const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const z = require('zod');
const User = require('../../users/users.model');
const Otp = require('./otp.model');
const { sendEmail } = require('../../../common/email/sendEmail');

// Schemas
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(200),
});

const verifyOtpSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(200),
  otp: z.string().trim().length(6, 'OTP must be 6 digits'),
});

const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').max(200),
  resetToken: z.string().min(10, 'Invalid reset token'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

/**
 * Step 1: Send OTP to User's Email
 */
const sendOtp = async (req, res, next) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues?.[0]?.message || parsed.error.errors?.[0]?.message || 'Invalid input';
      return res.status(400).json({ success: false, message });
    }

    const email = parsed.data.email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
      });
    }

    // Generate secure 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove old OTP records for this email
    await Otp.deleteMany({ email });

    // Store new OTP
    await Otp.create({
      email,
      otp,
      expiresAt,
    });

    // Send email with modern styled HTML template
    const subject = 'Your Password Reset OTP - RemindPro';
    const textMessage = `Your RemindPro password reset OTP is ${otp}. This code is valid for 10 minutes. If you did not request a password reset, you can safely ignore this email.`;

    const htmlMessage = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f6f8; padding: 32px 16px; margin: 0;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #edf0f2; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-flex; width: 44px; height: 44px; background: #19b967; border-radius: 12px; align-items: center; justify-content: center; color: #ffffff; font-size: 20px; font-weight: bold; line-height: 44px;">
              R
            </div>
            <h2 style="font-size: 20px; color: #182028; margin: 16px 0 6px 0; font-weight: 600;">Password Reset Verification</h2>
            <p style="font-size: 13px; color: #8d969f; margin: 0;">Use the 6-digit code below to reset your password.</p>
          </div>

          <div style="background-color: #f0fdf4; border: 1px dashed #86efac; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #168f5a;">${otp}</div>
            <p style="font-size: 12px; color: #15803d; margin: 8px 0 0 0; font-weight: 500;">Valid for 10 minutes</p>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.6; margin: 0 0 16px 0;">
            Hello <strong>${user.name}</strong>,<br/>
            We received a request to reset your RemindPro password. Please enter this code on the verification screen to proceed.
          </p>

          <div style="border-top: 1px solid #edf0f2; padding-top: 16px; margin-top: 24px; text-align: center;">
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">
              If you did not request this password reset, please ignore this email or contact support.
            </p>
          </div>
        </div>
      </div>
    `;

    try {
      await sendEmail({
        to: email,
        subject,
        message: textMessage,
        html: htmlMessage,
      });

      return res.json({
        success: true,
        message: 'A 6-digit OTP code has been sent to your email.',
      });
    } catch (emailErr) {
      // Clean up the OTP record so user is not locked or confused by an unsent OTP
      await Otp.deleteMany({ email });
      console.error('[Forgot Password] Email delivery failed:', emailErr.message);

      return res.status(503).json({
        success: false,
        message: 'Unable to send password reset email at this time. Please try again later or contact support.',
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Step 2: Verify OTP
 */
const verifyOtp = async (req, res, next) => {
  try {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues?.[0]?.message || parsed.error.errors?.[0]?.message || 'Invalid input';
      return res.status(400).json({ success: false, message });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const otp = parsed.data.otp.trim();

    const otpRecord = await Otp.findOne({
      email,
      otp,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP code. Please request a new one.',
      });
    }

    // Generate single-use reset token valid for 15 minutes
    const resetToken = crypto.randomBytes(32).toString('hex');

    otpRecord.verified = true;
    otpRecord.resetToken = resetToken;
    otpRecord.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins for entering new password
    await otpRecord.save();

    res.json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Step 3: Reset Password
 */
const resetPassword = async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues?.[0]?.message || parsed.error.errors?.[0]?.message || 'Invalid input';
      return res.status(400).json({ success: false, message });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const { resetToken, newPassword } = parsed.data;

    // Check if reset token matches and is verified and not expired
    const otpRecord = await Otp.findOne({
      email,
      resetToken,
      verified: true,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Password reset session has expired or is invalid. Please try again.',
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // Clean up OTP records
    await Otp.deleteMany({ email });

    res.json({
      success: true,
      message: 'Password has been reset successfully! You can now sign in.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  resetPassword,
};
