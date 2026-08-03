import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { VoyageAIClient } from 'voyageai'
import { supabase } from '../src/lib/supabase.js'

const voyage = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY })

const DOCS_DIR = '/tmp/expressjs-docs/src/content/docs/en/5x'

// 1. Get all .mdx file paths recursively
const allFiles = fs.readdirSync(DOCS_DIR, { recursive: true })
const mdxFiles = allFiles.filter(f => f.endsWith('.mdx'))

// 2. For each file, read + process + chunk, collecting results
const allChunks = []

for (const file of mdxFiles) {
  const fullPath = path.join(DOCS_DIR, file)
  const raw = fs.readFileSync(fullPath, 'utf8')
  const chunks = chunkByHeading(stripAlertTags(stripImports(stripFrontmatter(raw))))

  for (const chunk of chunks) {
    allChunks.push({ content: chunk, source_file: file })
  }
}
function batchArray(arr, size) {
  const batches = []
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size))
  }
  return batches
}
const batches = batchArray(allChunks, 10)

for (let b = 0; b < batches.length; b++) {
  const batch = batches[b]


const result = await embedWithRetry(batch.map(c => c.content))

  for (let i = 0; i < batch.length; i++) {
    batch[i].embedding = result.data[i].embedding
  }

  console.log(`Batch ${b + 1}/${batches.length} done`)

  if (b < batches.length - 1) {
    await sleep(20000)
  }
}

const rowsToInsert = allChunks.map(c => ({
  content: c.content,
  source_file: c.source_file,
  embedding: c.embedding,
}))

const { data, error } = await supabase
  .from('docs_chunks')
  .insert(rowsToInsert)

if (error) {
  console.error('Insert failed:', error)
} else {
  console.log('Inserted', rowsToInsert.length, 'chunks successfully')
}

console.log('Chunks with embeddings:', allChunks.filter(c => c.embedding).length)
console.log('Chunks missing embeddings:', allChunks.filter(c => !c.embedding).length)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function embedWithRetry(texts, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await voyage.embed({
        input: texts,
        model: 'voyage-4-lite',
        outputDimension: 1024,
      })
    } catch (err) {
      if (err.statusCode === 429 && attempt < maxRetries) {
        console.log(`Rate limited, waiting 30s before retry ${attempt}...`)
        await sleep(30000)
      } else {
        throw err
      }
    }
  }
}
function chunkByHeading(text) {
  const parts = text.split(/(?=^#{2,3} )/gm)
  return parts.map(p => p.trim()).filter(p => p.length > 0)
}
function stripAlertTags(text) {
  return text.replace(/<Alert[^>]*>/g, '').replace(/<\/Alert>/g, '')
}
function stripImports(text) {
  // Known limitation: this also strips `import` lines that appear inside
  // fenced code examples (not just the Astro component imports it's meant
  // to target). Accepted trade-off for this project — the LLM still answers
  // correctly using its own Express knowledge even if a displayed code
  // sample is missing an import line.
  return text.replace(/^import .*;\n/gm, '')
}
function stripFrontmatter(raw) {
  return raw.replace(/^---\n[\s\S]*?\n---\n/, '')
}
