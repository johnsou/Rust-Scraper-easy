import React, { useState, useRef, useEffect } from 'react';

export default function ScraperUI() {
  // Form state
  const [urls, setUrls] = useState(['']);
  const [rateLimit, setRateLimit] = useState(5);
  const [headers, setHeaders] = useState('');
  const [proxy, setProxy] = useState('');
  const [userAgent, setUserAgent] = useState('');
  // Logs
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  // Auto‑scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const log = (msg) => {
    const time = new Date().toLocaleTimeString();
    setLogs((l) => [...l, `[${time}] ${msg}`]);
  };

  // URL handlers
  const updateUrl = (i, v) =>
    setUrls((u) => u.map((url, idx) => (idx === i ? v : url)));
  const addUrl = () => setUrls((u) => [...u, '']);
  const removeUrl = (i) => setUrls((u) => u.filter((_, idx) => idx !== i));

  const handleScrape = async () => {
    setLogs([]);
    const validUrls = urls.map((u) => u.trim()).filter(Boolean);
    if (!validUrls.length) {
      log('⚠️ No URLs provided.');
      return;
    }

    log(`🛰️ Starting scrape for ${validUrls.length} URL(s)`);

    // Parse headers textarea
    const hdrs = headers
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .reduce((acc, line) => {
        const [k, v] = line.split(':').map((s) => s.trim());
        if (k && v) acc[k] = v;
        return acc;
      }, {});

    const payload = {
      urls: validUrls,
      rate_limit: rateLimit,
      headers: Object.keys(hdrs).length ? hdrs : undefined,
      proxy: proxy.trim() || undefined,
      user_agent: userAgent.trim() || undefined
    };

    log('📨 Sending POST /api/scrape');
    let resp;
    try {
      resp = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      log(`✅ HTTP ${resp.status}`);
    } catch (err) {
      log(`❌ Network error: ${err.message}`);
      return;
    }

    if (!resp.ok) {
      const txt = await resp.text();
      log(`❌ Server error ${resp.status}: ${txt}`);
      return;
    }

    let data;
    try {
      data = await resp.json();
      log(`📦 Received ${data.length} item(s)`);
    } catch (err) {
      log(`❌ JSON parse error: ${err.message}`);
      return;
    }

    data.forEach((item) =>
      log(item.success ? `🟢 [OK] ${item.url}` : `🔴 [ERR] ${item.url} → ${item.error}`)
    );
    log('🎉 Scrape complete');

    // Store & open results page
    sessionStorage.setItem('scrapeResults', JSON.stringify(data));
    const newTab = window.open('/results', '_blank');
    if (!newTab) log('❌ Popup blocked – allow popups for this site');
  };

  return (
    <div className="flex w-full">
      {/* Controls */}
      <div className="w-2/3 p-6 overflow-auto">
        <h1 className="text-3xl font-bold mb-6">FastScraper</h1>

        {/* URLs */}
        <div className="mb-6">
          <label className="block font-semibold mb-2">Target URLs:</label>
          {urls.map((url, i) => (
            <div key={i} className="flex items-center mb-2">
              <input
                type="text"
                value={url}
                onChange={(e) => updateUrl(i, e.target.value)}
                placeholder="https://example.com"
                className="flex-1 border px-3 py-2 rounded"
              />
              <button
                onClick={() => removeUrl(i)}
                className="ml-2 text-red-600 text-xl"
                title="Remove URL"
              >
                &times;
              </button>
            </div>
          ))}
          <button onClick={addUrl} className="mt-1 text-blue-600 hover:underline">
            + Add another URL
          </button>
        </div>

        {/* Rate Limit */}
        <div className="mb-6">
          <label className="block font-semibold mb-1">
            Rate Limit: {rateLimit} req/s
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={rateLimit}
            onChange={(e) => setRateLimit(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Headers */}
        <div className="mb-6">
          <label className="block font-semibold mb-1">
            Custom Headers (key: value per line):
          </label>
          <textarea
            rows="3"
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
            placeholder="Accept-Language: en-US\nX-API-KEY: abc123"
            className="w-full border px-3 py-2 rounded font-mono"
          />
        </div>

        {/* Proxy */}
        <div className="mb-6">
          <label className="block font-semibold mb-1">Proxy URL:</label>
          <input
            type="text"
            value={proxy}
            onChange={(e) => setProxy(e.target.value)}
            placeholder="http://user:pass@proxy:port"
            className="w-full border px-3 py-2 rounded"
          />
        </div>

        {/* User‑Agent */}
        <div className="mb-6">
          <label className="block font-semibold mb-1">User‑Agent (optional):</label>
          <input
            type="text"
            value={userAgent}
            onChange={(e) => setUserAgent(e.target.value)}
            placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64)…"
            className="w-full border px-3 py-2 rounded font-mono"
          />
        </div>

        <button
          onClick={handleScrape}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition"
        >
          Scrape &amp; View Results →
        </button>
      </div>

      {/* Live Logs */}
      <div className="w-1/3 p-6 bg-gray-50 flex flex-col border-l">
        <h2 className="text-xl font-semibold mb-4">Live Logs</h2>
        <div className="flex-1 p-4 bg-white rounded overflow-auto font-mono text-sm">
          {logs.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
}
