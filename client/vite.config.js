import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
//our React app runs on http://localhost:5173. When AskDocsPanel calls fetch('/api/ask', ...),
//  the browser sends that request to http://localhost:5173/api/ask — not directly to 
// port 3001. Vite's dev server receives it, sees it matches the /api prefix rule in 
// vite.config.js, and forwards it internally to http://localhost:3001/api/ask, where 
// your Express server actually lives. so proxy makes it work, Without it, fetch('/api/ask') 
// would hit port 5173 looking for that route, find nothing,

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
