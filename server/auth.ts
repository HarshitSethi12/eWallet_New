
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import express from 'express';
import session from 'express-session';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

export function setupAuth(app: express.Express) {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false
  }));

  // Temporarily disable auth until credentials are set up
  app.use(passport.initialize());
  app.use(passport.session());
  
  /*
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: '/auth/google/callback'
  },
  */
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Create or get user
      const user = await storage.findOrCreateUser({
        googleId: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName
      });
      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }));

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
  );

  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
      const token = jwt.sign({ userId: req.user.id }, process.env.JWT_SECRET || '');
      res.redirect(`/?token=${token}`);
    }
  );

  app.get('/auth/logout', (req, res) => {
    req.logout(() => {
      res.redirect('/');
    });
  });
}
