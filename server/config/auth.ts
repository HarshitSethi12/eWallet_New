
import { OAuth2Client } from 'google-auth-library';
import { config } from 'dotenv';

config();

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

export const oauth2Client = new OAuth2Client(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co/auth/callback'
);
