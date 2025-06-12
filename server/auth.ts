import express from 'express';
import session from 'express-session';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from './storage';

declare module 'express-session' {
  interface SessionData {
    user?: any;
    state?: string;
    sessionDbId?: number;
  }
}

export function setupAuth(app: express.Express) {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  app.get('/auth/google', async (req, res) => {
    try {
      // Create OAuth client with proper configuration
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      // Handle different Replit domains and development URLs
      const host = req.get('host');
      let baseUrl;

      if (host?.includes('replit.dev') || host?.includes('repl.co')) {
        baseUrl = `https://${host}`;
      } else if (req.get('x-forwarded-proto')) {
        baseUrl = `${req.get('x-forwarded-proto')}://${host}`;
      } else {
        baseUrl = `${req.protocol}://${host}`;
      }

      const redirectUri = `${baseUrl}/auth/callback`;

      console.log('Generated redirect URI:', redirectUri);

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email'
        ],
        redirect_uri: redirectUri,
        prompt: 'select_account'  // Force account selection every time
      });

      res.redirect(url);
    } catch (error) {
      console.error('Auth error:', error);
      res.redirect('/?error=auth_failed');
    }
  });

  app.get('/auth/callback', async (req, res) => {
    try {
      const code = req.query.code as string;
      if (!code) {
        return res.redirect('/?error=no_code');
      }

      // Handle different Replit domains and development URLs
      const host = req.get('host');
      let baseUrl;

      if (host?.includes('replit.dev') || host?.includes('repl.co')) {
        baseUrl = `https://${host}`;
      } else if (req.get('x-forwarded-proto')) {
        baseUrl = `${req.get('x-forwarded-proto')}://${host}`;
      } else {
        baseUrl = `${req.protocol}://${host}`;
      }

      const redirectUri = `${baseUrl}/auth/callback`;

      console.log('Using redirect URI for token exchange:', redirectUri);

      // Set redirect URI properly
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const userInfo = await oauth2Client.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo'
      });

      req.session.user = userInfo.data;

      // Track login session
      const sessionData = {
        userId: null, // We'll need to create/find user first
        email: userInfo.data.email,
        name: userInfo.data.name,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        sessionId: req.sessionID,
      };

      console.log('Creating session with data:', sessionData);
      const sessionDbId = await storage.createUserSession(sessionData);
      console.log('Session created with ID:', sessionDbId);
      req.session.sessionDbId = sessionDbId;

      res.redirect('/dashboard');
    } catch (error) {
      console.error('Callback error:', error);
      res.redirect('/?error=auth_callback_failed');
    }
  });

  app.get('/auth/logout', async (req, res) => {
    const sessionDbId = req.session.sessionDbId;

    // Update session end time if we have a tracked session
    if (sessionDbId) {
      await storage.endUserSession(sessionDbId);
    }

    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  // Apple Sign In routes
  app.get('/auth/apple', async (req, res) => {
    try {
      const state = crypto.randomBytes(16).toString('hex');
      req.session.state = state;

      // Handle different Replit domains and development URLs
      const host = req.get('host');
      let baseUrl;

      if (host?.includes('replit.dev') || host?.includes('repl.co')) {
        baseUrl = `https://${host}`;
      } else if (req.get('x-forwarded-proto')) {
        baseUrl = `${req.get('x-forwarded-proto')}://${host}`;
      } else {
        baseUrl = `${req.protocol}://${host}`;
      }

      const redirectUri = `${baseUrl}/auth/callback`;

      const params = new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID || '',
        redirect_uri: redirectUri,
        response_type: 'code id_token',
        scope: 'name email',
        response_mode: 'form_post',
        state: state,
      });

      const appleAuthUrl = `https://appleid.apple.com/auth/authorize?${params}`;
      res.redirect(appleAuthUrl);
    } catch (error) {
      console.error('Apple auth error:', error);
      res.redirect('/?error=apple_auth_failed');
    }
  });

  app.post('/auth/apple/callback', async (req, res) => {
    try {
      const { code, id_token, state } = req.body;

      if (!state || state !== req.session.state) {
        return res.redirect('/?error=invalid_state');
      }

      if (!id_token) {
        return res.redirect('/?error=no_id_token');
      }

      // Decode the ID token (Apple sends user info in the JWT)
      const decoded = jwt.decode(id_token) as any;

      if (!decoded) {
        return res.redirect('/?error=invalid_token');
      }

      // Create user object similar to Google's format
      const appleUser = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name || `Apple User`,
        given_name: decoded.name?.split(' ')[0] || 'Apple',
        family_name: decoded.name?.split(' ').slice(1).join(' ') || 'User',
        picture: null, // Apple doesn't provide profile pictures
        provider: 'apple'
      };

      req.session.user = appleUser;

      // Track login session
      const sessionData = {
        userId: null,
        email: appleUser.email,
        name: appleUser.name,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        sessionId: req.sessionID,
      };

      const sessionDbId = await storage.createUserSession(sessionData);
      req.session.sessionDbId = sessionDbId;

      res.redirect('/?authenticated=true&provider=apple');
    } catch (error) {
      console.error('Apple callback error:', error);
      res.redirect('/?error=apple_callback_failed');
    }
  });

  app.get('/auth/user', (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });
}