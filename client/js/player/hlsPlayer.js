// 明确导入createVideoElement
import { createVideoElement } from './playerManager.js';

export function playHLS(url) {
  const video = createVideoElement();
  
  if (window.Hls) {
    const player = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60
    });
    player.loadSource(url);
    player.attachMedia(video);
    window.currentPlayer = player;
    return player;
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    window.currentPlayer = video;
    return video;
  } else {
    throw new Error('浏览器不支持HLS播放');
  }
}
