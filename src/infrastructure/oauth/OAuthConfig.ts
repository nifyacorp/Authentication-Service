/**
 * OAuth configuration
 */
export interface OAuthConfig {
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
}

/**
 * Get OAuth configuration from environment variables
 */
export function getOAuthConfig(): OAuthConfig {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI,
    APP_URL = 'http://localhost:3000'
  } = process.env;

  // Default redirect URI based on APP_URL if not specified
  const defaultRedirectUri = `${APP_URL}/auth/google/callback`;

  return {
    google: {
      clientId: GOOGLE_CLIENT_ID || '',
      clientSecret: GOOGLE_CLIENT_SECRET || '',
      redirectUri: GOOGLE_REDIRECT_URI || defaultRedirectUri
    }
  };
}