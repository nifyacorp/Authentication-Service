import { config } from 'dotenv';
import crypto from 'crypto';

config();

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
export const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// State token configuration
export const STATE_TOKEN_BYTES = 32; // 256 bits
export const STATE_TOKEN_EXPIRY = 10 * 60 * 1000; // 10 minutes in milliseconds

interface StateData {
  timestamp: number;
  nonce: string;
}

// In-memory state store (replace with Redis in production)
const stateStore = new Map<string, StateData>();

// Clean up expired states periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (now - data.timestamp > STATE_TOKEN_EXPIRY) {
      stateStore.delete(state);
    }
  }
}, 60 * 1000); // Clean up every minute

export function generateStateToken(): { state: string, nonce: string } {
  // Generate random state token
  const stateToken = crypto.randomBytes(STATE_TOKEN_BYTES).toString('hex');
  
  // Generate nonce for additional security
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Store state data
  stateStore.set(stateToken, {
    timestamp: Date.now(),
    nonce
  });
  
  return { state: stateToken, nonce };
}

export function validateStateToken(state: string, nonce?: string): boolean {
  const stateData = stateStore.get(state);
  
  if (!stateData) {
    return false;
  }
  
  // Check expiration
  if (Date.now() - stateData.timestamp > STATE_TOKEN_EXPIRY) {
    stateStore.delete(state);
    return false;
  }
  
  // If nonce is provided, verify it matches
  if (nonce && nonce !== stateData.nonce) {
    return false;
  }
  
  // Clean up used state
  stateStore.delete(state);
  
  return true;
}