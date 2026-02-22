import express from "express";
import { createServer as createViteServer } from "vite";
import app from "./api/index.js"; // Import the Express app
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });

  // Use Vite's connect instance as middleware
  // We need to mount the API app *before* Vite if we want API to take precedence,
  // OR mount Vite *after* API. 
  // In the previous setup, app.use(vite) was called.
  // Express app can be used as a sub-app or we can just attach Vite to it.
  
  // Actually, we want to use the `app` we imported, and attach Vite to it.
  app.use(vite.middlewares);

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Local Dev Server running on http://localhost:${PORT}`);
  });
}

startServer();
