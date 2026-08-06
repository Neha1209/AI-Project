import { Router } from 'express'
import { VoyageAIClient } from 'voyageai'
import { supabase } from '../lib/supabase.js'
import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

//Router() lets you define routes in a separate file instead of piling everything 
// into index.js. 
const router = Router()

const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY })

router.post('/', async (req, res) => {
  const { question } = req.body

  //this is basic input validation. 400 is the HTTP status code for "bad request"
  if (!question) {
    return res.status(400).json({ error: 'question is required' })
  }
// 1. Embed the question using Voyage
  const result = await voyage.embed({
    input: [question],
    model: "voyage-4-lite",
    outputDimension: 1024,
  });

    const queryEmbedding = result.data[0].embedding

    // 2. Call the Supabase RPC function to find the most relevant chunks
  const { data: matches, error } = await supabase.rpc('match_docs_chunks', {
    query_embedding: queryEmbedding,
    match_count: 5,
  })

  if (error) {
    console.error('Supabase RPC error:', error)
    return res.status(500).json({ error: 'retrieval failed' })
  }

  // 3. After you get matches back from Supabase, build the context string and call Claude
const context = matches
  .map((m, i) => `[${i + 1}] (from ${m.source_file})\n${m.content}`)
  .join("\n\n---\n\n");

const genResult = await ai.models.generateContent({
  model: 'gemini-3.6-flash',
  contents: `Answer the question using ONLY the context below. If the answer isn't in the context, say you don't know — do not use outside knowledge.

Context:
${context}

Question: ${question}`,
})

const answer = genResult.text

    res.json({
    answer: answer,
    sources: matches.map(m => m.source_file),
  })
})

export default router