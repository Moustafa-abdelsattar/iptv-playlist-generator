/**
 * Playlist module - download, copy, zip, and card rendering
 */
import { el, setStatus } from './dom.js';

export function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'audio/x-mpegurl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    setStatus('generateStatus', 'success', label + ' playlist copied to clipboard!');
  });
}

export function buildFilename(serverHostname, username, label) {
  const now = new Date();
  const date = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  return 'StreamCast_' + serverHostname + '_' + username + '_' + label.replace(/\s+/g, '-') + '_' + date + '.m3u';
}

/** Sanitize a string for use as a folder/file name */
function safeName(str) {
  return str.replace(/[<>:"/\\|?*]+/g, '_').replace(/\s+/g, ' ').trim();
}

/** Build a standard card for Live TV or Movies */
export function buildPlaylistCard(type, label, data, serverHostname, username) {
  if (!data || data.count === 0) return null;

  const filename = buildFilename(serverHostname, username, label);
  const fileSize = (new Blob([data.playlist]).size / 1024).toFixed(1);
  const previewText = data.playlist.split('\n').slice(0, 20).join('\n') +
    (data.playlist.split('\n').length > 20 ? '\n...' : '');

  const card = el('div', { className: 'playlist-card' }, [
    el('div', { className: 'playlist-card-header' }, [
      el('div', { className: 'playlist-card-title ' + type }, label),
      el('span', { className: 'playlist-badge ' + type }, data.count + ' channels')
    ]),
    el('div', { className: 'playlist-stats' }, [
      el('div', {}, [
        el('div', { className: 'playlist-stat-number' }, String(data.count)),
        el('div', { className: 'playlist-stat-label' }, 'Channels')
      ]),
      el('div', {}, [
        el('div', { className: 'playlist-stat-number' }, fileSize + ' KB'),
        el('div', { className: 'playlist-stat-label' }, 'File Size')
      ])
    ]),
    el('div', { className: 'playlist-filename' }, filename),
    el('div', { className: 'playlist-actions' }, [
      el('button', {
        className: 'btn-download ' + type,
        onclick: () => downloadFile(data.playlist, filename)
      }, 'Download .m3u'),
      el('button', {
        className: 'btn-copy',
        onclick: () => copyToClipboard(data.playlist, label)
      }, 'Copy')
    ])
  ]);

  const preview = el('div', { className: 'preview-box' });
  preview.textContent = previewText;
  card.appendChild(preview);

  return card;
}

/** Build a series card with per-show zip download */
export function buildSeriesCard(seriesData, serverHostname, username) {
  if (!seriesData || !seriesData.shows || seriesData.shows.length === 0) return null;

  const { shows, totalCount } = seriesData;

  async function downloadSeriesZip() {
    const zip = new JSZip();
    for (const show of shows) {
      const folderName = safeName(show.name);
      zip.file(folderName + '/' + folderName + '.m3u', show.playlist);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'StreamCast_Series_' + serverHostname + '_' + username + '.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Build show list
  const showListItems = shows.slice(0, 30).map(show =>
    el('div', { className: 'series-show-item' }, [
      el('span', { className: 'series-show-name' }, show.name),
      el('span', { className: 'series-show-count' }, show.episodeCount + ' ep'),
      el('button', {
        className: 'series-show-dl',
        onclick: () => downloadFile(show.playlist, safeName(show.name) + '.m3u')
      }, 'Download')
    ])
  );

  const card = el('div', { className: 'playlist-card' }, [
    el('div', { className: 'playlist-card-header' }, [
      el('div', { className: 'playlist-card-title series' }, 'Series'),
      el('span', { className: 'playlist-badge series' },
        shows.length + ' shows / ' + totalCount + ' episodes')
    ]),
    el('div', { className: 'playlist-stats' }, [
      el('div', {}, [
        el('div', { className: 'playlist-stat-number' }, String(shows.length)),
        el('div', { className: 'playlist-stat-label' }, 'Shows')
      ]),
      el('div', {}, [
        el('div', { className: 'playlist-stat-number' }, String(totalCount)),
        el('div', { className: 'playlist-stat-label' }, 'Episodes')
      ])
    ]),
    el('div', { className: 'playlist-actions' }, [
      el('button', {
        className: 'btn-download series',
        onclick: downloadSeriesZip
      }, 'Download all as .zip'),
    ]),
    el('div', { className: 'series-show-list' }, showListItems)
  ]);

  if (shows.length > 30) {
    card.querySelector('.series-show-list').appendChild(
      el('div', { className: 'series-show-more' },
        '+ ' + (shows.length - 30) + ' more shows in the zip')
    );
  }

  return card;
}
