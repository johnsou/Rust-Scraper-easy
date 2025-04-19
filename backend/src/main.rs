// backend/src/main.rs

use std::collections::HashMap;
use std::convert::Infallible;
use std::env;
use std::sync::Arc;
use std::time::Duration;

use warp::{Filter, http::header};
use serde::{Deserialize, Serialize};
use tokio::sync::Semaphore;
use tokio::time::sleep;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue, CONTENT_TYPE};

#[derive(Deserialize)]
struct ScrapeRequest {
    urls: Vec<String>,
    #[serde(default)]
    rate_limit: Option<u32>,
    #[serde(default)]
    headers: Option<HashMap<String, String>>,
    #[serde(default)]
    proxy: Option<String>,
    #[serde(default)]
    user_agent: Option<String>,
}

#[derive(Serialize)]
struct ScrapeResult {
    url: String,
    success: bool,
    snippet: Option<String>,
    error: Option<String>,
}

/// Builds a reqwest::Client that:
/// 1. Uses the user-supplied proxy or falls back to DEFAULT_PROXY env var.
/// 2. Applies the user-supplied User‑Agent or a sane default.
/// 3. Applies any default headers.
///
/// This ensures your real server IP is hidden by default.
fn build_client(
    headers: &Option<HashMap<String, String>>,
    user_proxy: &Option<String>,
    user_agent: &Option<String>,
) -> reqwest::Client {
    let mut builder = reqwest::Client::builder();

    // 1) User‑Agent
    let ua = user_agent
        .as_deref()
        .unwrap_or("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 \
                   (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
    builder = builder.user_agent(ua);

    // 2) Default headers
    if let Some(map) = headers {
        let mut hm = HeaderMap::new();
        for (k, v) in map {
            let hn = HeaderName::from_lowercase(k.as_bytes())
                .expect("Invalid header name");
            let hv = HeaderValue::from_str(v)
                .expect("Invalid header value");
            hm.insert(hn, hv);
        }
        builder = builder.default_headers(hm);
    }

    // 3) Proxy: prefer user_proxy, else DEFAULT_PROXY env var
    let proxy_url = user_proxy
        .as_ref()
        .cloned()
        .or_else(|| env::var("DEFAULT_PROXY").ok());

    if let Some(px_url) = proxy_url {
        match reqwest::Proxy::all(&px_url) {
            Ok(px) => {
                builder = builder.proxy(px);
                eprintln!("🔒 Using proxy: {}", px_url);
            }
            Err(e) => {
                eprintln!("⚠️ Invalid proxy URL '{}': {}", px_url, e);
            }
        }
    } else {
        eprintln!("⚠️ No proxy configured; outgoing IP will be your server’s.");
    }

    builder.build().expect("Failed to build reqwest client")
}

#[tokio::main]
async fn main() {
    // CORS policy: allow your frontend origin
    let cors = warp::cors()
        .allow_origin("http://localhost:5173")
        .allow_methods(vec!["POST", "OPTIONS"])
        .allow_headers(vec![header::CONTENT_TYPE]);

    // POST /api/scrape
    let scrape_route = warp::post()
        .and(warp::path("api"))
        .and(warp::path("scrape"))
        .and(warp::body::json::<ScrapeRequest>())
        .and_then(handle_scrape)
        .with(cors);

    println!("🚀 Server listening on http://localhost:3030");
    warp::serve(scrape_route)
        .run(([127, 0, 0, 1], 3030))
        .await;
}

async fn handle_scrape(req: ScrapeRequest) -> Result<impl warp::Reply, Infallible> {
    // Determine rate limit and delay
    let rate = req.rate_limit.unwrap_or(5).max(1) as usize;
    let delay = Duration::from_millis(1_000 / rate as u64);
    let sem = Arc::new(Semaphore::new(rate));

    // Build HTTP client with proxy, UA, headers
    let client = build_client(&req.headers, &req.proxy, &req.user_agent);

    let mut results = Vec::with_capacity(req.urls.len());
    for url in req.urls.into_iter() {
        // Concurrency control
        let permit = sem.clone().acquire_owned().await.unwrap();

        // Perform GET
        match client.get(&url).send().await {
            Ok(resp) if resp.status().is_success() => {
                // Only parse HTML pages
                let is_html = resp
                    .headers()
                    .get(CONTENT_TYPE)
                    .and_then(|v| v.to_str().ok())
                    .map(|ct| ct.starts_with("text/html"))
                    .unwrap_or(false);

                if !is_html {
                    results.push(ScrapeResult {
                        url: url.clone(),
                        success: false,
                        snippet: None,
                        error: Some("Skipped non‑HTML content".into()),
                    });
                } else {
                    let body = resp.text().await.unwrap_or_default();
                    // Placeholder snippet: first 5 lines, up to 200 chars
                    let snippet = body
                        .lines()
                        .take(5)
                        .collect::<Vec<_>>()
                        .join(" ")
                        .chars()
                        .take(200)
                        .collect::<String>();

                    results.push(ScrapeResult {
                        url,
                        success: true,
                        snippet: Some(snippet),
                        error: None,
                    });
                }
            }
            Ok(resp) => {
                results.push(ScrapeResult {
                    url: url.clone(),
                    success: false,
                    snippet: None,
                    error: Some(format!("HTTP {}", resp.status())),
                });
            }
            Err(err) => {
                results.push(ScrapeResult {
                    url: url.clone(),
                    success: false,
                    snippet: None,
                    error: Some(err.to_string()),
                });
            }
        }

        // Release permit and wait before next request
        drop(permit);
        sleep(delay).await;
    }

    Ok(warp::reply::json(&results))
}
