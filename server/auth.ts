import express from 'express';
import session from 'express-session';
import { oauth2Client, GOOGLE_CLIENT_ID } from './config/auth';

declare module 'express-session' {
  interface SessionData {
    user?: any;
    state?: string;
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
      // Use the exact redirect URI that matches your Google Cloud Console configuration
      const baseUrl = req.get('host')?.includes('replit.dev') 
        ? `https://${req.get('host')}`
        : `${req.protocol}://${req.get('host')}`;
      const redirectUri = `${baseUrl}/auth/callback`;

      console.log('Generated redirect URI:', redirectUri);

      const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email'
        ],
        redirect_uri: redirectUri
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

      // Use the same redirect URI logic as in /auth/google
      const baseUrl = req.get('host')?.includes('replit.dev') 
        ? `https://${req.get('host')}`
        : `${req.protocol}://${req.get('host')}`;
      const redirectUri = `${baseUrl}/auth/callback`;

      console.log('Using redirect URI for token exchange:', redirectUri);

      // Set redirect URI properly
      const tempClient = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      const { tokens } = await tempClient.getToken(code);
      oauth2Client.setCredentials(tokens);

      const userInfo = await oauth2Client.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo'
      });

      req.session.user = userInfo.data;
      res.redirect('/?authenticated=true');
    } catch (error) {
      console.error('Callback error:', error);
      res.redirect('/?error=auth_callback_failed');
    }
  });

  app.get('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  app.get('/auth/user', (req, res) => {
    if (req.session.user) {
      res.json(req.session.user);
    } else {
      res.status(401).json({ error: 'Not authenticated' });
    }
  });
}

import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';