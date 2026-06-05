import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const STATE_FILE = path.join(__dirname, 'public/catalog_state.json')

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'catalog-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
          
          if (url.pathname === '/api/upload' && req.method === 'POST') {
            const filename = decodeURIComponent(req.headers['x-filename'] || `upload_${Date.now()}.jpg`);
            const destPath = path.join(__dirname, 'public/images', filename);
            const writeStream = fs.createWriteStream(destPath);
            req.pipe(writeStream);
            
            writeStream.on('error', (err) => {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
            });

            req.on('end', () => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                url: `./images/${filename}` 
              }));
            });
            return;
          }

          if (url.pathname === '/api/catalog') {
            if (req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json')
              if (fs.existsSync(STATE_FILE)) {
                res.end(fs.readFileSync(STATE_FILE, 'utf-8'))
              } else {
                res.end(JSON.stringify({}))
              }
              return
            }
            
            if (req.method === 'POST') {
              let body = ''
              req.on('data', chunk => {
                body += chunk
              })
              req.on('end', () => {
                try {
                  JSON.parse(body)
                  fs.writeFileSync(STATE_FILE, body, 'utf-8')
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: true }))
                } catch (err) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Invalid JSON' }))
                }
              })
              return
            }
          }
          next()
        })
      }
    }
  ],
  server: {
    watch: {
      ignored: ['**/public/catalog_state.json']
    }
  }
})
