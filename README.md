# FastScraper

A full‑stack, high‑performance web scraper with a Rust/Warp backend and a React + Vite + Tailwind frontend.  
• **Backend** exposes a JSON `POST /api/scrape` endpoint with built‑in rate‑limiting, proxy support, and User‑Agent control.  
• **Frontend** lets you enter URLs, configure headers/proxy/UA, view live logs, and display results in a modern card UI.

---

## Table of Contents

- [Features](#features)  
- [Demo](#demo)  
- [Prerequisites](#prerequisites)  
- [Environment](#environment)  
- [Installation](#installation)  
  - [Backend](#backend)  
  - [Frontend](#frontend)  
  - [Docker Compose](#docker-compose)  
- [Usage](#usage)  
- [Configuration](#configuration)  
- [Project Structure](#project-structure)  
- [License](#license)

---

## Features

- **Asynchronous Rust** backend (Tokio, Warp, Reqwest)  
- **Client‑side rate limiting** and concurrency control  
- **Built‑in proxy** (defaults to `DEFAULT_PROXY` env var) to hide server IP  
- **Dynamic User‑Agent** and custom headers  
- **Live‑logs** panel in the UI for debugging  
- **Modern results** page (React Router + sessionStorage) with copy/download buttons  
- **Tailwind CSS** for rapid styling

---

## Demo

1. Start the backend on `http://localhost:3030`  
2. Start the frontend on `http://localhost:5173`  
3. Enter one or more URLs, configure rate‑limit, headers, proxy, UA  
4. Click **Scrape & View Results →**  
5. Watch live logs, then see results in a new tab

---

## Prerequisites

- **Rust** (1.60+) and **Cargo**  
- **Node.js** (16+ LTS) and **npm**  
- (Optional) A working HTTP proxy if you wish to override `DEFAULT_PROXY`  
- **Docker & Docker Compose** (for the containerized setup)

---

## Environment

Set these in your shell or via a `.env` loader:

```bash
# Backend
export DEFAULT_PROXY="http://user:pass@proxy-host:3128"
```