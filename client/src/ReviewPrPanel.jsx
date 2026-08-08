import { useState } from "react";

export default function ReviewPrPanel() {
  const [prUrl, setPrUrl] = useState("");
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setReview(null);

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prUrl }),
    });
    const data = await res.json();
    setReview(data);
    setLoading(false);
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
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          Review
        </button>
      </form>

      {loading && <p className="mt-4">Loading...</p>}
      {review && (
        <div className="mt-4 space-y-2">
          <p className="font-medium">Risk: {review.riskScore}</p>
          <p className="whitespace-pre-wrap">{review.summary}</p>
          {review.toolCalls?.length > 0 && (
            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs font-medium text-gray-500 mb-1">
                Agent tool calls (audit trail)
              </p>
              <ul className="text-xs text-gray-500 list-disc list-inside">
                {review.toolCalls.map((call, i) => (
                  <li key={i}>{call}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
