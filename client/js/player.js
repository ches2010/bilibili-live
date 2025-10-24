/**
 * 初始化播放器（全局变量存储播放器实例）
 */
function initPlayer(elements, state) {
  window.flvPlayer = null;
  window.dashPlayer = null;
}

/**
 * 销毁所有播放器实例
 */
function destroyPlayers() {
  if (window.flvPlayer) {
    window.flvPlayer.destroy();
    window.flvPlayer = null;
  }
  if (window.dashPlayer) {
    window.dashPlayer.reset();
    window.dashPlayer = null;
  }
}

/**
 * 检测流格式（FLV/HLS/DASH等）
 */
async function detectStreamFormat(url) {
  if (url.includes('.m3u8') || url.includes('hls')) return 'hls';
  if (url.includes('.flv')) return 'flv';
  if (url.includes('.mpd') || url.includes('dash')) return 'dash';
  
  // 详细检测逻辑见原代码...
  return 'unknown';
}

/**
 * 加载视频流
 */
async function loadVideoStream(streamUrl, elements, state) {
  destroyPlayers();
  elements.videoPlayer.src = '';
  elements.playPrompt.style.display = 'none';

  if (!streamUrl) {
    elements.videoStatus.textContent = '无可用直播流';
    return;
  }

  state.currentStreamUrl = streamUrl;
  elements.videoStatus.textContent = '正在加载直播流...';
  const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
  const format = await detectStreamFormat(streamUrl);

  try {
    switch (format) {
      case 'flv':
        if (window.flvjs && flvjs.isSupported()) {
          window.flvPlayer = flvjs.createPlayer({ type: 'flv', url: proxyUrl });
          window.flvPlayer.attachMediaElement(elements.videoPlayer);
          window.flvPlayer.load();
          // 事件监听逻辑...
        }
        break;
      case 'hls':
        elements.videoPlayer.src = proxyUrl;
        elements.videoPlayer.type = 'application/x-mpegURL';
        elements.videoPlayer.load();
        // 事件监听逻辑...
        break;
      // 其他格式处理...
    }
  } catch (error) {
    elements.videoStatus.textContent = `加载失败: ${error.message}`;
  }
}

export { initPlayer, destroyPlayers, loadVideoStream };
