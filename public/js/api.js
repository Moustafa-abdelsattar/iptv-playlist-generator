/**
 * API client module - handles all server communication
 */

async function request(endpoint, body) {
  const res = await fetch('/api/' + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error + (err.details ? ': ' + err.details : ''));
  }
  return res.json();
}

export function authenticate(creds) {
  return request('authenticate', creds);
}

export function getLiveCategories(creds) {
  return request('live-categories', creds);
}

export function getVodCategories(creds) {
  return request('vod-categories', creds);
}

export function getSeriesCategories(creds) {
  return request('series-categories', creds);
}

export function generatePlaylists(creds, selectedCategories) {
  return request('generate-playlists', { ...creds, selectedCategories });
}
