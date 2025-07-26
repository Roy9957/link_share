const express = require('express');
const path = require('path');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Game session storage
const ACTIVE_SESSIONS = new Map();

// Generate 32-character game ID
function generateGameId() {
  return crypto.randomBytes(16).toString('hex');
}

// Clean up old sessions (optional)
function cleanupSessions() {
  const now = new Date();
  for (const [id, session] of ACTIVE_SESSIONS) {
    const age = now - session.created;
    if (age > 24 * 60 * 60 * 1000) { // 24 hours
      ACTIVE_SESSIONS.delete(id);
    }
  }
}
setInterval(cleanupSessions, 60 * 60 * 1000); // Run hourly

// Routes
app.get('/', (req, res) => res.redirect('/new'));

app.get('/new', (req, res) => {
  try {
    const gameId = generateGameId();
    ACTIVE_SESSIONS.set(gameId, {
      id: gameId,
      created: new Date(),
      status: 'waiting',
      players: []
    });
    res.redirect(`/game?id=${gameId}`);
  } catch (err) {
    console.error('Error creating new game:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/game', (req, res) => {
  const gameId = req.query.id;
  
  if (!gameId || !ACTIVE_SESSIONS.has(gameId)) {
    return res.status(410).sendFile(path.join(__dirname, 'public', 'invalid.html'));
  }
  
  try {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch (err) {
    console.error('Error serving game:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/respond', (req, res) => {
  const { gameId, response } = req.query;
  
  if (!gameId || !ACTIVE_SESSIONS.has(gameId)) {
    return res.status(410).sendFile(path.join(__dirname, 'public', 'invalid.html'));
  }

  try {
    if (response === 'accept') {
      res.redirect('https://www.mobe-game.rf.gd/lobby');
    } else {
      ACTIVE_SESSIONS.delete(gameId);
      res.sendFile(path.join(__dirname, 'public', 'rejected.html'));
    }
  } catch (err) {
    console.error('Error processing response:', err);
    res.status(500).send('Internal Server Error');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
