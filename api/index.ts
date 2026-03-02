import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Proxy requests to Google Apps Script
// FOR TESTING ONLY: Hardcoded URL as requested. Will switch back to env var later.
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyRa2e48kxuKv6gb6aA_QvaN9wrg3UkZPAkngsQnJHJW0ckXMAo097GoTo7imu_JBX4/exec";
// const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL ? process.env.GOOGLE_SCRIPT_URL.trim() : "";

if (!GOOGLE_SCRIPT_URL) {
  console.error("CRITICAL ERROR: GOOGLE_SCRIPT_URL is not defined.");
} else {
  console.log("GOOGLE_SCRIPT_URL is set (Hardcoded for testing):", GOOGLE_SCRIPT_URL.substring(0, 10) + "...");
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
      timeout: 25000 // Increased timeout for Vercel/GAS
    });
    
    const data = response.data;

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
  res.json({ status: "ok", mode: "proxy_only", env_check: !!GOOGLE_SCRIPT_URL });
});

app.get("/api/data", async (req, res) => {
  try {
    const result = await callAppsScript('getData');
    if (result.status === 'success') {
      res.json(result.data);
    } else {
      console.error("Failed to fetch data from Apps Script:", result);
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

app.post("/api/ads", async (req, res) => {
  try {
    const result = await callAppsScript('saveAds', { ads: req.body });
    res.json(result);
  } catch (e: any) {
    console.error("Error in /api/ads:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
});

app.post("/api/terms", async (req, res) => {
  try {
    const result = await callAppsScript('saveTerms', { terms: req.body });
    res.json(result);
  } catch (e: any) {
    console.error("Error in /api/terms:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await callAppsScript('login', { username: username || 'admin', password });
    res.json(result);
  } catch (e: any) {
    console.error("Error in /api/admin/login:", e);
    res.status(500).json({ status: 'error', message: e.toString() });
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
