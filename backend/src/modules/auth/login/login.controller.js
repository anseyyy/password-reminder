const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const z = require('zod');
const User = require('../../users/users.model');

const loginSchema = z.object({
  email:    z.string().email('Invalid email').max(200),
  password: z.string().min(1, 'Password is required').max(128),
});

module.exports = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues?.[0]?.message || parsed.error.errors?.[0]?.message || 'Invalid input';
      return res.status(400).json({ success: false, message });
    }

    const { password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      data: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) { next(err); }
};

