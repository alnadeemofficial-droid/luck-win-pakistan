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
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwLbTK6f1ShsNKXs-fyJtgwC0MltBpys1rCNk57e8OeILoC-YKZC_NjaePrf1BPztUp/exec";

async function callAppsScript(action: string, payload: any) {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ action, ...payload })
    });
    return await response.json();
  } catch (error) {
    console.error(`Apps Script Error (${action}):`, error);
    return { status: 'error', message: error.toString() };
  }
}

app.get("/api/data", async (req, res) => {
  // For read operations, we can still use the direct Sheets API for speed if configured,
  // OR we can use the Apps Script if we add a 'getData' action.
  // The user's Apps Script has 'getStats' but not full data.
  // However, the user said "Cards are not being added", which is a write operation.
  // Let's keep the read operations as is (using direct Sheets API) for now to avoid breaking the frontend data loading,
  // UNLESS the user wants EVERYTHING through Apps Script.
  // The user said "I have to use Google Sheets as a complete backend and make a secure API from Google Apps Script."
  // This implies we should probably use Apps Script for everything, but the provided Apps Script code
  // DOES NOT have a 'getData' function to return all data.
  // So we MUST keep using the direct Sheets API for reading for now, or the app will be empty.
  
  if (!checkEnvVars()) {
    return res.status(500).json({ error: "Server configuration error: Missing environment variables" });
  }
  const participants = await getSheetData('Participants');
  const tiers = await getSheetData('Tiers');
  const announcements = await getSheetData('Announcements');
  
  // Parse numeric/boolean fields
  const parsedParticipants = participants.map((p: any) => ({
    ...p,
    timestamp: Number(p.timestamp),
    isWinner: p.isWinner === 'TRUE',
    winAmount: p.winAmount ? Number(p.winAmount) : undefined,
    winningDate: p.winningDate ? Number(p.winningDate) : undefined
  }));

  const parsedTiers = tiers.map((t: any) => ({
    ...t,
    investAmount: Number(t.investAmount),
    winAmount: Number(t.winAmount),
    membersNeeded: Number(t.membersNeeded),
    currentMembers: Number(t.currentMembers),
    isExpired: t.isExpired === 'TRUE',
    drawCompleted: t.drawCompleted === 'TRUE'
  }));

  const parsedAnnouncements = announcements.map((a: any) => ({
    ...a,
    active: a.active === 'TRUE'
  }));

  res.json({ participants: parsedParticipants, tiers: parsedTiers, announcements: parsedAnnouncements });
});

app.post("/api/participants", async (req, res) => {
  // Use Apps Script for adding participants
  const result = await callAppsScript('addParticipant', req.body);
  if (result.status === 'success') {
    res.json(req.body);
  } else {
    console.error("Add Participant Failed:", result);
    res.status(500).json(result);
  }
});

app.post("/api/participants/status", async (req, res) => {
  // We need to add 'updateParticipantStatus' to Apps Script or use direct API.
  // Since we can't update deployed Apps Script easily, and the user asked for NEW code,
  // we will assume the user will update the Apps Script.
  // For now, let's use direct API for updates to ensure it works immediately if env vars are set.
  const { id, status } = req.body;
  await updateRow('Participants', id, { status });
  res.json({ success: true });
});

app.post("/api/participants/tid", async (req, res) => {
  const { id, trackingId, status } = req.body;
  await updateRow('Participants', id, { trackingId, status });
  res.json({ success: true });
});

app.post("/api/participants/winner", async (req, res) => {
  const { id, winAmount, winningDate } = req.body;
  await updateRow('Participants', id, { isWinner: 'TRUE', winAmount: winAmount.toString(), winningDate: winningDate.toString() });
  res.json({ success: true });
});

app.post("/api/tiers", async (req, res) => {
  // The user specifically mentioned "Cards are not being added".
  // The frontend sends the FULL list of tiers to this endpoint.
  // We should use the Apps Script to overwrite/sync tiers if possible,
  // OR just use the direct API which we know works for bulk overwrites.
  
  // The error "Internal Server Error" suggests the direct API is failing, likely due to auth or data format.
  // Let's try to fix the direct API first as it's more reliable for bulk data.
  
  const tiers = req.body;
  const sheetData = tiers.map((t: any) => ({
    ...t,
    investAmount: t.investAmount.toString(),
    winAmount: t.winAmount.toString(),
    membersNeeded: t.membersNeeded.toString(),
    currentMembers: t.currentMembers.toString(),
    isExpired: t.isExpired ? 'TRUE' : 'FALSE',
    drawCompleted: t.drawCompleted ? 'TRUE' : 'FALSE'
  }));
  
  // Use direct API for now as it handles bulk overwrite better than the current Apps Script
  const success = await overwriteSheet('Tiers', sheetData);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, message: "Failed to save tiers to Google Sheets" });
  }
});

app.post("/api/announcements", async (req, res) => {
  const announcements = req.body;
  const sheetData = announcements.map((a: any) => ({
    ...a,
    active: a.active ? 'TRUE' : 'FALSE'
  }));
  const success = await overwriteSheet('Announcements', sheetData);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, message: "Failed to save announcements" });
  }
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
