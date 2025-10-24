import { getLiveInfo } from './api.js';
import { initPlayer, destroyPlayers, loadVideoStream } from './player.js';
import { showMessage, hideMessage, validateRoomId } from './utils.js';

// DOM元素获取
const elements = {
  roomIdInput: document.getElementById('roomIdInput'),
  fetchBtn: document.getElementById('fetchBtn'),
  resultContainer: document.getElementById('resultContainer'),
  titleDisplay: document.getElementById('titleDisplay'),
  unameDisplay: document.getElementById('unameDisplay'),
  roomIdDisplay: document.getElementById('roomIdDisplay'),
  statusDisplay: document.getElementById('statusDisplay'),
  statusIndicator: document.getElementById('statusIndicator'),
  liveTimeDisplay: document.getElementById('liveTimeDisplay'),
  coverImage: document.getElementById('coverImage'),
  screenshotImage: document.getElementById('screenshotImage'),
  messageContainer: document.getElementById('messageContainer'),
  loadingDiv: document.getElementById('loading'),
  downloadCoverBtn: document.getElementById('downloadCoverBtn'),
  downloadScreenshotBtn: document.getElementById('downloadScreenshotBtn'),
  coverImageInfo: document.getElementById('coverImageInfo'),
  screenshotImageInfo: document.getElementById('screenshotImageInfo'),
  videoSection: document.getElementById('videoSection'),
  videoPlayer: document.getElementById('videoPlayer'),
  playBtn: document.getElementById('playBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  reloadBtn: document.getElementById('reloadBtn'),
  videoStatus: document.getElementById('videoStatus'),
  qualitySelect: document.getElementById('qualitySelect'),
  playPrompt: document.getElementById('playPrompt')
};

// 全局状态
const state = {
  currentStreamUrl: '',
  allStreamUrls: [],
  currentRoomId: '',
  streamRefreshTimer: null
};

// 初始化播放器
initPlayer(elements, state);

// 绑定事件
elements.fetchBtn.addEventListener('click', async () => {
  const roomId = elements.roomIdInput.value.trim();
  if (!roomId) {
    showMessage('请输入直播间ID！', true);
    return;
  }
  if (!validateRoomId(roomId)) {
    showMessage('错误：直播间ID必须是数字！', true);
    return;
  }

  try {
    elements.loadingDiv.style.display = 'block';
    elements.resultContainer.style.display = 'none';
    elements.videoSection.style.display = 'block';
    hideMessage();
    destroyPlayers();
    clearInterval(state.streamRefreshTimer);

    const data = await getLiveInfo(roomId);
    if (data.code !== 0) {
      throw new Error(data.message || '获取直播信息失败');
    }

    // 更新UI显示（简化版，完整逻辑见原代码）
    const liveInfo = data.data;
    elements.titleDisplay.textContent = liveInfo.title || `直播间${roomId}`;
    elements.unameDisplay.textContent = liveInfo.uname || '未知主播';
    elements.roomIdDisplay.textContent = liveInfo.room_id || roomId;
    
    // 处理直播流
    if (liveInfo.live_status === 1) {
      state.allStreamUrls = liveInfo.stream_urls || [];
      state.currentRoomId = liveInfo.room_id || roomId;
      loadVideoStream(liveInfo.stream_url, elements, state);
      showMessage('直播信息获取成功！点击播放按钮开始观看');
    } else {
      showMessage('直播间未开播，无法加载实时画面', true);
    }

    elements.resultContainer.style.display = 'block';
  } catch (error) {
    showMessage(`发生错误: ${error.message}`, true);
  } finally {
    elements.loadingDiv.style.display = 'none';
  }
});

// 其他事件绑定（播放/暂停/画质切换等）
elements.playBtn.addEventListener('click', () => {
  elements.playPrompt.style.display = 'none';
  if (window.flvPlayer) window.flvPlayer.play();
  else if (window.dashPlayer) elements.videoPlayer.play();
  else if (state.currentStreamUrl) elements.videoPlayer.play();
  else showMessage('没有可用的直播流', true);
});

elements.pauseBtn.addEventListener('click', () => {
  if (window.flvPlayer) window.flvPlayer.pause();
  else if (window.dashPlayer) elements.videoPlayer.pause();
  else elements.videoPlayer.pause();
});

elements.qualitySelect.addEventListener('change', () => {
  const url = elements.qualitySelect.value;
  if (url) loadVideoStream(url, elements, state);
});

// 页面关闭时清理
window.addEventListener('beforeunload', () => {
  destroyPlayers();
  clearInterval(state.streamRefreshTimer);
});
