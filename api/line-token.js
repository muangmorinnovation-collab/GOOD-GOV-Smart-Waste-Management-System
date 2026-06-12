export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { code, redirect_uri, client_id, client_secret } = req.body;

    if (!code || !redirect_uri || !client_id || !client_secret) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        // 1. Get Access Token
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'authorization_code');
        tokenParams.append('code', code);
        tokenParams.append('redirect_uri', redirect_uri);
        tokenParams.append('client_id', client_id);
        tokenParams.append('client_secret', client_secret);

        const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: tokenParams.toString()
        });

        const tokenData = await tokenRes.json();

        if (tokenData.error) {
            return res.status(400).json({ error: tokenData.error, description: tokenData.error_description });
        }

        if (!tokenData.access_token) {
            return res.status(400).json({ error: 'No access token returned' });
        }

        // 2. Get Profile using Access Token
        const profileRes = await fetch('https://api.line.me/v2/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`
            }
        });

        const profileData = await profileRes.json();

        if (profileData.userId) {
            return res.status(200).json({
                success: true,
                profile: {
                    userId: profileData.userId,
                    displayName: profileData.displayName,
                    pictureUrl: profileData.pictureUrl,
                    email: null
                }
            });
        } else {
            return res.status(400).json({ error: 'Failed to fetch profile' });
        }
    } catch (error) {
        console.error('Error in line-token handler:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
