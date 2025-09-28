#!/usr/bin/env node

import dotenv from 'dotenv';
import { OAuthService } from './oauth.js';

// Load environment variables
dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://127.0.0.1:5555/oauth2callback';
const GOOGLE_SCOPES = [process.env.GOOGLE_SCOPES || 'https://www.googleapis.com/auth/tasks.readonly'];
const SECRETS_DIR = process.env.SECRETS_DIR || './secrets';

async function bootstrap() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error('❌ Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env file');
    console.error('Please create a .env file with your Google OAuth credentials.');
    process.exit(1);
  }

  const oauthService = new OAuthService({
    clientId: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    redirectUri: GOOGLE_REDIRECT_URI,
    scopes: GOOGLE_SCOPES,
    secretsDir: SECRETS_DIR
  });

  try {
    await oauthService.bootstrapAuth();
  } catch (error) {
    console.error('❌ OAuth bootstrap failed:', error);
    process.exit(1);
  }
}

bootstrap();
