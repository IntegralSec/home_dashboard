import { google } from 'googleapis';
import fs from 'fs-extra';
import path from 'path';
import { Server } from 'http';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  secretsDir: string;
}

export class OAuthService {
  private config: OAuthConfig;
  private tokenPath: string;

  constructor(config: OAuthConfig) {
    this.config = config;
    this.tokenPath = path.join(config.secretsDir, 'token.json');
  }

  async ensureSecretsDir(): Promise<void> {
    await fs.ensureDir(this.config.secretsDir);
    // Set permissions to 700 (owner only)
    await fs.chmod(this.config.secretsDir, 0o700);
  }

  async loadTokens(): Promise<any> {
    try {
      await this.ensureSecretsDir();
      const tokens = await fs.readJson(this.tokenPath);
      return tokens;
    } catch (error) {
      console.log('No existing tokens found');
      return null;
    }
  }

  async saveTokens(tokens: any): Promise<void> {
    await this.ensureSecretsDir();
    await fs.writeJson(this.tokenPath, tokens);
    // Set permissions to 600 (owner read/write only)
    await fs.chmod(this.tokenPath, 0o600);
  }

  getAuthClient(): any {
    const oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );

    return oauth2Client;
  }

  getAuthUrl(): string {
    const oauth2Client = this.getAuthClient();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
    });
  }

  async bootstrapAuth(): Promise<void> {
    console.log('Starting OAuth bootstrap process...');
    
    const authUrl = this.getAuthUrl();
    console.log('\n=== OAUTH BOOTSTRAP ===');
    console.log('1. Open this URL in your browser:');
    console.log(authUrl);
    console.log('\n2. Complete the authorization process');
    console.log('3. Copy the authorization code from the callback URL');
    console.log('\nWaiting for authorization code...');
    
    // Start a temporary server to capture the callback
    const server = new Server();
    const port = 5555;
    
    return new Promise((resolve, reject) => {
      server.listen(port, '127.0.0.1', () => {
        console.log(`\nCallback server listening on http://127.0.0.1:${port}/oauth2callback`);
      });

      server.on('request', async (req, res) => {
        if (req.url?.startsWith('/oauth2callback')) {
          const url = new URL(req.url, `http://127.0.0.1:${port}`);
          const code = url.searchParams.get('code');
          const error = url.searchParams.get('error');

          res.writeHead(200, { 'Content-Type': 'text/html' });
          
          if (error) {
            res.end(`
              <html>
                <body>
                  <h1>Authorization Error</h1>
                  <p>Error: ${error}</p>
                  <p>Please try again.</p>
                </body>
              </html>
            `);
            server.close();
            reject(new Error(`OAuth error: ${error}`));
            return;
          }

          if (!code) {
            res.end(`
              <html>
                <body>
                  <h1>No Authorization Code</h1>
                  <p>No authorization code received. Please try again.</p>
                </body>
              </html>
            `);
            server.close();
            reject(new Error('No authorization code received'));
            return;
          }

          try {
            console.log('\nAuthorization code received, exchanging for tokens...');
            const oauth2Client = this.getAuthClient();
            const { tokens } = await oauth2Client.getToken(code);
            
            await this.saveTokens(tokens);
            console.log('✅ Tokens saved successfully!');
            console.log('You can now start the server with: npm start');
            
            res.end(`
              <html>
                <body>
                  <h1>✅ Authorization Successful!</h1>
                  <p>Tokens have been saved. You can now close this window and start the server.</p>
                </body>
              </html>
            `);
            
            server.close();
            resolve();
          } catch (error) {
            console.error('Error exchanging code for tokens:', error);
            res.end(`
              <html>
                <body>
                  <h1>Token Exchange Error</h1>
                  <p>Error: ${error}</p>
                  <p>Please try again.</p>
                </body>
              </html>
            `);
            server.close();
            reject(error);
          }
        }
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('OAuth bootstrap timeout - please try again'));
      }, 5 * 60 * 1000);
    });
  }

  async getAuthenticatedClient(): Promise<any> {
    const tokens = await this.loadTokens();
    if (!tokens) {
      throw new Error('No tokens found. Run "npm run oauth" to bootstrap authentication.');
    }

    const oauth2Client = this.getAuthClient();
    oauth2Client.setCredentials(tokens);

    // Refresh token if needed
    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      console.log('Access token expired, refreshing...');
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        await this.saveTokens(credentials);
      } catch (error) {
        console.error('Error refreshing token:', error);
        throw new Error('Failed to refresh access token. Please re-run "npm run oauth"');
      }
    }

    return oauth2Client;
  }
}
