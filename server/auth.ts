import express from 'express';
import session from 'express-session';

export function setupAuth(app: express.Express) {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false
  }));

  // Basic authentication middleware
  app.use((req, res, next) => {
    // Allow all requests for now
    next();
  });

  app.get('/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
}