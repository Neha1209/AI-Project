import AskDocsPanel from './AskDocsPanel';
import ReviewPrPanel from './ReviewPrPanel';
import { useState } from 'react';

export default function App() {
  const [tab, setTab] = useState('ask')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-xl bg-white rounded-xl shadow-md p-6">

        <div className="flex gap-2 border-b border-gray-200 mb-6">
          <button
            onClick={() => setTab('ask')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'ask'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Ask the docs
          </button>
          <button
            onClick={() => setTab('review')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === 'review'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Review a PR
          </button>
        </div>

        {tab === 'ask' ? <AskDocsPanel /> : <ReviewPrPanel />}

      </div>
    </div>
  )
}