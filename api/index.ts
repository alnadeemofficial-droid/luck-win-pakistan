import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Proxy requests to Google Apps Script
// 👇👇👇 REPLACE THIS WITH YOUR NEW DEPLOYED WEB APP URL 👇👇👇
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyLob_h7tWH48JAtD88R4wmzNUF_mctyKQOtt2P19UAdyg0l6hRS-HzaSX9jQqBRGq_/exec"; 
// 👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆

async function callAppsScript(action: string, payload: any = {}) {
  if (typeof fetch === 'undefined') {
    console.error("CRITICAL: Global 'fetch' is not defined in this environment.");
    return { status: 'error', message: "Server configuration error: fetch is missing" };
  }

  try {
    console.log(`Calling Apps Script: ${action}`);
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload })
    });
    
    const text = await response.text();
    console.log(`Apps Script Response (${action}): ${text.substring(0, 100)}...`);

    try {
        if (!text) {
            console.warn(`Apps Script returned empty response for action: ${action}`);
            return { status: 'error', message: 'Empty response from Apps Script' };
        }
        return JSON.parse(text);
    } catch (e) {
        console.error(`Apps Script Invalid JSON (${action}):`, text.substring(0, 500)); 
        return { status: 'error', message: 'Invalid JSON from Apps Script', raw: text.substring(0, 100) };
    }
  } catch (error) {
    console.error(`Apps Script Network Error (${action}):`, error);
    return { status: 'error', message: error.toString() };
  }
}

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: "proxy_only" });
});

app.get("/api/data", async (req, res) => {
  try {
    const result = await callAppsScript('getData');
    if (result.status === 'success') {
      res.json(result.data);
    } else {
      console.error("Failed to fetch data from Apps Script:", result);
      // Return the error so the frontend can show it
      res.status(502).json({ 
        error: "Failed to fetch data from Google Sheet", 
        details: result.message,
        raw: result.raw 
      });
    }
  } catch (e: any) {
    console.error("Error in /api/data:", e);
    res.status(500).json({ error: "Internal Server Error", details: e.message });
  }
});

app.post("/api/participants", async (req, res) => {
  try {
    const result = await callAppsScript('addParticipant', req.body);
    res.json(result);
  } catch (e: any) {
    console.error("Error in /api/participants:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
});

app.post("/api/participants/status", async (req, res) => {
  try {
    const result = await callAppsScript('updateParticipantStatus', req.body);
    res.json(result);
  } catch (e: any) {
    console.error("Error in /api/participants/status:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
});

app.post("/api/participants/tid", async (req, res) => {
  try {
    const result = await callAppsScript('updateParticipantTID', req.body);
    res.json(result);
  } catch (e: any) {
    console.error("Error in /api/participants/tid:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
});

app.post("/api/participants/winner", async (req, res) => {
  try {
    const result = await callAppsScript('updateParticipantWinner', req.body);
    res.json(result);
  } catch (e: any) {
    console.error("Error in /api/participants/winner:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
});

app.post("/api/tiers", async (req, res) => {
  try {
    const result = await callAppsScript('saveTiers', { tiers: req.body });
    res.json(result);
  } catch (e: any) {
    console.error("Error in /api/tiers:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
});

app.post("/api/announcements", async (req, res) => {
  try {
    const result = await callAppsScript('saveAnnouncements', { announcements: req.body });
    res.json(result);
  } catch (e: any) {
    console.error("Error in /api/announcements:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
});

app.post("/api/admin/login", async (req, res) => {
  // Proxy admin login to Apps Script as well, or keep local env var check if preferred.
  // The user said "remove private key system", but didn't explicitly say remove ADMIN_PASSWORD.
  // However, they said "focus only on this Google Sheet".
  // The provided Apps Script HAS a login action. Let's use it!
  
  try {
    const { username, password } = req.body;
    // Note: Frontend sends 'password', but Apps Script expects 'username' and 'password'.
    // AdminDashboard.tsx sends: { action: 'login', username, password } directly to Apps Script URL in one place,
    // BUT also has a form that might post here?
    // Let's check AdminDashboard.tsx again.
    // AdminDashboard.tsx lines 116-154: It calls GOOGLE_SCRIPT_API_URL DIRECTLY.
    // So this endpoint might not even be used by the frontend anymore for login?
    // Wait, line 391 in original api/index.ts had /api/admin/login.
    // Let's keep a proxy endpoint just in case, using Apps Script.
    
    const result = await callAppsScript('login', { username: username || 'admin', password });
    res.json(result);
  } catch (e: any) {
    console.error("Error in /api/admin/login:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
});

// Serve static files in production (Vercel handles this via rewrites, but good for fallback)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist", "index.html"));
  });
}

// Only listen if run directly (not imported as a module)
if (import.meta.url === `file://${process.argv[1]}`) {
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
