import express from "express";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// Set default password if missing
if (!process.env.ADMIN_PASSWORD) {
  console.warn("ADMIN_PASSWORD missing, defaulting to '12345'");
  process.env.ADMIN_PASSWORD = '12345';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Debug helper to check env vars (logs to Vercel functions console)
const checkEnvVars = () => {
  const missing = [];
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) missing.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!process.env.GOOGLE_PRIVATE_KEY) missing.push('GOOGLE_PRIVATE_KEY');
  if (!process.env.GOOGLE_SHEET_ID) missing.push('GOOGLE_SHEET_ID');
  
  if (missing.length > 0) {
    console.error("Missing Environment Variables:", missing.join(", "));
    return false;
  }
  return true;
};

// Google Sheets Setup
let doc: GoogleSpreadsheet | null = null;

async function initGoogleSheets() {
  if (doc) return doc;
  
  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_SHEET_ID) {
      console.log("Initializing Google Sheets with JWT:", {
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        sheetId: process.env.GOOGLE_SHEET_ID,
        keyLength: process.env.GOOGLE_PRIVATE_KEY.length,
      });

      const serviceAccountAuth = new JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/"/g, ''),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
      return doc;
    } else {
      console.error("Missing Google Sheets credentials in initGoogleSheets");
      return null;
    }
  } catch (err) {
    console.error("Failed to initialize Google Sheets:", err);
    return null;
  }
  return null;
}

// Helper to get sheet data
async function getSheetData(sheetTitle: string) {
  const currentDoc = await initGoogleSheets();
  if (!currentDoc) return [];
  
  try {
    await currentDoc.loadInfo();
    let sheet = currentDoc.sheetsByTitle[sheetTitle];
    if (!sheet) {
      sheet = await currentDoc.addSheet({ title: sheetTitle });
    }
    const rows = await sheet.getRows();
    
    // Convert to plain object
    return rows.map(row => {
      const obj: any = {};
      sheet.headerValues.forEach((header: string) => {
        obj[header] = row[header];
      });
      // Add ID if available (usually row.id or row._rowNumber but let's stick to headers)
      // If we need the row ID for updates, v4 rows have 'id' property? No, they have rowIndex.
      // But our app uses a column named 'id'.
      return obj;
    });
  } catch (error) {
    console.error(`Error fetching ${sheetTitle}:`, error);
    return [];
  }
}

// Helper to add row
async function addRow(sheetTitle: string, data: any) {
  const currentDoc = await initGoogleSheets();
  if (!currentDoc) return false;
  
  try {
    await currentDoc.loadInfo();
    let sheet = currentDoc.sheetsByTitle[sheetTitle];
    if (!sheet) {
      // Create sheet with headers if not exists
      const headers = Object.keys(data);
      sheet = await currentDoc.addSheet({ title: sheetTitle, headerValues: headers });
    }
    await sheet.addRow(data);
    return true;
  } catch (error) {
    console.error(`Error adding row to ${sheetTitle}:`, error);
    return false;
  }
}

// Helper to update row
async function updateRow(sheetTitle: string, id: string, updates: any) {
  const currentDoc = await initGoogleSheets();
  if (!currentDoc) return false;
  
  try {
    await currentDoc.loadInfo();
    const sheet = currentDoc.sheetsByTitle[sheetTitle];
    if (!sheet) return false;
    const rows = await sheet.getRows();
    // Find row by 'id' column
    const row = rows.find(r => r['id'] === id);
    if (row) {
      Object.keys(updates).forEach(key => {
        row[key] = updates[key];
      });
      await row.save();
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error updating row in ${sheetTitle}:`, error);
    return false;
  }
}

// Helper to overwrite sheet (for bulk updates like Tiers/Announcements)
async function overwriteSheet(sheetTitle: string, data: any[]) {
  const currentDoc = await initGoogleSheets();
  if (!currentDoc) return false;
  
  try {
    await currentDoc.loadInfo();
    let sheet = currentDoc.sheetsByTitle[sheetTitle];
    
    // If data is empty, we still want to clear the sheet but maybe keep headers?
    // Or if sheet doesn't exist, create it.
    
    if (sheet) {
      await sheet.clear();
      if (data.length > 0) {
        // Ensure all objects have the same keys for headers
        const headers = Object.keys(data[0]);
        await sheet.setHeaderRow(headers);
        await sheet.addRows(data);
      }
    } else if (data.length > 0) {
      await currentDoc.addSheet({ title: sheetTitle, headerValues: Object.keys(data[0]) });
      const newSheet = currentDoc.sheetsByTitle[sheetTitle];
      await newSheet.addRows(data);
    } else {
        // Data is empty and sheet doesn't exist. Create empty sheet.
        await currentDoc.addSheet({ title: sheetTitle });
    }
    return true;
  } catch (error) {
    console.error(`Error overwriting ${sheetTitle}:`, error);
    return false;
  }
}

// Debug Auth Endpoint
app.get("/api/debug-auth", async (req, res) => {
  try {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    let key = process.env.GOOGLE_PRIVATE_KEY;
    
    if (!email || !sheetId || !key) {
      return res.status(500).json({ 
        success: false, 
        message: "Missing env vars", 
        details: { 
          hasEmail: !!email, 
          hasSheetId: !!sheetId, 
          hasKey: !!key 
        } 
      });
    }

    // Fix key formatting
    key = key.replace(/\\n/g, '\n').replace(/"/g, '');
    if (!key.startsWith('-----BEGIN PRIVATE KEY-----')) {
       // Attempt to fix if headers are missing (common copy-paste error)
       key = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
    }

    console.log("Debug Auth: Attempting connection...");
    
    const serviceAccountAuth = new JWT({
      email: email,
      key: key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo();
    
    res.json({ 
      success: true, 
      message: "Connection Successful!", 
      sheetTitle: doc.title,
      sheetCount: doc.sheetCount 
    });

  } catch (error: any) {
    console.error("Debug Auth Failed:", error);
    res.status(500).json({ 
      success: false, 
      message: "Connection Failed", 
      error: error.message,
      stack: error.stack
    });
  }
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", env: checkEnvVars() ? "configured" : "missing" });
});

// Proxy requests to Google Apps Script
// 👇👇👇 REPLACE THIS WITH YOUR NEW DEPLOYED WEB APP URL 👇👇👇
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzUD1ijzm5yZ-OM_42JsuDoONPbj6CsJU3NwDP1JFZuCbKoI0dlog422Cj7YHeVnuE/exec"; 
// 👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆👆

async function callAppsScript(action: string, payload: any = {}) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...payload })
    });
    
    const text = await response.text();
    try {
        if (!text) {
            console.warn(`Apps Script returned empty response for action: ${action}`);
            return { status: 'error', message: 'Empty response from Apps Script' };
        }
        return JSON.parse(text);
    } catch (e) {
        console.error(`Apps Script Invalid JSON (${action}):`, text.substring(0, 500)); // Log first 500 chars
        return { status: 'error', message: 'Invalid JSON from Apps Script', raw: text.substring(0, 100) };
    }
  } catch (error) {
    console.error(`Apps Script Network Error (${action}):`, error);
    return { status: 'error', message: error.toString() };
  }
}

app.get("/api/data", async (req, res) => {
  const result = await callAppsScript('getData');
  if (result.status === 'success') {
    res.json(result.data);
  } else {
    // Fallback empty structure if fetch fails, to prevent frontend crash
    // Also log the error so we can see it in server logs
    console.error("Failed to fetch data from Apps Script:", result);
    res.json({ participants: [], tiers: [], announcements: [] });
  }
});

app.post("/api/participants", async (req, res) => {
  const result = await callAppsScript('addParticipant', req.body);
  res.json(result);
});

app.post("/api/participants/status", async (req, res) => {
  const result = await callAppsScript('updateParticipantStatus', req.body);
  res.json(result);
});

app.post("/api/participants/tid", async (req, res) => {
  const result = await callAppsScript('updateParticipantTID', req.body);
  res.json(result);
});

app.post("/api/participants/winner", async (req, res) => {
  const result = await callAppsScript('updateParticipantWinner', req.body);
  res.json(result);
});

app.post("/api/tiers", async (req, res) => {
  const result = await callAppsScript('saveTiers', { tiers: req.body });
  res.json(result);
});

app.post("/api/announcements", async (req, res) => {
  const result = await callAppsScript('saveAnnouncements', { announcements: req.body });
  res.json(result);
});

app.post("/api/test-seed", async (req, res) => {
  if (!checkEnvVars()) {
    return res.status(500).json({ success: false, message: "Missing environment variables" });
  }

  const dummyTiers = [
    {
      id: '1',
      investAmount: '1000',
      winAmount: '2000',
      membersNeeded: '10',
      currentMembers: '0',
      qrData: '03001234567',
      qrImage: '',
      color: 'bg-blue-500',
      isExpired: 'FALSE',
      drawCompleted: 'FALSE'
    },
    {
      id: '2',
      investAmount: '2000',
      winAmount: '4500',
      membersNeeded: '15',
      currentMembers: '0',
      qrData: '03001234567',
      qrImage: '',
      color: 'bg-purple-500',
      isExpired: 'FALSE',
      drawCompleted: 'FALSE'
    },
    {
      id: '3',
      investAmount: '5000',
      winAmount: '12000',
      membersNeeded: '20',
      currentMembers: '0',
      qrData: '03001234567',
      qrImage: '',
      color: 'bg-green-500',
      isExpired: 'FALSE',
      drawCompleted: 'FALSE'
    },
    {
      id: '4',
      investAmount: '10000',
      winAmount: '25000',
      membersNeeded: '25',
      currentMembers: '0',
      qrData: '03001234567',
      qrImage: '',
      color: 'bg-red-500',
      isExpired: 'FALSE',
      drawCompleted: 'FALSE'
    },
    {
      id: '5',
      investAmount: '25000',
      winAmount: '70000',
      membersNeeded: '30',
      currentMembers: '0',
      qrData: '03001234567',
      qrImage: '',
      color: 'bg-yellow-500',
      isExpired: 'FALSE',
      drawCompleted: 'FALSE'
    }
  ];

  const success = await overwriteSheet('Tiers', dummyTiers);
  if (success) {
    res.json({ success: true, message: "5 Test Tiers added to Google Sheet!" });
  } else {
    res.status(500).json({ success: false, message: "Failed to write to Google Sheet" });
  }
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  // Ensure ADMIN_PASSWORD is set in environment variables
  const adminPassword = process.env.ADMIN_PASSWORD;
  
  if (!adminPassword) {
    console.error("ADMIN_PASSWORD environment variable is not set.");
    return res.status(500).json({ success: false, message: "Server configuration error: ADMIN_PASSWORD missing" });
  }

  // Debug logging (safe)
  console.log(`Login attempt: Received password length ${password?.length}, Expected password length ${adminPassword.length}`);
  console.log(`Expected password (first 2 chars): ${adminPassword.substring(0, 2)}...`);
  
  // Trim both to avoid whitespace issues
  if (password?.trim() === adminPassword.trim()) {
    res.json({ success: true });
  } else {
    console.warn("Login failed: Password mismatch");
    res.status(401).json({ success: false, message: 'Invalid password' });
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
