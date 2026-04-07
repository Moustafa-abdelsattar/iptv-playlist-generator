/**
 * Playlist module - download and display logic
 */
import { el, setStatus } from './dom.js';

/** Download a string as a file */
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

/** Copy text to clipboard */
export function copyToClipboard(text, label) {
  navigator.clipboard.writeText(text).then(() => {
    setStatus('generateStatus', 'success', label + ' playlist copied!');
  });
}

/** Generate a descriptive filename */
export function buildFilename(serverHostname, username, label) {
  const now = new Date();
  const date = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  return serverHostname + '_' + username + '_' + label.replace(/\s+/g, '-') + '_' + date + '.m3u';
}

/** Build a single playlist result card */
export function buildPlaylistCard(type, label, data, serverHostname, username) {
  if (!data || data.count === 0) return null;

  const filename = buildFilename(serverHostname, username, label);
  const fileSize = (new Blob([data.playlist]).size / 1024).toFixed(1);
  const previewText = data.playlist.split('\n').slice(0, 20).join('\n') +
    (data.playlist.split('\n').length > 20 ? '\n...' : '');

  const card = el('div', { className: 'playlist-card' }, [
    // Header
    el('div', { className: 'playlist-card-header' }, [
      el('div', { className: 'playlist-card-title ' + type }, label),
      el('span', { className: 'playlist-badge ' + type }, data.count + ' channels')
    ]),
    // Stats
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
    // Filename
    el('div', { className: 'playlist-filename' }, filename),
    // Actions
    el('div', { className: 'playlist-actions' }, [
      el('button', {
        className: 'btn-download ' + type,
        onclick: () => downloadFile(data.playlist, filename)
      }, 'Download ' + label),
      el('button', {
        className: 'btn-copy',
        onclick: () => copyToClipboard(data.playlist, label)
      }, 'Copy')
    ])
  ]);

  // Preview
  const preview = el('div', { className: 'preview-box' });
  preview.textContent = previewText;
  card.appendChild(preview);

  return card;
}
