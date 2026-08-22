const express = require('express');
const router = express.Router();
const supabase = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return res.status(404).json({ error: "User not found" });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: "Wrong password" });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password: _, ...userWithoutPassword } = user;
  return res.status(200).json({ token, user: userWithoutPassword });
});

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (role !== 'admin' && role !== 'member') {
    return res.status(400).json({ error: "Invalid role. Must be 'admin' or 'member'." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabase
    .from('users')
    .insert([{ name, email, password: hashedPassword, role }])
    .select()
    .single();

  if (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: error.message });
  }

  const { password: _, ...userWithoutPassword } = user;
  return res.status(201).json(userWithoutPassword);
});

module.exports = router;