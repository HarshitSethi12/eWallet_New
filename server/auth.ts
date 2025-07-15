import express from 'express';
import session from 'express-session';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from './storage';
import twilio from 'twilio';
import NodeCache from 'node-cache';

declare module 'express-session' {
  interface SessionData {
    user?: any;
    state?: string;
    sessionDbId?: number;
    phoneNumber?: string;
    isPhoneVerified?: boolean;
  }
}

// OTP cache - stores OTP codes for 5 minutes
const otpCache = new NodeCache({ stdTTL: 300 });

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export function setupAuth(app: express.Express) {
  // Setup session middleware FIRST
  app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key-for-dev',
    resave: false,
    saveUninitialized: true, // Changed to true for better compatibility
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'sessionId' // Add explicit session name
  }));

  // Session initialization middleware
  app.use((req, res, next) => {
    try {
      // Initialize session if it doesn't exist
      if (!req.session) {
        req.session = {} as any;
      }
      
      // Ensure user property exists
      if (req.session.user === undefined) {
        req.session.user = null;
      }
      
      // Debug middleware to log session state
      console.log('🔍 Session Debug:', {
        sessionID: req.sessionID || 'no-session-id',
        hasUser: !!req.session.user,
        userProvider: req.session.user?.provider || 'none',
        cookieSecure: req.session.cookie?.secure || false,
        userAgent: req.get('User-Agent')?.substring(0, 50) || 'no-user-agent'
      });
      
      next();
    } catch (error) {
      console.error('Session initialization error:', error);
      // Continue with empty session
      req.session = { user: null } as any;
      next();
    }
  });

  app.get('/auth/google', async (req, res) => {
    try {
      // Validate environment variables first
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('Missing Google OAuth credentials');
        console.error('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Set' : 'Missing');
        console.error('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing');
        return res.redirect('/?error=missing_credentials');
      }

      // Handle different Replit domains and development URLs
      const host = req.get('host');
      const proto = req.get('x-forwarded-proto') || 'https';

      // For Replit, always use https regardless of environment
      const baseUrl = `https://${host}`;
      const redirectUri = `${baseUrl}/auth/callback`;
      
      // Validate that we have the required OAuth credentials
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('Missing Google OAuth credentials');
        return res.redirect('/?error=missing_credentials');
      }

      console.log('=== GOOGLE AUTH DEBUG ===');
      console.log('Auth environment:', {
        host,
        proto,
        baseUrl,
        redirectUri,
        nodeEnv: process.env.NODE_ENV,
        clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
        clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
        fullUrl: req.url,
        originalUrl: req.originalUrl
      });

      // Generate completely clean OAuth URL with minimal parameters
      const oauthBaseUrl = 'https://accounts.google.com/oauth/authorize';
      const params = new URLSearchParams();
      params.set('client_id', process.env.GOOGLE_CLIENT_ID!);
      params.set('redirect_uri', redirectUri);
      params.set('response_type', 'code');
      params.set('scope', 'openid email profile');
      
      const url = `${oauthBaseUrl}?${params.toString()}`;

      console.log('Generated OAuth URL:', url);
      console.log('=== END DEBUG ===');
      res.redirect(url);
    } catch (error) {
      console.error('Auth error:', error);
      res.redirect('/?error=auth_failed');
    }
  });

  app.get('/auth/callback', async (req, res) => {
    try {
      const code = req.query.code as string;
      const error = req.query.error as string;

      if (error) {
        console.error('OAuth error from Google:', error);
        return res.redirect(`/?error=oauth_${error}`);
      }

      if (!code) {
        console.error('No authorization code received from Google');
        return res.redirect('/?error=no_code');
      }

      // Handle different Replit domains and development URLs
      const host = req.get('host');
      const proto = req.get('x-forwarded-proto') || 'https';

      // For Replit, always use https
      const baseUrl = `https://${host}`;
      const redirectUri = `${baseUrl}/auth/callback`;

      console.log('Callback environment:', {
        host,
        proto,
        baseUrl,
        redirectUri,
        nodeEnv: process.env.NODE_ENV,
        code: code ? 'Present' : 'Missing',
        error: error || 'None'
      });

      // Validate environment variables in callback as well
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('Missing Google OAuth credentials in callback');
        return res.redirect('/?error=missing_credentials');
      }

      // Set redirect URI properly
      const oauth2Client = new OAuth2Client(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        redirectUri
      );

      console.log('Attempting to exchange code for tokens...');
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      console.log('Fetching user info...');
      const userInfo = await oauth2Client.request({
        url: 'https://www.googleapis.com/oauth2/v3/userinfo'
      });

      console.log('User info received:', {
        email: userInfo.data.email,
        name: userInfo.data.name
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
      try {
        const sessionDbId = await storage.createUserSession(sessionData);
        console.log('Session created with ID:', sessionDbId);
        req.session.sessionDbId = sessionDbId;
      } catch (dbError) {
        console.warn('Warning: Could not create database session:', dbError);
        // Continue without database session tracking
      }

      console.log('Redirecting to dashboard...');
      res.redirect('/dashboard');
    } catch (error) {
      console.error('Callback error details:', error);
      res.redirect('/?error=auth_callback_failed');
    }
  });

  app.post('/auth/logout', async (req, res) => {
    try {
      // Check if session exists
      if (!req.session) {
        return res.json({ success: true, message: 'No session to destroy' });
      }

      const sessionDbId = req.session.sessionDbId;

      // Update session end time if we have a tracked session
      if (sessionDbId) {
        try {
          await storage.endUserSession(sessionDbId);
        } catch (dbError) {
          console.warn('Database session cleanup failed:', dbError);
          // Continue with session destruction
        }
      }

      req.session.destroy((err) => {
        if (err) {
          console.error('Logout error:', err);
          return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('sessionId');
        res.json({ success: true });
      });
    } catch (error) {
      console.error('Logout endpoint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Apple Sign In routes
  app.get('/auth/apple', async (req, res) => {
    try {
      const state = crypto.randomBytes(16).toString('hex');
      req.session.state = state;

      // Handle different Replit domains and development URLs
      const host = req.get('host');
      const proto = req.get('x-forwarded-proto') || req.protocol;

      // Always use https for production deployment
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://${host}` 
        : `${proto}://${host}`;

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

      try {
        const sessionDbId = await storage.createUserSession(sessionData);
        req.session.sessionDbId = sessionDbId;
      } catch (dbError) {
        console.warn('Warning: Could not create database session:', dbError);
        // Continue without database session tracking
      }

      res.redirect('/?authenticated=true&provider=apple');
    } catch (error) {
      console.error('Apple callback error:', error);
      res.redirect('/?error=apple_callback_failed');
    }
  });

  app.get('/auth/user', (req, res) => {
    try {
      // Check if session exists
      if (!req.session) {
        return res.status(401).json({ error: 'No session found' });
      }
      
      // Check if user exists in session
      if (req.session.user) {
        res.json(req.session.user);
      } else {
        res.status(401).json({ error: 'Not authenticated' });
      }
    } catch (error) {
      console.error('Auth user endpoint error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Phone/OTP authentication routes
  app.post('/auth/phone/send-otp', async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
      }

      // Validate phone number format (basic validation)
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      if (!phoneRegex.test(phoneNumber)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store OTP in cache with phone number as key
      otpCache.set(phoneNumber, otp);
      
      console.log(`Generated OTP for ${phoneNumber}: ${otp}`);

      // Send OTP via SMS
      if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
        try {
          await twilioClient.messages.create({
            body: `Your BitWallet verification code is: ${otp}. This code will expire in 5 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phoneNumber
          });
          
          res.json({ 
            success: true, 
            message: 'OTP sent successfully',
            // Include OTP in response for development only
            ...(process.env.NODE_ENV === 'development' && { otp })
          });
        } catch (twilioError) {
          console.error('Twilio SMS error:', twilioError);
          // For development, still return success with OTP
          res.json({ 
            success: true, 
            message: 'OTP generated (SMS service unavailable)',
            otp // Always include OTP if SMS fails
          });
        }
      } else {
        // Development mode - return OTP directly
        res.json({ 
          success: true, 
          message: 'OTP generated (development mode)',
          otp 
        });
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  app.post('/auth/phone/verify-otp', async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body;
      
      if (!phoneNumber || !otp) {
        return res.status(400).json({ error: 'Phone number and OTP are required' });
      }

      // Get stored OTP from cache
      const storedOtp = otpCache.get(phoneNumber);
      
      if (!storedOtp) {
        return res.status(400).json({ error: 'OTP expired or invalid' });
      }

      if (storedOtp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // OTP is valid, remove from cache
      otpCache.del(phoneNumber);

      // Create user session
      const phoneUser = {
        id: `phone_${phoneNumber}`,
        phone: phoneNumber,
        name: `User ${phoneNumber.slice(-4)}`,
        provider: 'phone',
        picture: null
      };

      req.session.user = phoneUser;
      req.session.phoneNumber = phoneNumber;
      req.session.isPhoneVerified = true;

      // Track login session
      const sessionData = {
        userId: null,
        email: null,
        name: phoneUser.name,
        phone: phoneNumber,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        sessionId: req.sessionID,
      };

      try {
        const sessionDbId = await storage.createUserSession(sessionData);
        req.session.sessionDbId = sessionDbId;
      } catch (dbError) {
        console.warn('Warning: Could not create database session:', dbError);
        // Continue without database session tracking
      }

      res.json({ 
        success: true, 
        message: 'Phone verified successfully',
        user: phoneUser
      });
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
    }
  });

  // Clear session endpoint for debugging
  app.post('/auth/clear-session', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error clearing session:', err);
        return res.status(500).json({ error: 'Failed to clear session' });
      }
      res.clearCookie('connect.sid'); // Clear the session cookie
      res.json({ success: true, message: 'Session cleared' });
    });
  });

  // Debug endpoint to check OAuth configuration
  app.get('/auth/debug', (req, res) => {
    const host = req.get('host');
    const proto = req.get('x-forwarded-proto') || 'https';
    const baseUrl = `https://${host}`;
    const redirectUri = `${baseUrl}/auth/callback`;

    res.json({
      host,
      proto,
      baseUrl,
      redirectUri,
      nodeEnv: process.env.NODE_ENV,
      hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      googleClientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
      googleClientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
      sessionSecret: process.env.SESSION_SECRET ? 'Set' : 'Missing',
      headers: {
        'x-forwarded-proto': req.get('x-forwarded-proto'),
        'x-forwarded-host': req.get('x-forwarded-host'),
        'host': req.get('host'),
        'user-agent': req.get('user-agent'),
        'referer': req.get('referer')
      },
      url: req.url,
      originalUrl: req.originalUrl,
      protocol: req.protocol,
      secure: req.secure
    });
  });
}