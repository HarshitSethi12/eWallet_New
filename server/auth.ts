
import express from 'express';
import session from 'express-session';
import { oauth2Client, GOOGLE_CLIENT_ID } from './config/auth';

export function setupAuth(app: express.Express) {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  app.get('/auth/google', async (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    });
    res.redirect(url);
  });

  app.get('/auth/callback', async (req, res) => {
    try {
      const { tokens } = await oauth2Client.getToken(req.query.code as string);
      oauth2Client.setCredentials(tokens);
      
      const userInfo = await oauth2Client.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo'
      });
      
      req.session.user = userInfo.data;
      res.redirect('/');
    } catch (error) {
      res.redirect('/auth/error');
    }
  });

  app.get('/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
}
