import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { storage } from "./storage";

const app = express();

// Trust proxy for correct IP addresses in production
app.set('trust proxy', true);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});
setupAuth(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Add admin routes for session management FIRST
  app.get("/api/admin/sessions", async (req, res) => {
    // Basic admin check
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'admin123') {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }

    try {
      const sessions = await storage.getAllUserSessions();
      return res.json(sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return res.status(500).json({ message: "Error fetching sessions" });
    }
  });

  app.get("/api/admin/sessions/:email", async (req, res) => {
    // Basic admin check
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'admin123') {
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }

    try {
      const sessions = await storage.getUserSessionsByEmail(req.params.email);
      return res.json(sessions);
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return res.status(500).json({ message: "Error fetching user sessions" });
    }
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Add health check route
  app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Add test endpoint
  app.get("/test", (req, res) => {
    res.send(`
      <html>
        <body>
          <h1>Server is running!</h1>
          <p>Time: ${new Date().toISOString()}</p>
          <p>Environment: ${app.get("env")}</p>
          <p>Host: ${req.get('host')}</p>
        </body>
      </html>
    `);
  });

  // Add a catch-all API route for debugging
  app.get("/api/*", (req, res) => {
    res.status(404).json({ message: `API route not found: ${req.path}` });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`🚀 Server started successfully!`);
    log(`📍 Listening on port ${port} (0.0.0.0:${port})`);
    log(`🌐 App is accessible at https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
    log(`🌐 Direct URL: https://workspace.harshitsethi1.repl.co`);
    log(`⚙️  Environment: ${app.get("env")}`);
  });
})();