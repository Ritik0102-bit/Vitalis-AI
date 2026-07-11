require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');

// Load API routes dynamically
const apiRoutes = {
  '/api/chat': require('./api/chat'),
  '/api/getHistory': require('./api/getHistory'),
  '/api/saveMessage': require('./api/saveMessage'),
  '/api/deleteChat': require('./api/deleteChat'),
  '/api/renameChat': require('./api/renameChat'),
  '/api/saveUser': require('./api/saveUser'),
  '/api/getUser': require('./api/getUser'),
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = parsedUrl.pathname;

  // Add CORS headers for local/cross-origin development
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }

  // Check if request is for an API route
  if (apiRoutes[pathname]) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        req.body = body ? JSON.parse(body) : {};
        req.query = Object.fromEntries(parsedUrl.searchParams.entries());
        req.method = req.method;
        
        // Emulate Vercel Serverless Function response object (res.status().json())
        const mockRes = {
          status: (code) => {
            res.statusCode = code;
            return mockRes;
          },
          json: (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return mockRes;
          },
          send: (data) => {
            res.end(data);
            return mockRes;
          }
        };

        await apiRoutes[pathname](req, mockRes);
      } catch (err) {
        console.error('API Route Error:', err);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Internal Server Error' }));
        }
      }
    });
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.json': 'application/json'
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html if file not found (or return 404)
        if (pathname.startsWith('/api/')) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API Route Not Found' }));
        } else {
          fs.readFile(path.join(__dirname, 'index.html'), (err2, content2) => {
            if (err2) {
              res.writeHead(404);
              res.end('404 Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(content2, 'utf-8');
            }
          });
        }
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
      res.end(content, 'utf-8');
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 Vitalis AI Server Running Locally!`);
  console.log(`🌐 Open in your browser: http://localhost:${PORT}`);
  console.log(`=================================================\n`);
});
