import fs from 'fs';
import path from 'path';

export const getSpotifyAccessToken = async () => {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  console.log('--- SPOTIFY AUTH ATTEMPT ---');
  console.log('ID length:', clientId?.length || 0);
  console.log('Secret length:', clientSecret?.length || 0);

  if (!clientId || !clientSecret) {
    console.error('MISSING CREDENTIALS');
    throw new Error('Spotify API credentials are not set in environment variables.');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store'
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const logMsg = `[${new Date().toISOString()}] SPOTIFY TOKEN ERROR: ${response.status} ${errorBody}\n`;
    fs.appendFileSync('api_log.txt', logMsg);
    console.error('SPOTIFY TOKEN ERROR:', response.status, errorBody);
    throw new Error(`Failed to fetch Spotify access token: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  fs.appendFileSync('api_log.txt', `[${new Date().toISOString()}] TOKEN ACQUIRED\n`);
  console.log('TOKEN ACQUIRED');
  return data.access_token as string;
};

// Generic fetcher using the token
export const fetchSpotify = async (endpoint: string, options?: RequestInit) => {
  const token = await getSpotifyAccessToken();
  const url = `https://api.spotify.com/v1${endpoint}`;
  console.log('Fetching Spotify URL:', url);
  fs.appendFileSync('api_log.txt', `[${new Date().toISOString()}] Fetching: ${url}\n`);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });

  // Not throwing immediately if it fails here depends on your robust handling
  // but throwing simplifies basic implementation for now.
  if (!response.ok) {
    const errorBody = await response.text();
    const logMsg = `[${new Date().toISOString()}] Spotify API error [${response.status}] @ ${endpoint}: ${errorBody}\n`;
    fs.appendFileSync('api_log.txt', logMsg);
    console.error(`Spotify API error [${response.status}]: ${response.statusText} @ ${endpoint}`);
    throw new Error(`Spotify API error: ${response.statusText} - ${errorBody}`);
  }

  return response.json();
};
