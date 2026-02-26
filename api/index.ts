import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Proxy requests to Google Apps Script
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL ? process.env.GOOGLE_SCRIPT_URL.trim() : "";

if (!GOOGLE_SCRIPT_URL) {
  console.error("CRITICAL ERROR: GOOGLE_SCRIPT_URL is not defined in environment variables.");
} else {
  console.log("GOOGLE_SCRIPT_URL is set:", GOOGLE_SCRIPT_URL.substring(0, 10) + "...");
}

async function callAppsScript(action: string, payload: any = {}) {
  if (!GOOGLE_SCRIPT_URL) {
    console.error("Attempted to call Apps Script without GOOGLE_SCRIPT_URL set.");
    return { status: 'error', message: 'Server Configuration Error: GOOGLE_SCRIPT_URL is missing in environment variables.' };
  }

  try {
    console.log(`Calling Apps Script: ${action}`);
    const response = await axios.post(GOOGLE_SCRIPT_URL, { action, ...payload }, {
      headers: {
        'Content-Type': 'application/json',
      },
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 300,
      timeout: 15000 // 15 second timeout
    });
    
    const data = response.data;
    // console.log(`Apps Script Response (${action}):`, JSON.stringify(data).substring(0, 100) + "...");

    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
             console.warn(`Apps Script returned string but not JSON for action: ${action}`);
             if (data.trim().startsWith('<')) {
                 return { status: 'error', message: 'Apps Script returned HTML (likely error page or 404)', raw: data.substring(0, 100) };
             }
             return { status: 'error', message: 'Invalid response format from Apps Script', raw: data.substring(0, 100) };
        }
    }
    
    return data;

  } catch (error: any) {
    console.error(`Apps Script Network Error (${action}):`, error.message);
    if (error.response) {
        console.error(`Apps Script Error Response (${action}):`, error.response.status, error.response.data);
        return { status: 'error', message: `Apps Script Error: ${error.response.status}`, details: error.response.data };
    }
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
    console.log("POST /api/tiers payload:", JSON.stringify(req.body).substring(0, 100) + "...");
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
