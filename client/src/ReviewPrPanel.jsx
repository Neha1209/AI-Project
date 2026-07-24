import { useState } from 'react'

export default function ReviewPrPanel() {
  const [prUrl, setPrUrl] = useState('')
  const [review, setReview] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setReview(null)

    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prUrl }),
    })
    const data = await res.json()
    setReview(data)
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Review PR</h1>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={prUrl}
          onChange={(e) => setPrUrl(e.target.value)}
          placeholder="Enter PR URL..."
          className="border rounded px-3 py-2 flex-1"
        />
        <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded">
          Review
        </button>
      </form>

      {loading && <p className="mt-4">Loading...</p>}
      {review && <p className="mt-4">{review.riskScore} - {review.summary}</p>}
    </div>
  )
}