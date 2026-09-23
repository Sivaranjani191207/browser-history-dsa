/**
 * Web Browser History Management System — DSA Mini Project
 * ----------------------------------------------------------
 * Core data structure: Doubly Linked List
 *
 *   visit(url)   -> O(1)   inserts a new page after current, discards forward stack
 *   back(steps)  -> O(steps) walks toward head, clamped at the oldest page
 *   forward(steps)-> O(steps) walks toward tail, clamped at the newest page
 *
 * Each browser "tab" is one linked list, kept server-side in memory and
 * identified by a sessionId so multiple visitors don't share history.
 */

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- 1. The DSA core: Node + Doubly Linked List ----------

class PageNode {
  constructor(url) {
    this.url = url;
    this.prev = null;
    this.next = null;
    this.visitedAt = new Date().toISOString();
  }
}

class BrowserHistory {
  constructor(homepage) {
    this.head = new PageNode(homepage); // oldest page in this branch
    this.current = this.head;           // pointer to the active page
    this.opLog = [];                    // shared operation log for this session (every tab reads this)
  }

  // Record an operation so every tab watching this session sees the same log.
  logOp(label, detail, cost) {
    this.opLog.push({ label, detail, cost, at: new Date().toISOString() });
    if (this.opLog.length > 50) this.opLog.shift(); // cap memory usage
  }

  // Visiting a new URL erases all "forward" history, exactly like a real browser.
  visit(url) {
    const node = new PageNode(url);
    node.prev = this.current;
    this.current.next = node;
    this.current = node;
    return this.current;
  }

  back(steps = 1) {
    let moved = 0;
    while (moved < steps && this.current.prev) {
      this.current = this.current.prev;
      moved++;
    }
    return { node: this.current, moved };
  }

  forward(steps = 1) {
    let moved = 0;
    while (moved < steps && this.current.next) {
      this.current = this.current.next;
      moved++;
    }
    return { node: this.current, moved };
  }

  canGoBack() {
    return this.current.prev !== null;
  }

  canGoForward() {
    return this.current.next !== null;
  }

  // Walk the full chain (head -> tail) for visualisation / the history list.
  toArray() {
    const arr = [];
    let node = this.head;
    while (node) {
      arr.push({
        url: node.url,
        visitedAt: node.visitedAt,
        isCurrent: node === this.current,
      });
      node = node.next;
    }
    return arr;
  }
}

// ---------- 2. Session store: one BrowserHistory per session ----------

const sessions = new Map(); // sessionId -> BrowserHistory

function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) {
    const err = new Error("Unknown or expired sessionId. Create a new session.");
    err.status = 404;
    throw err;
  }
  return session;
}

function serialize(history) {
  return {
    current: history.current.url,
    canBack: history.canGoBack(),
    canForward: history.canGoForward(),
    history: history.toArray(),
    // newest first, so every tab can just render this array top-to-bottom
    opLog: [...history.opLog].reverse(),
  };
}

// ---------- 3. REST API ----------

// Create a new browser tab / session
app.post("/api/session", (req, res) => {
  const { homepage } = req.body;
  const url = (homepage && String(homepage).trim()) || "home.app";
  const sessionId = crypto.randomUUID();
  const history = new BrowserHistory(url);
  history.logOp("new BrowserHistory(", `"${url}")`, "O(1)");
  sessions.set(sessionId, history);
  res.status(201).json({ sessionId, ...serialize(history) });
});

// Get current state (used on page reload)
app.get("/api/state/:sessionId", (req, res, next) => {
  try {
    const history = getSession(req.params.sessionId);
    res.json(serialize(history));
  } catch (e) {
    next(e);
  }
});

// Visit a new URL
app.post("/api/visit/:sessionId", (req, res, next) => {
  try {
    const history = getSession(req.params.sessionId);
    const { url } = req.body;
    if (!url || !String(url).trim()) {
      return res.status(400).json({ error: "url is required" });
    }
    const clean = String(url).trim();
    history.visit(clean);
    history.logOp("visit(", `"${clean}")`, "O(1)");
    res.json(serialize(history));
  } catch (e) {
    next(e);
  }
});

// Go back N steps
app.post("/api/back/:sessionId", (req, res, next) => {
  try {
    const history = getSession(req.params.sessionId);
    const steps = Number(req.body.steps) > 0 ? Number(req.body.steps) : 1;
    history.back(steps);
    history.logOp("back(", `${steps})`, `O(${steps})`);
    res.json(serialize(history));
  } catch (e) {
    next(e);
  }
});

// Go forward N steps
app.post("/api/forward/:sessionId", (req, res, next) => {
  try {
    const history = getSession(req.params.sessionId);
    const steps = Number(req.body.steps) > 0 ? Number(req.body.steps) : 1;
    history.forward(steps);
    history.logOp("forward(", `${steps})`, `O(${steps})`);
    res.json(serialize(history));
  } catch (e) {
    next(e);
  }
});

// Simple health check (handy for Render)
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

// Fallback to the frontend for any non-API route
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Browser History server running on port ${PORT}`);
});
