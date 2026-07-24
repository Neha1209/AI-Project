
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import askRouter from './routes/ask.js'
import reviewRouter from './routes/review.js'

//this creates your application object. 
//Everything else — routes, middleware — gets attached to this single app.
const app = express()

//read the port from the environment, but fall back to 3001 if it's not set. 
// Why bother with a fallback if we already set PORT=3001 in .env? 
// Because when you deploy to Render later, Render itself injects its own PORT value 
// into the environment (it doesn't use your .env file at all in production) — this line means the same code works locally and on Render without you touching it.
const PORT = process.env.PORT || 3001

//"use" registers middleware: code that runs on every incoming request before it reaches your actual route handlers. 
// This one adds the header that tells the browser "cross-origin requests are allowed here" 
app.use(cors())

//also middleware. Without it, when your React app sends a POST request with a JSON body 
// (like { question: "..." }), Express won't automatically parse it
// — req.body would be undefined. This middleware reads the raw request, parses the JSON, 
// and populates req.body for you.
app.use(express.json())

//when a GET request hits /api/health, run this function. 
// req is the incoming request (headers, body, params), 
// res is what you use to send a response back. res.json({...}) sends JSON and 
// sets the right content-type header automatically.
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

//tells Express "any request whose path starts with /api/ask, hand off to this router 
app.use('/api/ask', askRouter)

app.use('/api/review', reviewRouter)

//this actually starts the server, binding it to that port and keeping the process alive 
// to handle requests. The callback just confirms it started.
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})