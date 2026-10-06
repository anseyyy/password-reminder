const bcrypt = require('bcryptjs');
const z = require('zod');
const User = require('../../users/users.model');

const registerSchema = z.object({
  name:     z.string().trim().min(1, 'Name is required').max(100),
  email:    z.string().email('Invalid email').max(200),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

module.exports = async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues?.[0]?.message || parsed.error.errors?.[0]?.message || 'Invalid input';
      return res.status(400).json({ success: false, message });
    }

    const { name, password } = parsed.data;
    const email = parsed.data.email.toLowerCase();

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ success: false, message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json({ success: true, message: 'User registered', data: { id: user._id } });
  } catch (err) { next(err); }
};

