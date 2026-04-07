const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3009;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Authenticate and get server info
app.post('/api/authenticate', async (req, res) => {
  const { serverUrl, username, password } = req.body;
  if (!serverUrl || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const baseUrl = serverUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to connect to IPTV server', details: err.message });
  }
});

// Get live stream categories
app.post('/api/live-categories', async (req, res) => {
  const { serverUrl, username, password } = req.body;
  try {
    const baseUrl = serverUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`;
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch categories', details: err.message });
  }
});

// Get VOD categories
app.post('/api/vod-categories', async (req, res) => {
  const { serverUrl, username, password } = req.body;
  try {
    const baseUrl = serverUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_vod_categories`;
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch VOD categories', details: err.message });
  }
});

// Get series categories
app.post('/api/series-categories', async (req, res) => {
  const { serverUrl, username, password } = req.body;
  try {
    const baseUrl = serverUrl.replace(/\/+$/, '');
    const url = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_series_categories`;
    const response = await axios.get(url, { timeout: 15000 });
    res.json(response.data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to fetch series categories', details: err.message });
  }
});

// Helper: build M3U for live streams
async function buildLivePlaylist(baseUrl, apiBase, selectedCategories) {
  const categoriesRes = await axios.get(`${apiBase}&action=get_live_categories`, { timeout: 15000 });
  const categories = categoriesRes.data || [];
  const categoryMap = {};
  categories.forEach(c => { categoryMap[c.category_id] = c.category_name; });

  const streamsRes = await axios.get(`${apiBase}&action=get_live_streams`, { timeout: 60000 });
  const streams = streamsRes.data || [];

  let m3u = '#EXTM3U\n';
  let count = 0;

  for (const stream of streams) {
    if (selectedCategories && selectedCategories.length > 0) {
      if (!selectedCategories.includes(String(stream.category_id))) continue;
    }
    const name = stream.name || 'Unknown';
    const logo = stream.stream_icon || '';
    const group = categoryMap[stream.category_id] || 'Uncategorized';
    const streamId = stream.stream_id;
    const epgId = stream.epg_channel_id || '';
    const ext = stream.container_extension || 'ts';
    const streamUrl = `${baseUrl}/live/${stream._username}/${stream._password}/${streamId}.${ext}`;

    m3u += `#EXTINF:-1 tvg-id="${epgId}" tvg-name="${name}" tvg-logo="${logo}" group-title="${group}",${name}\n`;
    m3u += `${baseUrl}/live/USERNAME/PASSWORD/${streamId}.${ext}\n`;
    count++;
  }

  return { m3u, count };
}

// Generate separate playlists for each content type
app.post('/api/generate-playlists', async (req, res) => {
  const { serverUrl, username, password, selectedCategories } = req.body;
  if (!serverUrl || !username || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const baseUrl = serverUrl.replace(/\/+$/, '');
    const u = encodeURIComponent(username);
    const p = encodeURIComponent(password);
    const apiBase = `${baseUrl}/player_api.php?username=${u}&password=${p}`;

    const result = { live: null, vod: null, series: null };

    // --- LIVE TV ---
    try {
      const categoriesRes = await axios.get(`${apiBase}&action=get_live_categories`, { timeout: 15000 });
      const categories = categoriesRes.data || [];
      const categoryMap = {};
      categories.forEach(c => { categoryMap[c.category_id] = c.category_name; });

      const streamsRes = await axios.get(`${apiBase}&action=get_live_streams`, { timeout: 60000 });
      const streams = streamsRes.data || [];

      let m3u = '#EXTM3U\n';
      let count = 0;
      for (const stream of streams) {
        if (selectedCategories && selectedCategories.length > 0) {
          if (!selectedCategories.includes(String(stream.category_id))) continue;
        }
        const name = stream.name || 'Unknown';
        const logo = stream.stream_icon || '';
        const group = categoryMap[stream.category_id] || 'Uncategorized';
        const epgId = stream.epg_channel_id || '';
        const ext = stream.container_extension || 'ts';
        m3u += `#EXTINF:-1 tvg-id="${epgId}" tvg-name="${name}" tvg-logo="${logo}" group-title="${group}",${name}\n`;
        m3u += `${baseUrl}/live/${u}/${p}/${stream.stream_id}.${ext}\n`;
        count++;
      }
      result.live = { playlist: m3u, count };
    } catch { result.live = { playlist: '#EXTM3U\n', count: 0 }; }

    // --- VOD / MOVIES ---
    try {
      const categoriesRes = await axios.get(`${apiBase}&action=get_vod_categories`, { timeout: 15000 });
      const categories = categoriesRes.data || [];
      const categoryMap = {};
      categories.forEach(c => { categoryMap[c.category_id] = c.category_name; });

      const streamsRes = await axios.get(`${apiBase}&action=get_vod_streams`, { timeout: 60000 });
      const streams = streamsRes.data || [];

      let m3u = '#EXTM3U\n';
      let count = 0;
      for (const stream of streams) {
        if (selectedCategories && selectedCategories.length > 0) {
          if (!selectedCategories.includes(String(stream.category_id))) continue;
        }
        const name = stream.name || 'Unknown';
        const logo = stream.stream_icon || '';
        const group = categoryMap[stream.category_id] || 'Movies';
        const ext = stream.container_extension || 'mp4';
        m3u += `#EXTINF:-1 tvg-name="${name}" tvg-logo="${logo}" group-title="${group}",${name}\n`;
        m3u += `${baseUrl}/movie/${u}/${p}/${stream.stream_id}.${ext}\n`;
        count++;
      }
      result.vod = { playlist: m3u, count };
    } catch { result.vod = { playlist: '#EXTM3U\n', count: 0 }; }

    // --- SERIES ---
    try {
      const categoriesRes = await axios.get(`${apiBase}&action=get_series_categories`, { timeout: 15000 });
      const categories = categoriesRes.data || [];
      const categoryMap = {};
      categories.forEach(c => { categoryMap[c.category_id] = c.category_name; });

      const seriesRes = await axios.get(`${apiBase}&action=get_series`, { timeout: 60000 });
      const seriesList = seriesRes.data || [];

      let m3u = '#EXTM3U\n';
      let count = 0;
      for (const series of seriesList) {
        if (selectedCategories && selectedCategories.length > 0) {
          if (!selectedCategories.includes(String(series.category_id))) continue;
        }
        const name = series.name || 'Unknown';
        const logo = series.cover || '';
        const group = categoryMap[series.category_id] || 'Series';
        try {
          const infoRes = await axios.get(`${apiBase}&action=get_series_info&series_id=${series.series_id}`, { timeout: 15000 });
          const episodes = infoRes.data.episodes || {};
          for (const [seasonNum, seasonEpisodes] of Object.entries(episodes)) {
            for (const ep of seasonEpisodes) {
              const epName = `${name} S${String(seasonNum).padStart(2, '0')}E${String(ep.episode_num).padStart(2, '0')} - ${ep.title || ''}`;
              const ext = ep.container_extension || 'mp4';
              m3u += `#EXTINF:-1 tvg-name="${epName}" tvg-logo="${logo}" group-title="${group}",${epName}\n`;
              m3u += `${baseUrl}/series/${u}/${p}/${ep.id}.${ext}\n`;
              count++;
            }
          }
        } catch { /* skip failed series */ }
      }
      result.series = { playlist: m3u, count };
    } catch { result.series = { playlist: '#EXTM3U\n', count: 0 }; }

    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Failed to generate playlists', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`IPTV Playlist Generator running at http://localhost:${PORT}`);
});
