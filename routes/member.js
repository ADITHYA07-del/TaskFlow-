const express = require('express');
const router = express.Router();
const supabase = require('../db');

// GET /tasks
router.get('/tasks', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id query parameter is required' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', user_id);

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /tasks/:id/updates
router.post('/tasks/:id/updates', async (req, res) => {
  try {
    const { id } = req.params;
    const { member_id, proposed_status, note, file_url } = req.body;

    const { data, error } = await supabase
      .from('task_updates')
      .insert([{
        task_id: id,
        member_id,
        proposed_status,
        note,
        file_url,
        review_status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/:id/updates
router.get('/tasks/:id/updates', async (req, res) => {
  try {
    const { id } = req.params;
    const { member_id } = req.query;

    if (!member_id) {
      return res.status(400).json({ error: 'member_id query parameter is required' });
    }

    const { data, error } = await supabase
      .from('task_updates')
      .select('*')
      .eq('task_id', id)
      .eq('member_id', member_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
