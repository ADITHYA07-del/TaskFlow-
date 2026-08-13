if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const memberRoutes = require('./routes/member');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static('public'));

// Health route
app.get('/health', (req, res) => {
  res.json({ status: "ok" });
});

// Mount routers
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/member', memberRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
