import { Router } from 'express'

//Router() lets you define routes in a separate file instead of piling everything 
// into index.js. 
const router = Router()

router.post('/', (req, res) => {
  const { question } = req.body

  //this is basic input validation. 400 is the HTTP status code for "bad request"
  if (!question) {
    return res.status(400).json({ error: 'question is required' })
  }

  res.json({
    answer: `You asked: "${question}". Real answer comes in Phase 2.`,
    sources: [],
  })
})

export default router