import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// ==========================================
// LINE LOGIN - CODE TO TOKEN EXCHANGE
// ==========================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code, redirect_uri, client_id } = await req.json()

    if (!code || !redirect_uri) {
      throw new Error("Missing 'code' or 'redirect_uri'")
    }

    // Retrieve environment variables configured in Supabase
    // You MUST set these via:
    // supabase secrets set LINE_CHANNEL_ID=your_id LINE_CHANNEL_SECRET=your_secret
    const LINE_CHANNEL_ID = client_id || Deno.env.get('LINE_CHANNEL_ID') || '2009933819'; // Use frontend client_id if provided
    const LINE_CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET');

    if (!LINE_CHANNEL_SECRET) {
      throw new Error("LINE_CHANNEL_SECRET is not set in environment variables.")
    }

    console.log(`Exchanging code for token... Channel ID: ${LINE_CHANNEL_ID}`);

    // 1. Exchange authorization code for access token
    const tokenParams = new URLSearchParams()
    tokenParams.append('grant_type', 'authorization_code')
    tokenParams.append('code', code)
    tokenParams.append('redirect_uri', redirect_uri)
    tokenParams.append('client_id', LINE_CHANNEL_ID)
    tokenParams.append('client_secret', LINE_CHANNEL_SECRET)

    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams.toString(),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Token Error:', tokenData)
      throw new Error(`Failed to get LINE token: ${tokenData.error_description || tokenData.error}`)
    }

    // 2. Use access token to fetch the user's LINE profile
    const profileResponse = await fetch('https://api.line.me/v2/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    const profileData = await profileResponse.json()

    if (profileData.message) {
      console.error('Profile Error:', profileData)
      throw new Error(`Failed to get LINE profile: ${profileData.message}`)
    }

    // 3. Construct the profile response expected by the frontend
    const profile = {
      userId: profileData.userId,
      displayName: profileData.displayName,
      pictureUrl: profileData.pictureUrl,
      email: null
    }

    // 4. (Optional) Extract email if openid/email scope was requested and id_token is returned
    if (tokenData.id_token) {
        try {
            const base64Url = tokenData.id_token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);
            if (decoded.email) profile.email = decoded.email;
        } catch (e) {
            console.error("Error decoding ID token for email", e);
        }
    }

    return new Response(
      JSON.stringify({ profile }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error("Edge Function Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
