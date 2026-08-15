const express = require('express');
const router = express.Router();
const supabase = require('../db');

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

  if (user.password !== password) {
    return res.status(401).json({ error: "Wrong password" });
  }

  return res.status(200).json(user);
});

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  if (role !== 'admin' && role !== 'member') {
    return res.status(400).json({ error: "Invalid role. Must be 'admin' or 'member'." });
  }

  const { data: user, error } = await supabase
    .from('users')
    .insert([{ name, email, password, role }])
    .select()
    .single();

  if (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json(user);
});

module.exports = router;
