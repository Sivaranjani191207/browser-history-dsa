const API = ""; // same-origin; change to your Render backend URL if hosted separately, e.g. "https://your-backend.onrender.com"

const els = {
  status: document.getElementById("statusLine"),
  chain: document.getElementById("chain"),
  opLog: document.getElementById("opLog"),
  backBtn: document.getElementById("backBtn"),
  fwdBtn: document.getElementById("fwdBtn"),
  stepSelect: document.getElementById("stepSelect"),
  visitForm: document.getElementById("visitForm"),
  urlInput: document.getElementById("urlInput"),
  newTabBtn: document.getElementById("newTabBtn"),
  sessionTag: document.getElementById("sessionTag"),
};

let sessionId = localStorage.getItem("chronicle_session_id");

function setStatus(msg, isError = false) {
  els.status.textContent = msg;
  els.status.style.color = isError ? "#e0667a" : "var(--text-dim)";
}

// opLog now comes from the server (shared across every tab on this session),
// so we just redraw the whole list on every state update instead of
// appending locally.
function renderLog(opLog) {
  els.opLog.innerHTML = "";
  opLog.forEach((entry) => {
    const li = document.createElement("li");
    li.innerHTML = `<b>${entry.label}</b> ${entry.detail} <span class="tag">${entry.cost}</span>`;
    els.opLog.appendChild(li);
  });
}

function shorten(url) {
  return url.length > 26 ? url.slice(0, 24) + "…" : url;
}

function render(state) {
  els.backBtn.disabled = !state.canBack;
  els.fwdBtn.disabled = !state.canForward;

  els.chain.innerHTML = "";
  state.history.forEach((node, i) => {
    if (i > 0) {
      const arrow = document.createElement("div");
      arrow.className = "arrow";
      arrow.textContent = "⇄";
      els.chain.appendChild(arrow);
    }
    const div = document.createElement("div");
    div.className = "node" + (node.isCurrent ? " current" : "");
    div.innerHTML = `<div class="node-index">#${i}</div><div class="node-url">${shorten(node.url)}</div>`;
    div.title = node.url + "\nvisited " + new Date(node.visitedAt).toLocaleTimeString();
    els.chain.appendChild(div);
  });

  els.chain.scrollLeft = els.chain.scrollWidth;
  setStatus(`current page: ${state.current}`);
  renderLog(state.opLog || []);
}

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function ensureSession() {
  if (sessionId) {
    try {
      const state = await api(`/api/state/${sessionId}`);
      els.sessionTag.textContent = sessionId.slice(0, 8);
      render(state);
      return;
    } catch (e) {
      // session expired (server restarted) — fall through to create a new one
      sessionId = null;
    }
  }
  await createSession();
}

async function createSession() {
  setStatus("starting a new session…");
  const state = await api("/api/session", {
    method: "POST",
    body: JSON.stringify({ homepage: "home.app" }),
  });
  sessionId = state.sessionId;
  localStorage.setItem("chronicle_session_id", sessionId);
  els.sessionTag.textContent = sessionId.slice(0, 8);
  render(state);
}

els.visitForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = els.urlInput.value.trim();
  if (!url) return;
  try {
    const state = await api(`/api/visit/${sessionId}`, {
      method: "POST",
      body: JSON.stringify({ url }),
    });
    render(state);
    els.urlInput.value = "";
  } catch (err) {
    setStatus(err.message, true);
  }
});

els.backBtn.addEventListener("click", async () => {
  const steps = Number(els.stepSelect.value);
  try {
    const state = await api(`/api/back/${sessionId}`, {
      method: "POST",
      body: JSON.stringify({ steps }),
    });
    render(state);
  } catch (err) {
    setStatus(err.message, true);
  }
});

els.fwdBtn.addEventListener("click", async () => {
  const steps = Number(els.stepSelect.value);
  try {
    const state = await api(`/api/forward/${sessionId}`, {
      method: "POST",
      body: JSON.stringify({ steps }),
    });
    render(state);
  } catch (err) {
    setStatus(err.message, true);
  }
});

els.newTabBtn.addEventListener("click", async () => {
  try {
    await createSession();
  } catch (err) {
    setStatus(err.message, true);
  }
});

// Keyboard shortcuts: Alt+Left / Alt+Right, like a real browser
window.addEventListener("keydown", (e) => {
  if (e.altKey && e.key === "ArrowLeft" && !els.backBtn.disabled) els.backBtn.click();
  if (e.altKey && e.key === "ArrowRight" && !els.fwdBtn.disabled) els.fwdBtn.click();
});

ensureSession().catch((err) => setStatus(err.message, true));
