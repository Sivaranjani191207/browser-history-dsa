# Chronicle — Web Browser History Management System

A DSA mini-project that implements a browser's back/forward history using a
**doubly linked list**, exposed through a small REST API (Node + Express),
with a frontend that looks like a real browser and visualizes the linked
list live as you navigate.

## Data structure

```
class PageNode {
  url, prev, next
}

class BrowserHistory {
  head     // oldest page
  current  // pointer to the active page

  visit(url)    // O(1)  — insert after current, drop everything ahead of it
  back(steps)   // O(k)  — walk toward head along prev pointers
  forward(steps)// O(k)  — walk toward tail along next pointers
}
```

This mirrors [LeetCode 1472 — Design Browser History](https://leetcode.com/problems/design-browser-history/),
extended into a full web app: each browser "tab" is one `BrowserHistory`
instance (one doubly linked list), kept in memory on the server and looked
up by a `sessionId`.

| Operation      | Time     | Space |
|----------------|----------|-------|
| `visit(url)`   | O(1)     | O(1) amortized per call |
| `back(steps)`  | O(steps) | O(1) |
| `forward(steps)`| O(steps)| O(1) |
| whole history  | —        | O(n) nodes |

## Project structure

```
browser-history-dsa/
├── server.js          # Express server + the BrowserHistory (doubly linked list) class
├── package.json
├── render.yaml         # optional one-click Render blueprint
└── public/              # static frontend (served by the same Express server)
    ├── index.html
    ├── style.css
    └── script.js
```

## Run it locally

```bash
npm install
npm start
```

Then open **http://localhost:3000**.

## API reference

All endpoints are JSON. `sessionId` represents one browser tab / one linked list.

| Method | Route                     | Body              | Description                          |
|--------|----------------------------|-------------------|---------------------------------------|
| POST   | `/api/session`             | `{ homepage }`    | Create a new tab, returns `sessionId` |
| GET    | `/api/state/:sessionId`    | —                 | Current page + full history chain     |
| POST   | `/api/visit/:sessionId`    | `{ url }`         | Visit a new URL                       |
| POST   | `/api/back/:sessionId`     | `{ steps }`       | Go back `steps` pages                 |
| POST   | `/api/forward/:sessionId`  | `{ steps }`       | Go forward `steps` pages              |
| GET    | `/api/health`              | —                 | Health check                          |

Example:

```bash
curl -X POST localhost:3000/api/session -H "Content-Type: application/json" -d '{"homepage":"home.app"}'
curl -X POST localhost:3000/api/visit/<sessionId> -H "Content-Type: application/json" -d '{"url":"wikipedia.org"}'
curl -X POST localhost:3000/api/back/<sessionId> -H "Content-Type: application/json" -d '{"steps":1}'
```

## Deploying

### Push to GitHub

```bash
git init
git add .
git commit -m "Browser history DSA mini-project"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### Render (backend + frontend together)

The Express server also serves the `public/` frontend, so **one Render web
service hosts everything** — no separate frontend deploy needed.

1. Push this repo to GitHub (above).
2. On [render.com](https://render.com) → **New +** → **Web Service** → connect the repo.
3. Render will detect `render.yaml` automatically (or set manually):
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
4. Deploy. Render assigns a public URL — open it, that's your live app.

If you ever split the frontend to a separate static host, update the `API`
constant at the top of `public/script.js` to point at your Render backend URL.

## Notes for the write-up

- **Why a doubly linked list?** Back and forward both need O(1) access to
  neighbours from the current position, and `visit()` needs to truncate
  everything after `current` in O(1) — an array would need O(n) shifting/copy,
  and a singly linked list can't walk backward for the "back" operation.
- **Session map** (`Map<sessionId, BrowserHistory>`) on the server lets the
  same backend serve many independent tabs/users; swap it for Redis/a DB if
  you need persistence across server restarts.
