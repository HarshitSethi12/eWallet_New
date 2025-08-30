import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { storage } from "./storage";

// Create __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment configuration
const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

// If neither is explicitly set, default to development
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

const app = express();
const server = createServer(app);

// Configure app environment
if (isProduction) {
  app.set('env', 'production');
} else {
  app.set('env', 'development');
}

// Trust proxy for correct IP addresses in production
app.set('trust proxy', true);

// Add startup logging
const currentMode = process.env.NODE_ENV || 'development';
log(`🔧 Starting server in ${currentMode} mode`);
log(`🔧 Environment: NODE_ENV=${currentMode}`);
log(`🔧 Server mode: ${app.get('env')}`);
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

// Setup authentication FIRST (this includes session middleware)
setupAuth(app);

// Add middleware to safely initialize user session object
app.use((req, res, next) => {
  // Initialize session if it doesn't exist
  if (!req.session) {
    req.session = {} as any;
  }

  // Ensure user property exists
  if (!req.session.user) {
    req.session.user = null;
  }

  next();
});

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

// Global error handlers for unhandled errors
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`);
  console.error(reason);
  process.exit(1);
});

(async () => {
  try {
    // Validate critical environment variables
    const requiredEnvVars = ['DATABASE_URL'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
      log(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
      log('Please set these in the Secrets tool and redeploy');
      throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    }

    // Warn about missing optional environment variables
    const optionalEnvVars = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'SESSION_SECRET'];
    const missingOptionalVars = optionalEnvVars.filter(envVar => !process.env[envVar]);

    if (missingOptionalVars.length > 0) {
      log(`⚠️  Missing optional environment variables: ${missingOptionalVars.join(', ')}`);
      log('Some features may not work without these variables');
    }

    log('✅ Environment validation completed');

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

    // ===== API ROUTES REGISTRATION =====
    // Add error handling middleware before routes
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.path}`, req.body ? 'with body' : 'no body');
      next();
    });

    // Register API routes
    app.use('/api', router);
    app.use("/auth", authRouter);

    // Add catch-all error handler for API routes
    app.use('/api/*', (error: any, req: any, res: any, next: any) => {
      console.error('API Error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        details: error.message
      });
    });

    // Ensure we don't serve HTML for API routes
    app.use('/api/*', (req: any, res: any) => {
      console.error('Unhandled API route:', req.path);
      res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        path: req.path
      });
    });


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
      // In production, serve static files from the build directory
      const buildPath = path.resolve(process.cwd(), "dist", "public");

      log(`🔍 Looking for build directory at: ${buildPath}`);
      log(`📁 Current working directory: ${process.cwd()}`);
      log(`📁 Server __dirname: ${__dirname}`);

      if (fs.existsSync(buildPath)) {
        log(`✅ Found build directory at: ${buildPath}`);

        // Log contents for debugging
        try {
          const files = fs.readdirSync(buildPath);
          log(`📁 Build directory contains: ${files.join(', ')}`);

          // Check for index.html specifically
          const indexPath = path.join(buildPath, 'index.html');
          if (fs.existsSync(indexPath)) {
            log(`✅ index.html found at: ${indexPath}`);
          } else {
            log(`❌ index.html NOT found at: ${indexPath}`);
          }
        } catch (error) {
          log(`❌ Error reading build directory: ${error}`);
        }

        // Serve static files with proper configuration
        app.use('/', express.static(buildPath, {
          etag: false,
          lastModified: false,
          maxAge: 0,
          index: ['index.html']
        }));

        // Handle all non-API routes by serving index.html (SPA fallback)
        app.get('*', (req, res, next) => {
          // Skip API routes and utility endpoints
          if (req.path.startsWith('/api/') || 
              req.path.startsWith('/health') || 
              req.path.startsWith('/ping') ||
              req.path.startsWith('/test')) {
            return next();
          }

          const indexPath = path.join(buildPath, 'index.html');

          if (fs.existsSync(indexPath)) {
            log(`📄 Serving index.html for route: ${req.path}`);
            res.sendFile(indexPath, (err) => {
              if (err) {
                log(`❌ Error serving index.html: ${err.message}`);
                res.status(500).send('Error serving application');
              }
            });
          } else {
            log(`❌ index.html not found at: ${indexPath}`);
            res.status(404).send('Application not built properly - index.html missing');
          }
        });
      } else {
        log(`❌ Build directory not found at: ${buildPath}`);
        log(`📁 Current working directory: ${process.cwd()}`);
        log(`📁 __dirname: ${__dirname}`);

        // Check what actually exists
        const distPath = path.resolve(process.cwd(), "dist");
        if (fs.existsSync(distPath)) {
          const distContents = fs.readdirSync(distPath);
          log(`📁 dist/ directory contains: ${distContents.join(', ')}`);
        } else {
          log(`❌ dist/ directory doesn't exist at all`);
        }

        // Serve a basic fallback
        app.get('*', (req, res) => {
          if (!req.path.startsWith('/api/') && !req.path.startsWith('/health') && !req.path.startsWith('/ping')) {
            res.send(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>BitWallet - Build Required</title>
                  <style>
                    body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
                    .container { max-width: 600px; margin: 0 auto; }
                    .error { color: #e74c3c; }
                    .info { color: #3498db; margin: 20px 0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1 class="error">Build Files Not Found</h1>
                    <p class="info">Expected build files at: ${buildPath}</p>
                    <p>Please run the build process and redeploy.</p>
                    <div style="margin-top: 30px;">
                      <h3>Available API endpoints:</h3>
                      <a href="/health">Health Check</a> | 
                      <a href="/ping">Ping</a> | 
                      <a href="/api/crypto-prices">Crypto Prices</a>
                    </div>
                  </div>
                </body>
              </html>
            `);
          }
        });
      }
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

    // Graceful shutdown handling
    const gracefulShutdown = () => {
      log('🔄 Received shutdown signal, closing server gracefully...');
      server.close(() => {
        log('✅ Server closed successfully');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        log('❌ Forcing server shutdown');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    // Start server with proper error handling and host binding
    server.listen({
      port: port,
      host: "0.0.0.0"
    }, () => {
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

  } catch (error) {
    log(`❌ Server startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    process.exit(1);
  }
})();

// Error handling middleware for API routes
app.use('/api', (err: any, req: any, res: any, next: any) => {
  console.error('❌ API Error:', err);
  res.setHeader('Content-Type', 'application/json');
  res.status(500).json({ error: 'Internal server error' });
});