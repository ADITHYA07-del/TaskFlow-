const express = require('express');
const router = express.Router();
const supabase = require('../db');

// GET /tasks
router.get('/tasks', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, users!assigned_to(name, email)');

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /tasks
router.post('/tasks', async (req, res) => {
  try {
    const { title, description, assigned_to, created_by, due_date, priority } = req.body;

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        title, 
        description, 
        assigned_to, 
        created_by, 
        due_date, 
        priority, 
        status: 'pending' 
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /tasks/:id
router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, assigned_to, due_date, priority } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (due_date !== undefined) updates.due_date = due_date;
    if (priority !== undefined) updates.priority = priority;

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /tasks/:id
router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /updates/pending
router.get('/updates/pending', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('task_updates')
      .select('*, tasks(title), users!member_id(name)')
      .eq('review_status', 'pending');

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/:id/updates
router.get('/tasks/:id/updates', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('task_updates')
      .select('*')
      .eq('task_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /updates/:id/approve
router.post('/updates/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by } = req.body;

    const { data: updateData, error: updateError } = await supabase
      .from('task_updates')
      .select('*')
      .eq('id', id)
      .single();

    if (updateError) throw updateError;
    if (!updateData) throw new Error("Task update not found");

    const { data: updatedRow, error: updateRowError } = await supabase
      .from('task_updates')
      .update({
        review_status: 'approved',
        reviewed_by,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateRowError) throw updateRowError;

    const { error: taskError } = await supabase
      .from('tasks')
      .update({ status: updateData.proposed_status })
      .eq('id', updateData.task_id);

    if (taskError) throw taskError;

    res.status(200).json(updatedRow);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /updates/:id/reject
router.post('/updates/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by } = req.body;

    const { data, error } = await supabase
      .from('task_updates')
      .update({
        review_status: 'rejected',
        reviewed_by,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /members
router.get('/members', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('role', 'member')
      .order('name', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
