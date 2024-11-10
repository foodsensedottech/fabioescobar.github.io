import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable CORS
app.use(cors());

// Serve static files from current directory
app.use(express.static(__dirname));

// LinkedIn OAuth Configuration
const CLIENT_ID = '78chylo0ggdgko';
const CLIENT_SECRET = 'WPL_AP1.9Ihxf2QA7uGytmip.CLP+cw==';
const REDIRECT_URI = 'http://localhost:3001/callback';

// Store state for verification
let authState = '';

// Add login endpoint
app.get('/auth/linkedin', (req, res) => {
    // Generate a random state value
    authState = Math.random().toString(36).substring(7);
    
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code` +
        `&client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&state=${authState}` +
        `&scope=openid%20profile%20w_member_social`;
    
    console.log('Auth URL:', authUrl);
    res.redirect(authUrl);
});

// Add callback endpoint
app.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;
    
    console.log('Callback received:', {
        code: code ? 'present' : 'missing',
        state,
        error,
        expectedState: authState
    });

    if (error) {
        console.error('OAuth error:', error);
        return res.status(500).send(`Authentication error: ${error}`);
    }

    if (!code) {
        console.error('No code received');
        return res.status(400).send('No code received');
    }

    if (state !== authState) {
        console.error('State mismatch:', { received: state, expected: authState });
        return res.status(400).send('State validation failed');
    }

    try {
        console.log('Exchanging code for token...');
        const tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
        });

        console.log('Token request:', {
            url: tokenUrl,
            params: params.toString()
        });

        const tokenResponse = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString()
        });

        console.log('Token response status:', tokenResponse.status);
        const tokenData = await tokenResponse.json();
        console.log('Token data:', tokenData);

        if (tokenData.error) {
            throw new Error(`Token Error: ${tokenData.error_description || tokenData.error}`);
        }

        // Send token back to client
        res.send(`
            <html>
                <body>
                    <script>
                        window.opener.postMessage({ 
                            token: '${tokenData.access_token}',
                            error: null 
                        }, '*');
                        window.close();
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Token Exchange Error:', error);
        res.send(`
            <html>
                <body>
                    <script>
                        window.opener.postMessage({ 
                            token: null,
                            error: '${error.message}'
                        }, '*');
                        window.close();
                    </script>
                </body>
            </html>
        `);
    }
});

// Update the profile endpoint to use OpenID data
app.get('/api/linkedin/me', async (req, res) => {
    const accessToken = req.headers.authorization?.split(' ')[1];
    
    if (!accessToken) {
        return res.status(401).json({ error: 'No access token provided' });
    }

    try {
        // Use the userinfo endpoint for OpenID
        const profileResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!profileResponse.ok) {
            const errorData = await profileResponse.json();
            throw new Error(errorData.message || 'Profile request failed');
        }

        const profile = await profileResponse.json();
        console.log('Profile data:', profile);
        res.json(profile);
    } catch (error) {
        console.error('Profile Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Auth callback URL: ${REDIRECT_URI}`);
});