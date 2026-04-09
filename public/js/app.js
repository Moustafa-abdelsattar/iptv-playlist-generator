/**
 * Main application module - orchestrates UI interactions
 */
import { el, setStatus, buildInfoItem, show } from './dom.js';
import * as api from './api.js';
import { buildPlaylistCard, buildSeriesCard } from './playlist.js';

let serverHostname = '';

function getCredentials() {
  return {
    serverUrl: document.getElementById('serverUrl').value.trim(),
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value.trim()
  };
}

function setButtonLoading(btn, loading, text) {
  btn.disabled = loading;
  btn.textContent = '';
  if (loading) {
    btn.appendChild(el('span', { className: 'spinner' }));
    btn.appendChild(document.createTextNode(' ' + text));
  } else {
    btn.textContent = text;
  }
}

// ── Connect ──────────────────────────────────────
async function connect() {
  const creds = getCredentials();
  if (!creds.serverUrl || !creds.username || !creds.password) {
    setStatus('connectStatus', 'error', 'Please fill in all fields');
    return;
  }

  const btn = document.getElementById('connectBtn');
  setButtonLoading(btn, true, 'Connecting...');
  setStatus('connectStatus', 'info', 'Connecting to server...');

  try {
    const data = await api.authenticate(creds);

    if (data.user_info && data.user_info.auth === 1) {
      setStatus('connectStatus', 'success', 'Connected successfully!');

      try { serverHostname = new URL(creds.serverUrl).hostname; }
      catch { serverHostname = 'iptv'; }
      if (data.server_info && data.server_info.url) serverHostname = data.server_info.url;

      const info = data.user_info;
      const expDate = info.exp_date ? new Date(info.exp_date * 1000).toLocaleDateString() : 'N/A';

      const serverInfo = document.getElementById('serverInfo');
      serverInfo.classList.remove('hidden');
      serverInfo.replaceChildren(
        buildInfoItem('Status', String(info.status || 'Unknown')),
        buildInfoItem('Expires', expDate),
        buildInfoItem('Connections', (info.active_cons || 0) + ' / ' + (info.max_connections || 'N/A')),
        buildInfoItem('Username', String(info.username || creds.username))
      );

      show('optionsCard');
      await loadCategories();
    } else {
      setStatus('connectStatus', 'error', 'Authentication failed. Check your credentials.');
    }
  } catch (err) {
    setStatus('connectStatus', 'error', err.message);
  }

  setButtonLoading(btn, false, 'Connect to Server');
}

// ── Categories ───────────────────────────────────
async function loadCategories() {
  const creds = getCredentials();
  const grid = document.getElementById('categoriesGrid');
  grid.replaceChildren(el('p', { style: 'color:var(--text-muted)' }, 'Loading categories...'));

  try {
    const [live, vod, series] = await Promise.all([
      api.getLiveCategories(creds).catch(() => []),
      api.getVodCategories(creds).catch(() => []),
      api.getSeriesCategories(creds).catch(() => [])
    ]);

    const allCategories = [
      ...(live || []).map(c => ({ ...c, type: 'live' })),
      ...(vod || []).map(c => ({ ...c, type: 'vod' })),
      ...(series || []).map(c => ({ ...c, type: 'series' }))
    ];

    document.getElementById('catCount').textContent = allCategories.length + ' found';

    if (allCategories.length === 0) {
      grid.replaceChildren(el('p', { style: 'color:var(--text-muted)' }, 'No categories found'));
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const cat of allCategories) {
      const cb = el('input', { type: 'checkbox', value: String(cat.category_id) });
      cb.checked = true;
      fragment.appendChild(
        el('label', { className: 'cat-item' }, [
          cb,
          document.createTextNode(' ' + String(cat.category_name || ''))
        ])
      );
    }
    grid.replaceChildren(fragment);
  } catch (err) {
    grid.replaceChildren(el('p', { style: 'color:var(--error-color)' }, 'Error: ' + err.message));
  }
}

// ── Generate ─────────────────────────────────────
async function generatePlaylists() {
  const creds = getCredentials();
  const selectedCats = Array.from(
    document.querySelectorAll('#categoriesGrid input[type="checkbox"]:checked')
  ).map(cb => cb.value);

  const btn = document.getElementById('generateBtn');
  setButtonLoading(btn, true, 'Generating all playlists...');

  const progressFill = document.getElementById('progressFill');
  document.getElementById('progressBar').classList.add('active');
  progressFill.style.width = '15%';

  setStatus('generateStatus', 'info', 'Fetching Live TV, Movies and Series... This may take a moment.');

  try {
    progressFill.style.width = '40%';

    const result = await api.generatePlaylists(creds, selectedCats);

    progressFill.style.width = '100%';

    const total = (result.live?.count || 0) + (result.vod?.count || 0) + (result.series?.totalCount || 0);
    setStatus('generateStatus', 'success', 'Generated ' + total + ' total channels across all playlists!');

    show('resultCard');

    const container = document.getElementById('playlistCards');
    const fragment = document.createDocumentFragment();

    const cards = [
      buildPlaylistCard('live', 'Live TV', result.live, serverHostname, creds.username),
      buildPlaylistCard('vod', 'Movies', result.vod, serverHostname, creds.username),
      buildSeriesCard(result.series, serverHostname, creds.username)
    ];

    let hasCards = false;
    for (const card of cards) {
      if (card) { fragment.appendChild(card); hasCards = true; }
    }

    if (!hasCards) {
      fragment.appendChild(
        el('p', { style: 'color:var(--text-muted);text-align:center;padding:24px' },
          'No channels found for the selected categories.')
      );
    }

    container.replaceChildren(fragment);
    document.getElementById('resultCard').scrollIntoView({ behavior: 'smooth' });
  } catch (err) {
    setStatus('generateStatus', 'error', err.message);
  }

  setButtonLoading(btn, false, 'Generate All Playlists');
  setTimeout(() => document.getElementById('progressBar').classList.remove('active'), 1000);
}

// ── Category controls ────────────────────────────
function selectAllCats() {
  document.querySelectorAll('#categoriesGrid input[type="checkbox"]').forEach(cb => cb.checked = true);
}

function deselectAllCats() {
  document.querySelectorAll('#categoriesGrid input[type="checkbox"]').forEach(cb => cb.checked = false);
}

// ── Wire up events ───────────────────────────────
document.getElementById('connectBtn').addEventListener('click', connect);
document.getElementById('generateBtn').addEventListener('click', generatePlaylists);
document.getElementById('selectAllBtn').addEventListener('click', selectAllCats);
document.getElementById('deselectAllBtn').addEventListener('click', deselectAllCats);
