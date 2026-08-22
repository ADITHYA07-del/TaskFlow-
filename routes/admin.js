const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../db');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken);
router.use(requireAdmin);

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

// POST /tasks/:id/mark-invoice-pending
router.post('/tasks/:id/mark-invoice-pending', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'completed_invoice_pending' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Task not found' });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /tasks/:id/upload-invoice
router.post('/tasks/:id/upload-invoice', upload.single('invoice'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Invoice file is required' });
    }

    // Check task existence and status
    const { data: task, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (task.status !== 'completed_invoice_pending') {
      return res.status(400).json({
        error: "Task status must be 'completed_invoice_pending' to upload an invoice"
      });
    }

    const fileExt = req.file.originalname ? req.file.originalname.split('.').pop() : 'pdf';
    const filePath = `task-${id}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: updatedTask, error: updateError } = await supabase
      .from('tasks')
      .update({
        invoice_url: filePath,
        status: 'completed'
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.status(200).json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/:id/invoice
router.get('/tasks/:id/invoice', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: task, error } = await supabase
      .from('tasks')
      .select('invoice_url, status')
      .eq('id', id)
      .single();

    if (error || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    if (!task.invoice_url) {
      return res.status(404).json({ error: 'Task has no invoice yet' });
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from('invoices')
      .createSignedUrl(task.invoice_url, 300);

    if (signedError) throw signedError;

    res.status(200).json({
      invoice_url: signedData.signedUrl,
      status: task.status
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
