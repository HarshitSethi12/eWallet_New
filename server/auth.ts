import express from 'express';
import session from 'express-session';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { storage } from './storage';
import twilio from 'twilio';
import NodeCache from 'node-cache';
import sgMail from '@sendgrid/mail';
import { Resend } from 'resend';
import bcrypt from 'bcryptjs';

declare module 'express-session' {
  interface SessionData {
    user?: any;
    state?: string;
    sessionDbId?: number;
    phoneNumber?: string;
    isPhoneVerified?: boolean;
    email?: string; // Add email to session data
    walletId?: string; // Add walletId to session data
    isEmailVerified?: boolean; // Add isEmailVerified to session data
  }
}

// OTP cache - stores OTP codes for 5 minutes
const otpCache = new NodeCache({ stdTTL: 300 });

// Email verification tokens - stores temporary tokens after OTP verification (5 minutes)
const emailVerificationTokens = new NodeCache({ stdTTL: 300 });

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Initialize Resend (alternative to SendGrid, easier for development)
const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function setupAuth(app: express.Express) {
  // Setup session middleware FIRST
  // Validate session secret exists
  if (!process.env.SESSION_SECRET) {
    throw new Error(
      '🔒 CRITICAL: SESSION_SECRET must be set in Replit Secrets!\n' +
      'Go to Tools → Secrets and add SESSION_SECRET with a secure random string.'
    );
  }

  if (process.env.SESSION_SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long!');
  }

  app.use(session({
    secret: process.env.SESSION_SECRET,
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

  // DIAGNOSTIC: Log ALL POST requests to /auth routes
  app.use('/auth/*', (req, res, next) => {
    if (req.method === 'POST') {
      console.log('🚨🚨🚨 POST REQUEST TO AUTH DETECTED 🚨🚨🚨');
      console.log('Full URL:', req.originalUrl);
      console.log('Path:', req.path);
      console.log('Method:', req.method);
      console.log('Headers:', req.headers);
      console.log('Body:', req.body);
    }
    next();
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

      const userData = userInfo.data as { email: string; name: string; [key: string]: any };
      
      console.log('User info received:', {
        email: userData.email,
        name: userData.name
      });

      req.session.user = userData;

      // Track login session
      const sessionData = {
        userId: null, // We'll need to create/find user first
        email: userData.email,
        name: userData.name,
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

  // Email/OTP authentication routes

  // Email login - retrieve wallet list for selection
  app.post('/auth/email/login', async (req, res, next) => {
    // Set JSON headers at the VERY FIRST LINE before anything else
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');

    // Wrap everything in try-catch to ensure we always return JSON
    try {
      console.log('📧 Email login endpoint hit');
      console.log('📧 Request body:', JSON.stringify(req.body));

      const { email, otp, walletId, verificationToken } = req.body;

      console.log('📧 Email login request:', {
        email: email ? 'provided' : 'missing',
        otp: otp ? 'provided' : 'missing',
        verificationToken: verificationToken ? 'provided' : 'missing',
        walletId: walletId || 'not provided'
      });

      // Validate required fields
      if (!email) {
        console.error('❌ Missing email');
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      // Check if this is a wallet selection (verificationToken provided)
      if (verificationToken && walletId) {
        console.log('🔑 Verifying with token for wallet selection');

        // Verify the token
        const storedEmail = emailVerificationTokens.get(verificationToken);

        if (!storedEmail || storedEmail !== email) {
          console.error('❌ Invalid or expired verification token');
          return res.status(400).json({
            success: false,
            error: 'Verification expired. Please login again.'
          });
        }

        console.log('✅ Verification token valid, proceeding to wallet selection');
        // Continue to wallet selection below (don't return here)
      } else {
        // Initial login - verify OTP
        if (!otp) {
          console.error('❌ Missing OTP');
          return res.status(400).json({
            success: false,
            error: 'OTP is required'
          });
        }

        // Get stored OTP from cache
        const storedOtp = otpCache.get(email);

        if (!storedOtp) {
          console.error('❌ OTP not found or expired for:', email);
          return res.status(400).json({
            success: false,
            error: 'OTP expired or invalid. Please request a new code.'
          });
        }

        if (storedOtp !== otp) {
          console.error('❌ Invalid OTP for:', email);
          return res.status(400).json({
            success: false,
            error: 'Invalid OTP. Please check the code and try again.'
          });
        }

        console.log('✅ OTP verified for:', email);

        // OTP is valid, remove from cache
        otpCache.del(email);
      }

      console.log('🔍 Retrieving wallet for email:', email);

      // Retrieve wallet for this email
      let wallet;
      try {
        wallet = await storage.getEmailWallets(email);
      } catch (storageError) {
        console.error('❌ Error retrieving wallet:', storageError);
        return res.status(500).json({
          success: false,
          error: 'Failed to retrieve wallet. Please try again.',
          details: storageError instanceof Error ? storageError.message : 'Unknown error'
        });
      }

      console.log('📊 Wallet found:', !!wallet);

      if (!wallet) {
        console.warn('⚠️ No wallet found for:', email);
        return res.status(404).json({
          success: false,
          error: 'No wallet found for this email. Please create a new wallet first.',
          shouldCreateWallet: true
        });
      }

      // If walletId is provided, login to that specific wallet
      if (walletId) {
        console.log('🔐 Attempting login to wallet ID:', walletId);

        let walletData;
        try {
          walletData = await storage.getEmailWalletById(email, walletId);
        } catch (walletError) {
          console.error('❌ Error retrieving wallet by ID:', walletError);
          return res.status(500).json({
            success: false,
            error: 'Failed to retrieve wallet. Please try again.',
            details: walletError instanceof Error ? walletError.message : 'Unknown error'
          });
        }

        if (!walletData) {
          console.error('❌ Wallet not found:', walletId);
          return res.status(404).json({
            success: false,
            error: 'Wallet not found'
          });
        }

        // Create user session with selected wallet
        const emailUser = {
          id: `email_${email}_${walletData.id}`,
          email: email,
          name: email.split('@')[0],
          provider: 'email',
          btcAddress: walletData.btcAddress,
          ethAddress: walletData.ethAddress,
          solAddress: walletData.solAddress,
          walletId: walletId,
          picture: null
        };

        // Initialize session if it doesn't exist
        if (!req.session) {
          req.session = {} as any;
        }

        // Save session synchronously
        req.session.user = emailUser;
        req.session.email = email;
        req.session.walletId = walletId;
        req.session.isEmailVerified = true;

        // Wait for session to be saved
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('❌ Session save error:', err);
              reject(err);
            } else {
              console.log('✅ Session saved successfully for:', emailUser.email);
              resolve();
            }
          });
        });

        // Track login session
        const sessionData = {
          userId: null,
          email: email,
          name: emailUser.name,
          walletAddress: walletData.ethAddress || undefined,
          ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          sessionId: req.sessionID,
        };

        try {
          const sessionDbId = await storage.createUserSession(sessionData);
          req.session.sessionDbId = sessionDbId;
          console.log('✅ Database session created:', sessionDbId);
        } catch (dbError) {
          console.warn('⚠️ Warning: Could not create database session:', dbError);
        }

        console.log('✅ Sending login success response');
        return res.status(200).json({
          success: true,
          message: 'Login successful',
          user: emailUser,
          wallet: {
            id: walletData.id,
            btcAddress: walletData.btcAddress,
            ethAddress: walletData.ethAddress,
            solAddress: walletData.solAddress,
            createdAt: walletData.createdAt,
          },
          loginComplete: true
        });
      }

      // If no walletId, return wallet info for user
      console.log('📋 Returning wallet info');

      // Generate a temporary verification token for wallet selection
      const tempVerificationToken = crypto.randomBytes(32).toString('hex');
      emailVerificationTokens.set(tempVerificationToken, email);
      console.log('🔑 Generated verification token for:', email);

      return res.status(200).json({
        success: true,
        message: 'OTP verified - wallet found',
        wallet: wallet,
        verificationToken: tempVerificationToken,
        requiresWalletSelection: true
      });

    } catch (error) {
      console.error('❌ Email login error:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      // Ensure JSON headers are set even in error case
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache');

      // Return JSON error response
      return res.status(500).json({
        success: false,
        error: 'Failed to login. Please try again.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/auth/email/send-otp', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in cache with email as key
      otpCache.set(email, otp);

      console.log(`Generated OTP for ${email}: ${otp}`);

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">BitWallet Verification</h2>
          <p>Your verification code is:</p>
          <h1 style="background: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 8px;">${otp}</h1>
          <p style="color: #666;">This code will expire in 5 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `;

      // Try Resend first (easier for development)
      if (resendClient && process.env.RESEND_FROM_EMAIL) {
        try {
          await resendClient.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: email,
            subject: 'Your BitWallet Verification Code',
            html: emailHtml,
          });

          console.log(`✅ Email sent via Resend to ${email}`);
          return res.json({
            success: true,
            message: 'OTP sent successfully via email',
            ...(process.env.NODE_ENV === 'development' && { otp })
          });
        } catch (emailError) {
          console.error('Resend email error:', emailError);
          // Continue to try SendGrid or fallback
        }
      }

      // Fallback to SendGrid
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
        try {
          await sgMail.send({
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL,
            subject: 'Your BitWallet Verification Code',
            text: `Your verification code is: ${otp}. This code will expire in 5 minutes.`,
            html: emailHtml
          });

          console.log(`✅ Email sent via SendGrid to ${email}`);
          return res.json({
            success: true,
            message: 'OTP sent successfully via email',
            ...(process.env.NODE_ENV === 'development' && { otp })
          });
        } catch (emailError) {
          console.error('SendGrid email error:', emailError);
          // Continue to development fallback
        }
      }

      // Development mode fallback - return OTP directly
      console.log(`⚠️ No email service configured - returning OTP in response`);
      res.json({
        success: true,
        message: 'OTP generated (development mode - check console)',
        otp
      });
    } catch (error) {
      console.error('Send email OTP error:', error);
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  });

  app.post('/auth/email/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({ error: 'Email and OTP are required' });
      }

      // Get stored OTP from cache
      const storedOtp = otpCache.get(email);

      if (!storedOtp) {
        return res.status(400).json({ error: 'OTP expired or invalid' });
      }

      if (storedOtp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP' });
      }

      // OTP is valid, remove from cache
      otpCache.del(email);

      // Self-custodial: Wallet will be created on client-side
      // Server only tracks email and wallet address
      // Note: Wallet address will be sent from client after generation
      let user = { email, walletAddress: undefined, id: 0, createdAt: null, lastLogin: null };

      // Ensure we check if a wallet exists for this email. If not, we guide the user to create one on the client.
      // If a wallet *does* exist, we might want to associate it with the session.
      // For now, we'll assume the client will handle wallet creation and association.

      // Update session to mark email as verified and store basic user info
      req.session.user = user;
      req.session.email = email;
      req.session.isEmailVerified = true;
      req.session.walletId = undefined; // No wallet ID associated server-side initially

      // Save session explicitly
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('❌ Session save error after OTP verification:', err);
            reject(err);
          } else {
            console.log('✅ Session saved successfully after OTP verification for:', email);
            resolve();
          }
        });
      });

      // Track login session (without wallet details initially)
      const sessionData = {
        userId: null,
        email: email,
        name: email.split('@')[0],
        walletAddress: undefined, // Wallet address is not yet known server-side
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        sessionId: req.sessionID,
      };

      try {
        const sessionDbId = await storage.createUserSession(sessionData);
        req.session.sessionDbId = sessionDbId;
        console.log('✅ Database session created:', sessionDbId);
      } catch (dbError) {
        console.warn('⚠️ Warning: Could not create database session:', dbError);
      }

      res.json({
        success: true,
        message: 'Email verified. Please proceed to create or connect your wallet on the client.',
        user: user,
        requiresWalletCreationOrConnection: true // Flag for the client
      });
    } catch (error) {
      console.error('Verify email OTP error:', error);
      res.status(500).json({ error: 'Failed to verify OTP' });
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
      res.clearCookie('sessionId');
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

  // Development-only endpoint to check and cleanup email wallets
  app.post('/auth/email/cleanup', async (req, res) => {
    try {
      // Only allow in development
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Not available in production' });
      }

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Get count of existing wallets
      const count = await storage.getEmailWalletCount(email);

      if (count === 0) {
        return res.json({
          success: true,
          message: 'No wallets found for this email',
          deletedCount: 0
        });
      }

      // Delete all wallets for this email
      const deletedCount = await storage.deleteEmailWallets(email);

      res.json({
        success: true,
        message: `Deleted ${deletedCount} wallet(s) for ${email}`,
        deletedCount
      });
    } catch (error) {
      console.error('Cleanup error:', error);
      res.status(500).json({ error: 'Failed to cleanup wallets' });
    }
  });

  // Development-only endpoint to check wallet count for an email
  app.post('/auth/email/check-count', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const count = await storage.getEmailWalletCount(email);

      res.json({
        success: true,
        email,
        walletCount: count
      });
    } catch (error) {
      console.error('Check count error:', error);
      res.status(500).json({ error: 'Failed to check wallet count' });
    }
  });

  // Admin endpoint to delete any wallet by ID (bypasses all restrictions)
  app.delete('/auth/admin/delete-wallet/:walletId', async (req, res) => {
    try {
      // Only allow in development or with admin authentication
      if (process.env.NODE_ENV === 'production') {
        // In production, you should add proper admin authentication here
        // For now, we'll restrict it to development only
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { walletId } = req.params;

      if (!walletId) {
        return res.status(400).json({ error: 'Wallet ID is required' });
      }

      const walletIdNum = parseInt(walletId, 10);

      if (isNaN(walletIdNum)) {
        return res.status(400).json({ error: 'Invalid wallet ID' });
      }

      // Get wallet info before deletion
      const { db } = await import('./db');
      const { emailWallets } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      const wallets = await db.select()
        .from(emailWallets)
        .where(eq(emailWallets.id, walletIdNum));

      if (wallets.length === 0) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      const wallet = wallets[0];

      // Delete the wallet directly from database (bypassing storage restrictions)
      const result = await db.delete(emailWallets)
        .where(eq(emailWallets.id, walletIdNum))
        .returning({ id: emailWallets.id });

      if (result.length > 0) {
        console.log('✅ Admin deleted wallet:', walletIdNum, 'for email:', wallet.email);
        return res.json({
          success: true,
          message: 'Wallet deleted successfully',
          deletedWallet: {
            id: wallet.id,
            email: wallet.email,
            btcAddress: wallet.btcAddress,
            ethAddress: wallet.ethAddress,
            solAddress: wallet.solAddress,
          }
        });
      }

      return res.status(500).json({ error: 'Failed to delete wallet' });
    } catch (error) {
      console.error('Admin delete wallet error:', error);
      res.status(500).json({ error: 'Failed to delete wallet' });
    }
  });

  // Get all wallets for current user's email
  app.get('/auth/email/wallets', async (req, res) => {
    try {
      if (!req.session?.user?.email) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const email = req.session.user.email;
      const wallet = await storage.getEmailWallets(email);

      if (!wallet) {
        return res.json([]);
      }

      // Return wallet as array for backwards compatibility
      res.json([wallet]);
    } catch (error) {
      console.error('Get wallets error:', error);
      res.status(500).json({ error: 'Failed to get wallets' });
    }
  });

  // Switch to a different wallet
  app.post('/auth/email/switch-wallet', async (req, res) => {
    try {
      const { walletId } = req.body;

      if (!req.session?.user?.email) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (!walletId) {
        return res.status(400).json({ error: 'Wallet ID is required' });
      }

      const email = req.session.user.email;
      const walletData = await storage.getEmailWalletById(email, walletId);

      if (!walletData) {
        return res.status(404).json({ error: 'Wallet not found' });
      }

      // Update session with new wallet
      req.session.user.btcAddress = walletData.btcAddress;
      req.session.user.ethAddress = walletData.ethAddress;
      req.session.user.solAddress = walletData.solAddress;
      req.session.user.walletId = walletId;
      req.session.walletId = walletId;

      // Update the session's user object to reflect the new wallet addresses
      req.session.user = {
        ...req.session.user,
        btcAddress: walletData.btcAddress,
        ethAddress: walletData.ethAddress,
        solAddress: walletData.solAddress,
        walletId: walletId
      };

      // Save the session to persist these changes
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('❌ Session save error during wallet switch:', err);
            reject(err);
          } else {
            console.log('✅ Session saved successfully after wallet switch for:', email);
            resolve();
          }
        });
      });

      res.json({
        success: true,
        message: 'Wallet switched successfully',
        wallet: {
          id: walletData.id,
          btcAddress: walletData.btcAddress,
          ethAddress: walletData.ethAddress,
          solAddress: walletData.solAddress,
          createdAt: walletData.createdAt,
        }
      });
    } catch (error) {
      console.error('Switch wallet error:', error);
      res.status(500).json({ error: 'Failed to switch wallet' });
    }
  });

  // Delete a specific wallet
  app.delete('/auth/email/delete-wallet/:walletId', async (req, res) => {
    try {
      const { walletId } = req.params;

      if (!req.session?.user?.email) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (!walletId) {
        return res.status(400).json({ error: 'Wallet ID is required' });
      }

      const email = req.session.user.email;
      const walletIdNum = parseInt(walletId, 10);

      // Check if user has more than one wallet
      const walletCount = await storage.getEmailWalletCount(email);

      if (walletCount <= 1) {
        return res.status(400).json({ error: 'Cannot delete your only wallet. You must have at least one wallet.' });
      }

      // Check if trying to delete the currently active wallet
      if (req.session.user.walletId === walletIdNum) {
        return res.status(400).json({ error: 'Cannot delete the currently active wallet. Please switch to a different wallet first.' });
      }

      // Delete the wallet
      const deleted = await storage.deleteEmailWalletById(email, walletIdNum);

      if (!deleted) {
        return res.status(404).json({ error: 'Wallet not found or you do not have permission to delete it' });
      }

      res.json({
        success: true,
        message: 'Wallet deleted successfully'
      });
    } catch (error) {
      console.error('Delete wallet error:', error);
      res.status(500).json({ error: 'Failed to delete wallet' });
    }
  });

  // ===== PASSWORD-BASED AUTHENTICATION (SELF-CUSTODIAL) =====
  
  /**
   * Create a new self-custodial wallet with password authentication
   * Client generates wallet locally and sends ONLY: email, passwordHash, salt, public address, chain
   * CRITICAL: Private keys NEVER sent to server!
   */
  app.post('/api/auth/email/create-wallet', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('🔐 Self-custodial wallet creation request received');
      
      const { email, passwordHash, salt, walletAddress, chain } = req.body;
      
      // Validate required fields
      if (!email || !passwordHash || !salt || !walletAddress || !chain) {
        console.error('❌ Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }
      
      // Validate email format
      if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
      
      // Validate chain
      if (!['ETH', 'BTC', 'SOL'].includes(chain)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid blockchain. Must be ETH, BTC, or SOL'
        });
      }
      
      // Check if wallet already exists for this email
      const canonicalEmail = email.toLowerCase().trim();
      const existingWallet = await storage.getEmailWalletByEmail(canonicalEmail);
      
      if (existingWallet) {
        return res.status(400).json({
          success: false,
          message: `You already have a wallet. Try logging in instead.`
        });
      }
      
      // Create multi-chain wallet in database (only stores public data + password hash)
      // Map chain-specific address to the correct field
      const walletData: any = {
        email: canonicalEmail,
        passwordHash,
        salt,
        btcAddress: '',
        ethAddress: '',
        solAddress: ''
      };
      
      // Set the appropriate address based on chain
      if (chain === 'BTC') {
        walletData.btcAddress = walletAddress;
      } else if (chain === 'ETH') {
        walletData.ethAddress = walletAddress;
      } else if (chain === 'SOL') {
        walletData.solAddress = walletAddress;
      }
      
      const result = await storage.createEmailWallet(walletData);
      
      // Create session for the user
      req.session.user = {
        id: `email_${result.wallet.id}`,
        sub: `email_${result.wallet.id}`,
        email: canonicalEmail,
        btcAddress: result.wallet.btcAddress,
        ethAddress: result.wallet.ethAddress,
        solAddress: result.wallet.solAddress,
        walletId: result.wallet.id,
        provider: 'email',
        name: canonicalEmail.split('@')[0],
        picture: null
      };
      
      // Save session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('❌ Session save error:', err);
            reject(err);
          } else {
            console.log('✅ Session saved for new wallet:', canonicalEmail);
            resolve();
          }
        });
      });
      
      console.log('✅ Self-custodial wallet created successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Wallet created successfully',
        wallet: {
          id: result.wallet.id,
          email: result.wallet.email,
          btcAddress: result.wallet.btcAddress,
          ethAddress: result.wallet.ethAddress,
          solAddress: result.wallet.solAddress
        }
      });
      
    } catch (error: any) {
      console.error('❌ Wallet creation error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to create wallet'
      });
    }
  });
  
  /**
   * Get all wallets for an email (multi-chain support)
   * Returns list of all chain wallets associated with this email
   */
  app.post('/api/auth/email/get-wallets', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }
      
      const canonicalEmail = email.toLowerCase().trim();
      const wallet = await storage.getEmailWalletByEmail(canonicalEmail);
      
      if (!wallet) {
        return res.status(200).json({
          success: true,
          wallets: [],
          hasWallets: false
        });
      }
      
      // Return only non-sensitive data for all chains
      const walletsData = [];
      if (wallet.btcAddress) {
        walletsData.push({
          id: wallet.id,
          chain: 'BTC',
          walletAddress: wallet.btcAddress,
          createdAt: wallet.createdAt
        });
      }
      if (wallet.ethAddress) {
        walletsData.push({
          id: wallet.id,
          chain: 'ETH',
          walletAddress: wallet.ethAddress,
          createdAt: wallet.createdAt
        });
      }
      if (wallet.solAddress) {
        walletsData.push({
          id: wallet.id,
          chain: 'SOL',
          walletAddress: wallet.solAddress,
          createdAt: wallet.createdAt
        });
      }
      
      return res.status(200).json({
        success: true,
        wallets: walletsData,
        hasWallets: walletsData.length > 0
      });
      
    } catch (error: any) {
      console.error('❌ Get wallets error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get wallets'
      });
    }
  });

  /**
   * Login with email, password, and chain selection (self-custodial)
   * Verifies password hash and returns salt so client can re-derive wallet for selected chain
   */
  app.post('/api/auth/email/login', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('🔐 Password-based login request received');
      
      const { email, password, chain } = req.body;
      
      // Validate required fields
      if (!email || !password || !chain) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, and chain are required'
        });
      }
      
      // Validate chain
      if (!['ETH', 'BTC', 'SOL'].includes(chain)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid blockchain. Must be ETH, BTC, or SOL'
        });
      }
      
      // Get wallet by email
      const canonicalEmail = email.toLowerCase().trim();
      const wallet = await storage.getEmailWalletByEmail(canonicalEmail);
      
      if (!wallet) {
        return res.status(401).json({
          success: false,
          message: `No wallet found for this email. Please create one first.`
        });
      }
      
      // Check if the specific chain address exists
      let chainAddress = '';
      if (chain === 'BTC' && wallet.btcAddress) {
        chainAddress = wallet.btcAddress;
      } else if (chain === 'ETH' && wallet.ethAddress) {
        chainAddress = wallet.ethAddress;
      } else if (chain === 'SOL' && wallet.solAddress) {
        chainAddress = wallet.solAddress;
      } else {
        return res.status(401).json({
          success: false,
          message: `No ${chain} address found for this wallet. Please register a ${chain} wallet first.`
        });
      }
      
      // Verify password using bcrypt
      const passwordMatch = await bcrypt.compare(password, wallet.passwordHash);
      
      if (!passwordMatch) {
        console.log('❌ Password mismatch for:', canonicalEmail, chain);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Create session
      req.session.user = {
        id: `email_${wallet.id}`,
        sub: `email_${wallet.id}`,
        email: wallet.email,
        btcAddress: wallet.btcAddress,
        ethAddress: wallet.ethAddress,
        solAddress: wallet.solAddress,
        walletId: wallet.id,
        provider: 'email',
        name: wallet.email.split('@')[0],
        picture: null
      };
      
      // Save session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('❌ Session save error:', err);
            reject(err);
          } else {
            console.log('✅ Session saved for login:', canonicalEmail, chain);
            resolve();
          }
        });
      });
      
      console.log('✅ Login successful for:', canonicalEmail, chain);
      
      // Return salt and chain address so client can re-derive wallet
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        salt: wallet.salt,
        chain: chain,
        walletAddress: chainAddress,
        btcAddress: wallet.btcAddress,
        ethAddress: wallet.ethAddress,
        solAddress: wallet.solAddress
      });
      
    } catch (error: any) {
      console.error('❌ Login error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  });

  // ===== MULTI-CHAIN EMAIL WALLET ROUTES (NEW ARCHITECTURE) =====
  
  /**
   * POST /auth/email-wallet/register
   * Register a new multi-chain wallet (BTC, ETH, SOL)
   * Client generates all wallets using deriveMultiChainWallet and sends all 3 addresses
   * Server stores ONLY: email, passwordHash, salt, and all 3 public addresses
   */
  app.post('/auth/email-wallet/register', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('🔐 Multi-chain wallet registration request received');
      
      const { email, passwordHash, salt, btcAddress, ethAddress, solAddress } = req.body;
      
      // Validate required fields
      if (!email || !passwordHash || !salt || !btcAddress || !ethAddress || !solAddress) {
        console.error('❌ Missing required fields');
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: email, passwordHash, salt, btcAddress, ethAddress, solAddress'
        });
      }
      
      // Validate email format
      if (!/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
      
      // Check if wallet already exists for this email
      const canonicalEmail = email.toLowerCase().trim();
      const existingWallet = await storage.getEmailWalletByEmail(canonicalEmail);
      
      if (existingWallet) {
        return res.status(400).json({
          success: false,
          message: 'A wallet already exists for this email. Please login instead.'
        });
      }
      
      // Create multi-chain wallet in database
      const result = await storage.createEmailWallet({
        email: canonicalEmail,
        passwordHash,
        salt,
        btcAddress,
        ethAddress,
        solAddress
      });
      
      // Create session for the user
      req.session.user = {
        id: `email_${result.wallet.id}`,
        sub: `email_${result.wallet.id}`,
        email: canonicalEmail,
        btcAddress: result.wallet.btcAddress,
        ethAddress: result.wallet.ethAddress,
        solAddress: result.wallet.solAddress,
        walletId: result.wallet.id,
        provider: 'email',
        name: canonicalEmail.split('@')[0],
        picture: null
      };
      
      // Save session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('❌ Session save error:', err);
            reject(err);
          } else {
            console.log('✅ Session saved for new multi-chain wallet:', canonicalEmail);
            resolve();
          }
        });
      });
      
      console.log('✅ Multi-chain wallet registered successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Multi-chain wallet registered successfully',
        wallet: {
          id: result.wallet.id,
          email: result.wallet.email,
          btcAddress: result.wallet.btcAddress,
          ethAddress: result.wallet.ethAddress,
          solAddress: result.wallet.solAddress,
          createdAt: result.wallet.createdAt
        }
      });
      
    } catch (error: any) {
      console.error('❌ Multi-chain wallet registration error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to register wallet'
      });
    }
  });
  
  /**
   * POST /auth/email-wallet/login
   * Login with email + password (no chain parameter needed)
   * Returns salt and all 3 addresses so client can re-derive wallets
   */
  app.post('/auth/email-wallet/login', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      console.log('🔐 Multi-chain wallet login request received');
      
      const { email, password } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      
      // Get wallet by email (returns all 3 chain addresses)
      const canonicalEmail = email.toLowerCase().trim();
      const wallet = await storage.getEmailWalletByEmail(canonicalEmail);
      
      if (!wallet) {
        return res.status(401).json({
          success: false,
          message: 'No wallet found for this email. Please register first.'
        });
      }
      
      // Verify password using bcrypt
      const passwordMatch = await bcrypt.compare(password, wallet.passwordHash);
      
      if (!passwordMatch) {
        console.log('❌ Password mismatch for:', canonicalEmail);
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      
      // Create session with all 3 addresses
      req.session.user = {
        id: `email_${wallet.id}`,
        sub: `email_${wallet.id}`,
        email: wallet.email,
        btcAddress: wallet.btcAddress,
        ethAddress: wallet.ethAddress,
        solAddress: wallet.solAddress,
        walletId: wallet.id,
        provider: 'email',
        name: wallet.email.split('@')[0],
        picture: null
      };
      
      // Save session
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('❌ Session save error:', err);
            reject(err);
          } else {
            console.log('✅ Session saved for multi-chain login:', canonicalEmail);
            resolve();
          }
        });
      });
      
      console.log('✅ Multi-chain login successful for:', canonicalEmail);
      
      // Return salt and all addresses so client can re-derive wallets
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        salt: wallet.salt,
        btcAddress: wallet.btcAddress,
        ethAddress: wallet.ethAddress,
        solAddress: wallet.solAddress
      });
      
    } catch (error: any) {
      console.error('❌ Multi-chain login error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  });
  
  /**
   * GET /auth/email-wallet/check
   * Check if email has a wallet and return all 3 addresses
   * Can be used before login/register to check wallet existence
   */
  app.get('/auth/email-wallet/check', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email parameter is required'
        });
      }
      
      const canonicalEmail = email.toLowerCase().trim();
      const wallet = await storage.getEmailWalletByEmail(canonicalEmail);
      
      if (!wallet) {
        return res.status(200).json({
          success: true,
          hasWallet: false,
          message: 'No wallet found for this email'
        });
      }
      
      // Return all 3 addresses (no chain field needed)
      return res.status(200).json({
        success: true,
        hasWallet: true,
        wallet: {
          email: wallet.email,
          btcAddress: wallet.btcAddress,
          ethAddress: wallet.ethAddress,
          solAddress: wallet.solAddress,
          createdAt: wallet.createdAt
        }
      });
      
    } catch (error: any) {
      console.error('❌ Check wallet error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to check wallet'
      });
    }
  });
}

// Create and export the auth router
export const authRouter = express.Router();

// Add MetaMask authentication route to the auth router
authRouter.post('/metamask', async (req, res) => {
  // Ensure we always respond with JSON, even on unexpected errors
  const sendJsonError = (statusCode: number, message: string, details?: string) => {
    res.setHeader('Content-Type', 'application/json');
    return res.status(statusCode).json({
      success: false,
      error: message,
      details: details || undefined
    });
  };

  try {
    // Set JSON headers explicitly and early
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');

    console.log('🦊 MetaMask authentication request received');
    console.log('🦊 Request body keys:', Object.keys(req.body || {}));
    console.log('🦊 Content-Type:', req.get('Content-Type'));

    // Validate request body exists
    if (!req.body) {
      console.error('❌ No request body received');
      return sendJsonError(400, 'Request body is required');
    }

    const { message, signature, address } = req.body;

    // Validate required fields
    if (!message || !signature || !address) {
      console.error('❌ Missing required fields:', {
        message: !!message,
        signature: !!signature,
        address: !!address
      });
      return sendJsonError(400, 'Missing required fields: message, signature, and address are required');
    }

    // Validate address format (basic check)
    if (!address.startsWith('0x') || address.length !== 42) {
      console.error('❌ Invalid address format:', address);
      return sendJsonError(400, 'Invalid Ethereum address format');
    }

    console.log('🦊 MetaMask authentication data validated:', {
      address: address,
      messageLength: message.length,
      signatureLength: signature.length
    });

    // Ensure session exists and initialize if needed
    if (!req.session) {
      console.error('❌ No session middleware available');
      return sendJsonError(500, 'Session middleware not available');
    }

    // Initialize session user if it doesn't exist
    if (req.session.user === undefined) {
      req.session.user = null;
    }

    // Create user object for session
    const metamaskUser = {
      id: `metamask_${address}`,
      sub: `metamask_${address}`, // Add sub for compatibility
      address: address,
      walletAddress: address,
      name: `${address.slice(0, 6)}...${address.slice(-4)}`,
      provider: 'metamask',
      picture: null,
      email: null
    };

    // Store user in session
    req.session.user = metamaskUser;
    req.session.walletId = address; // Store the wallet address as walletId for consistency
    req.session.isEmailVerified = true; // Assume verified for wallet login

    // Save session explicitly to ensure it's persisted
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('❌ Session save error:', err);
          reject(err);
        } else {
          console.log('✅ Session saved successfully');
          resolve(true);
        }
      });
    });

    console.log('✅ MetaMask user authenticated successfully:', metamaskUser.name);

    // Track login session if storage is available
    try {
      const { storage } = await import('./storage');
      const sessionData = {
        userId: null,
        email: null,
        name: metamaskUser.name,
        walletAddress: address,
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
        sessionId: req.sessionID,
      };

      const sessionDbId = await storage.createUserSession(sessionData);
      req.session.sessionDbId = sessionDbId;
      console.log('📊 Session tracking created:', sessionDbId);
    } catch (dbError) {
      console.warn('⚠️ Warning: Could not create database session:', dbError);
      // Continue without database session tracking
    }

    // Return success response with user data
    const responseData = {
      success: true,
      message: 'MetaMask authentication successful',
      user: metamaskUser
    };

    console.log('🦊 Sending response:', responseData);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ MetaMask authentication error:', error);

    // Ensure we always return JSON even on unexpected errors
    return sendJsonError(500, 'MetaMask authentication failed');
  }
});