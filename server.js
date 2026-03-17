const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve all static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// Health check endpoint (used by Kubernetes liveness/readiness probes)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`App: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
