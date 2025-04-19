import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ResultsPage() {
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const data = sessionStorage.getItem('scrapeResults');
    if (data) setResults(JSON.parse(data));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Scrape Results</h1>

        {results.length === 0 ? (
          <p className="text-gray-500">No results found.</p>
        ) : (
          <div className="space-y-6">
            {results.map((r, idx) => (
              <div key={idx} className="bg-white shadow rounded-lg p-6">
                <div className="flex justify-between items-center">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium truncate"
                  >
                    {r.url}
                  </a>
                  <span
                    className={
                      r.success
                        ? 'text-green-600 font-semibold'
                        : 'text-red-600 font-semibold'
                    }
                  >
                    {r.success ? 'Success' : 'Error'}
                  </span>
                </div>

                {r.success && (
                  <pre className="mt-4 bg-gray-100 p-4 rounded overflow-auto text-sm whitespace-pre-wrap">
                    {r.snippet}
                  </pre>
                )}
                {!r.success && (
                  <div className="mt-4 text-red-700">{r.error}</div>
                )}

                <div className="mt-4 flex space-x-2">
                  {r.success && (
                    <button
                      onClick={() => navigator.clipboard.writeText(r.snippet)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Copy Snippet
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(r, null, 2)], {
                        type: 'application/json'
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `result-${idx + 1}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Download JSON
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="mt-8 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          ← Back to Scraper
        </button>
      </div>
    </div>
  );
}
