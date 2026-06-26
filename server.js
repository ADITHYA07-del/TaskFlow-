require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Basic check routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TaskFlow API is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'TaskFlow API is running' });
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

// POST /register - receives: name, email, password, role; saves to users table
app.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, email, password, role }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ message: 'User registered successfully', user: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /login - receives: email, password; checks against users table
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (data.password !== password) {
      return res.status(401).json({ error: 'Wrong password' });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users - returns all users where role = 'employee'
app.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'employee');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// TASK ROUTES
// ==========================================

// POST /tasks - receives details, inserts into tasks table, returns created task
app.post('/tasks', async (req, res) => {
  try {
    const { title, description, assigned_to, created_by, due_date, priority } = req.body;
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title, description, assigned_to, created_by, due_date, priority, status: 'pending' }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks - returns all tasks with user details (supports relational or fallback join)
app.get('/tasks', async (req, res) => {
  try {
    // Try relationship query first (assumes standard DB foreign keys)
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(*),
        created_by_user:users!tasks_created_by_fkey(*)
      `);

    if (!error) {
      return res.json(data);
    }

    // Fallback 1: Try without custom constraint names
    const { data: dataAlt, error: errorAlt } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!assigned_to(*),
        created_by_user:users!created_by(*)
      `);

    if (!errorAlt) {
      return res.json(dataAlt);
    }

    // Fallback 2: Fetch both tables and join in memory
    const { data: tasks, error: tasksError } = await supabase.from('tasks').select('*');
    if (tasksError) throw tasksError;

    const { data: users, error: usersError } = await supabase.from('users').select('*');
    if (usersError) {
      return res.json(tasks); // Return raw tasks if users fetch fails
    }

    const joined = tasks.map(task => {
      const assigned = users.find(u => u.id === task.assigned_to || u.email === task.assigned_to);
      const creator = users.find(u => u.id === task.created_by || u.email === task.created_by);
      return {
        ...task,
        assigned_user: assigned || null,
        created_by_user: creator || null
      };
    });

    res.json(joined);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/my - receives: user_id as query parameter, returns tasks where assigned_to = user_id
app.get('/tasks/my', async (req, res) => {
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
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /tasks/:id - accepts status and/or invoice_url and updates only provided fields
app.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, invoice_url } = req.body;
    const updates = {};

    if (status !== undefined) updates.status = status;
    if (invoice_url !== undefined) updates.invoice_url = invoice_url;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Provide at least one field to update' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /tasks/:id/upload-invoice - uploads a PDF to storage and marks the task completed
app.post('/tasks/:id/upload-invoice', async (req, res) => {
  try {
    const { id } = req.params;
    const { fileName, fileData, contentType = 'application/pdf' } = req.body;

    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'fileName and fileData are required' });
    }

    const safeName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${id}/${Date.now()}-${safeName}`;
    const buffer = Buffer.from(fileData, 'base64');

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, buffer, {
        contentType,
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: publicData } = supabase.storage
      .from('invoices')
      .getPublicUrl(uploadData.path);

    const invoiceUrl = publicData?.publicUrl;

    if (!invoiceUrl) {
      return res.status(500).json({ error: 'Unable to generate invoice URL' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'completed', invoice_url: invoiceUrl })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ task: data, invoiceUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /tasks/:id - deletes task, returns success message
app.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).type('html').send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>404 - TaskFlow</title></head><body style="font-family:Arial,sans-serif;line-height:1.5;padding:2rem;background:#1a1a2e;color:#fff;"><h1>404</h1><p>The page you requested could not be found.</p><p><a href="/" style="color:#4CAF50;">Go back home</a></p></body></html>`);
});

// Global error handler for production
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Start server with dynamic port fallback
function startServer(port) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is already in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
