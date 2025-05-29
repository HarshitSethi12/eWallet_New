
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
      const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;
      oauth2Client.setCredentials({ refresh_token: null });
      
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

      const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;
      oauth2Client._setRedirectUri(redirectUri);
      
      const { tokens } = await oauth2Client.getToken(code);
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
      }
      res.redirect('/');
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
