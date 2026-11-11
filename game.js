import { createClient, createMicrophoneAudioTrack, registerWasmBridge } from './js/libs/rtc-sdk.min.js';
import { createWasmBridge } from './js/libs/rtc-wasm.min.js';
import { config } from './config.js';

let bridge;
registerWasmBridge(() => (bridge = createWasmBridge()));
const client = createClient({
  enableAec: false,
  enableLogUpload: config.enableLogUpload === true,
  logLevel: config.logLevel || 'debug',
});
const canvas = wx.createCanvas();
const context = canvas.getContext('2d');
const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
const width = info.windowWidth, height = info.windowHeight;
canvas.width = width; canvas.height = height;
let uid = 0;
let state = 'DISCONNECTED', busy = false, audioBusy = false, publishBusy = false;
let message = '', nativeStats = '', volumeStats = '', published = false, muted = false, microphoneTrack = null;
const subscribedUsers = new Map();
let audioUser = null;
const log = (text, detail = '') => console.log('[RTC-Demo]', text, detail);
client.on('connection-state-change', (current, previous) => {
  state = current; log('state', `${previous} -> ${current}`); draw();
});
client.on('error', (error) => { message = error.message || String(error); log('error', error); draw(); });
client.on('user-published', async (user, mediaType) => {
  if (mediaType !== 'audio') return;
  try {
    const track = await client.subscribe(user, 'audio');
    track.play();
    subscribedUsers.set(user.uid, user);
    audioUser = user;
    log('subscribed remote audio', { uid: user.uid, ssrcId: track.ssrcId });
  } catch (error) {
    message = error.message || String(error);
    log('remote subscribe failed', error);
  }
  draw();
});
client.on('user-unpublished', (user, mediaType) => {
  if (mediaType !== 'audio') return;
  subscribedUsers.delete(user.uid);
  if (audioUser === user) audioUser = [...subscribedUsers.values()].pop() || null;
  log('remote audio unpublished', { uid: user.uid });
  draw();
});
const joinButton = { x: 24, y: 190, width: width - 48, height: 48 };
const audioButton = { x: 24, y: 246, width: width - 48, height: 48 };
const publishButton = { x: 24, y: 302, width: width - 48, height: 48 };
const muteButton = { x: 24, y: 358, width: width - 48, height: 48 };
function inside(touch, rect) {
  return touch.clientX >= rect.x && touch.clientX <= rect.x + rect.width &&
    touch.clientY >= rect.y && touch.clientY <= rect.y + rect.height;
}
function lines(text, x, y, maxWidth) {
  let line = '', row = 0;
  for (const character of text) {
    if (context.measureText(line + character).width > maxWidth) {
      context.fillText(line, x, y + row++ * 22); line = '';
    }
    line += character;
  }
  context.fillText(line, x, y + row * 22);
  return y + (row + 1) * 22;
}
function audioEnabled() {
  return !audioBusy && audioUser && state === 'CONNECTED';
}
function audioLabel() {
  if (audioBusy) return '...';
  if (!audioUser || state !== 'CONNECTED') return 'No remote audio';
  return audioUser.audioTrack ? 'Unsubscribe audio' : 'Subscribe audio';
}
function publishEnabled() {
  return !publishBusy && state === 'CONNECTED';
}
function publishLabel() {
  if (publishBusy) return '...';
  if (state !== 'CONNECTED') return 'No connection';
  return published ? 'Unpublish mic' : 'Publish mic';
}
function muteLabel() {
  if (!published) return 'No publication';
  return muted ? 'Unmute mic' : 'Mute mic';
}
function volumeLabel() {
  const local = microphoneTrack ? microphoneTrack.getVolumeLevel() : 0;
  let remote = 0;
  for (const user of subscribedUsers.values()) {
    const track = user.audioTrack;
    if (track) remote = Math.max(remote, track.getVolumeLevel());
  }
  return `local volume level ${local.toFixed(2)} / remote volume level ${remote.toFixed(2)}`;
}
function draw() {
  context.fillStyle = '#f6f7f9'; context.fillRect(0, 0, width, height);
  context.fillStyle = '#171b20'; context.font = '22px sans-serif';
  context.fillText('Agora RTC Demo', 24, 60);
  context.font = '14px sans-serif';
  context.fillText(config.channel, 24, 98);
  context.fillText(`UID ${uid}`, 24, 124);
  context.fillText(`${state}${published ? muted ? ' · mic muted' : ' · mic live' : ''}`, 24, 150);
  context.fillStyle = busy ? '#65707b' : state === 'CONNECTED' ? '#a52a32' : '#19654b';
  context.fillRect(joinButton.x, joinButton.y, joinButton.width, joinButton.height);
  context.fillStyle = '#ffffff'; context.font = '16px sans-serif';
  context.fillText(busy ? '...' : state === 'CONNECTED' ? 'Leave' : 'Join', 42, 220);
  context.fillStyle = audioEnabled() ? (audioUser.audioTrack ? '#7c4d1f' : '#1f5f7c') : '#9aa3ad';
  context.fillRect(audioButton.x, audioButton.y, audioButton.width, audioButton.height);
  context.fillStyle = '#ffffff';
  context.fillText(audioLabel(), 42, 276);
  context.fillStyle = publishEnabled() ? (published ? '#7c4d1f' : '#1f5f7c') : '#9aa3ad';
  context.fillRect(publishButton.x, publishButton.y, publishButton.width, publishButton.height);
  context.fillStyle = '#ffffff';
  context.fillText(publishLabel(), 42, 332);
  context.fillStyle = published ? (muted ? '#7c4d1f' : '#16643f') : '#9aa3ad';
  context.fillRect(muteButton.x, muteButton.y, muteButton.width, muteButton.height);
  context.fillStyle = '#ffffff';
  context.fillText(muteLabel(), 42, 388);
  context.fillStyle = '#454d56'; context.font = '13px sans-serif';
  const next = lines(message, 24, 443, width - 48);
  const statsEnd = lines(nativeStats, 24, next + 16, width - 48);
  lines(volumeStats, 24, statsEnd + 16, width - 48);
}
async function toggleAudio() {
  audioBusy = true; message = ''; draw();
  const user = audioUser;
  try {
    if (user.audioTrack) {
      await client.unsubscribe(user, 'audio');
      log('unsubscribed remote audio', { uid: user.uid });
    } else {
      const track = await client.subscribe(user, 'audio');
      track.play();
      log('resubscribed remote audio', { uid: user.uid, ssrcId: track.ssrcId });
    }
  } catch (error) {
    message = error.message || String(error);
    log('audio subscription toggle failed', error);
  } finally { audioBusy = false; draw(); }
}
function requirePrivacy() {
  if (typeof wx.requirePrivacyAuthorize !== 'function') return Promise.resolve();
  return new Promise((resolve, reject) => {
    wx.requirePrivacyAuthorize({
      success: () => resolve(),
      fail: (error) => reject(new Error(error?.errMsg || 'privacy authorization failed')),
    });
  });
}
async function togglePublish() {
  publishBusy = true; message = ''; draw();
  try {
    if (published) {
      await client.unpublish(microphoneTrack);
      published = false;
      log('unpublished microphone', { uid });
    } else {
      await requirePrivacy();
      if (!microphoneTrack) microphoneTrack = await createMicrophoneAudioTrack({ enableAec: false });
      await client.publish(microphoneTrack);
      published = true;
      muted = false;
      log('published microphone', { uid });
    }
  } catch (error) {
    message = error.message || String(error);
    log('publish toggle failed', error);
  } finally { publishBusy = false; draw(); }
}
function toggleMute() {
  if (!published || !microphoneTrack) return;
  muted = !muted;
  microphoneTrack.setMuted(muted);
  log(muted ? 'muted microphone' : 'unmuted microphone');
  draw();
}
wx.onTouchStart(async ({ touches }) => {
  const touch = touches[0];
  if (!touch) return;
  if (audioEnabled() && inside(touch, audioButton)) {
    await toggleAudio();
    return;
  }
  if (publishEnabled() && inside(touch, publishButton)) {
    await togglePublish();
    return;
  }
  if (published && inside(touch, muteButton)) {
    toggleMute();
    return;
  }
  if (busy || !inside(touch, joinButton)) return;
  busy = true; message = ''; draw();
  try {
    if (client.connectionState === 'CONNECTED') {
      await client.leave();
      subscribedUsers.clear(); audioUser = null; nativeStats = ''; volumeStats = '';
      published = false; muted = false; microphoneTrack = null; uid = 0;
      log('left');
    } else {
      uid = await client.join(config.appId, config.channel, config.token);
      message = 'ICE + DTLS/SRTP connected';
      log('joined', { channel: config.channel, uid });
    }
  } catch (error) {
    message = error.message || String(error); log('join/leave failed', error);
  } finally { busy = false; draw(); }
});
setInterval(() => {
  volumeStats = volumeLabel();
  draw();
}, 2000);
setInterval(() => {
  const id = bridge && [...bridge.sessions.keys()][0];
  if (!id) return;
  try {
    const stats = bridge.getStats(id);
    nativeStats = `poll max ${stats.maxPollMs}ms; tick gap ${stats.maxTickGapMs}ms; UDP ${stats.received}/${stats.sent}; queue ${stats.queued}; uplink ${stats.uplinkFrames || 0}/${stats.uplinkDropped || 0}`;
    draw();
  } catch (error) { log('stats failed', error); }
}, 1000);
volumeStats = volumeLabel();
log('ready', { ...config, token: config.token ? '(configured)' : '' });
draw();
