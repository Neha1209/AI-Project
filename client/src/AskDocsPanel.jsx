import { useState } from 'react'

export default function AskDocsPanel() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    //tells the browser: "don't do your normal form-submission navigation or reloading the page— 
    // I'm handling this myself."
    e.preventDefault()
    setLoading(true)
    setAnswer(null)

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    })
    const data = await res.json()

    setAnswer(data)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Ask the docs</h1>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          className="border rounded px-3 py-2 flex-1"
        />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">
          Ask
        </button>
      </form>

      {loading && <p className="mt-4">Loading...</p>}
      {answer && <p className="mt-4">{answer.answer}</p>}
    </div>
  )
}