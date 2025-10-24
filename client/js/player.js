let currentPlayer = null;
let currentVideoElement = null;

// 销毁播放器
export function destroyPlayer() {
  if (currentPlayer) {
    if (currentPlayer.destroy) currentPlayer.destroy();
    else if (currentPlayer.pause) currentPlayer.pause();
    currentPlayer = null;
  }
  if (currentVideoElement) {
    currentVideoElement.remove();
    currentVideoElement = null;
  }
}

// 获取当前播放器
export function getCurrentPlayer() {
  return currentPlayer || currentVideoElement;
}

// 创建视频元素（关键：添加export导出）
export function createVideoElement() {
  const video = document.createElement('video');
  video.controls = true;
  video.style.width = '100%';
  video.style.height = '100%';
  document.getElementById('playerArea').appendChild(video);
  currentVideoElement = video;
  return video;
}

// 导出播放器函数（保持不变）
export { playFLV } from './flvPlayer.js';
export { playHLS } from './hlsPlayer.js';
