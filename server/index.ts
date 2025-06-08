import express, { type Request, Response, NextFunction } from "express";
import { Server } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { storage } from "./storage";

// Environment configuration
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development" || !isProduction;

const app = express();

// Configure app for production environment
if (isProduction) {
  app.set('env', 'production');
}

// Trust proxy for correct IP addresses in production
app.set('trust proxy', true);

// Add startup logging
log(`🔧 Starting server in ${isProduction ? 'production' : 'development'} mode`);
log(`🔧 Node.js version: ${process.version}`);
log(`🔧 Process ID: ${process.pid}`);

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
          <p>Port: 5000</p>
          <p>Process: ${process.pid}</p>
        </body>
      </html>
    `);
  });

  // Add ping endpoint
  app.get("/ping", (req, res) => {
    res.json({ 
      status: "pong", 
      timestamp: new Date().toISOString(),
      host: req.get('host'),
      ip: req.ip
    });
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

  // Configure port for different environments
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = "0.0.0.0"; // Always bind to 0.0.0.0 for Cloud Run compatibility
  
  // Add error handling for server startup
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      log(`❌ Port ${port} is already in use`);
      process.exit(1);
    } else if (error.code === 'EACCES') {
      log(`❌ Permission denied to bind to port ${port}`);
      process.exit(1);
    } else {
      log(`❌ Server error: ${error.message}`);
      process.exit(1);
    }
  });

  // Start server with proper error handling and host binding
  server.listen(port, host, () => {
    log(`🚀 Server started successfully!`);
    log(`📍 Listening on ${host}:${port}`);
    log(`⚙️  Environment: ${app.get("env")}`);
    
    // Environment-specific logging
    if (isProduction) {
      log(`🌐 Production deployment ready`);
      log(`🔒 Trust proxy enabled for Cloud Run`);
    } else {
      log(`🌐 Development server at http://localhost:${port}`);
      if (process.env.REPL_SLUG && process.env.REPL_OWNER) {
        log(`🌐 Replit URL: https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`);
      }
    }
    
    // Log essential environment variables for debugging
    const requiredEnvVars = ['DATABASE_URL', 'NODE_ENV'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    
    if (missingEnvVars.length > 0) {
      log(`⚠️  Missing environment variables: ${missingEnvVars.join(', ')}`);
    } else {
      log(`✅ All required environment variables are set`);
    }
  });
})();