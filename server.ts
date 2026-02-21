import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory store (Note: This will reset on server restart)
  // For production, connect this to a database like Supabase or MongoDB
  let participants: any[] = [];
  let tiers: any[] = [];
  let announcements: any[] = [];

  // API Routes
  app.get("/api/data", (req, res) => {
    res.json({ participants, tiers, announcements });
  });

  app.post("/api/participants", (req, res) => {
    const participant = req.body;
    participants = [participant, ...participants];
    res.json(participant);
  });

  app.post("/api/participants/status", (req, res) => {
    const { id, status } = req.body;
    participants = participants.map(p => p.id === id ? { ...p, status } : p);
    res.json({ success: true });
  });

  app.post("/api/participants/tid", (req, res) => {
    const { id, trackingId, status } = req.body;
    participants = participants.map(p => p.id === id ? { ...p, trackingId, status } : p);
    res.json({ success: true });
  });

  app.post("/api/participants/winner", (req, res) => {
    const { id, winAmount, winningDate } = req.body;
    participants = participants.map(p => p.id === id ? { ...p, isWinner: true, winAmount, winningDate } : p);
    res.json({ success: true });
  });

  app.post("/api/tiers", (req, res) => {
    tiers = req.body;
    res.json({ success: true });
  });

  app.post("/api/announcements", (req, res) => {
    announcements = req.body;
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
