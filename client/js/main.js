import { getLiveInfo, getStreamUrls } from './api.js';
import { playFLV, playHLS, destroyPlayer, getCurrentPlayer } from './player/playerManager.js';
import { showMessage, hideMessage } from './utils.js';

// DOM元素
const elements = {
  roomIdInput: document.getElementById('roomIdInput'),
  fetchBtn: document.getElementById('fetchBtn'),
  loading: document.getElementById('loading'),
  resultContainer: document.getElementById('resultContainer'),
  titleDisplay: document.getElementById('titleDisplay'),
  unameDisplay: document.getElementById('unameDisplay'),
  statusDisplay: document.getElementById('statusDisplay'),
  liveTimeDisplay: document.getElementById('liveTimeDisplay'),
  coverImage: document.getElementById('coverImage'),
  screenshotImage: document.getElementById('screenshotImage'),
  downloadCoverBtn: document.getElementById('downloadCoverBtn'),
  downloadScreenshotBtn: document.getElementById('downloadScreenshotBtn'),
  videoSection: document.getElementById('videoSection'),
  qualitySelect: document.getElementById('qualitySelect'),
  playBtn: document.getElementById('playBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  reloadBtn: document.getElementById('reloadBtn'),
  videoStatus: document.getElementById('videoStatus')
};

// 状态变量
let currentStreams = [];
let currentRoomId = '';

// 事件绑定
elements.fetchBtn.addEventListener('click', handleFetch);
elements.roomIdInput.addEventListener('keypress', e => e.key === 'Enter' && handleFetch());
elements.qualitySelect.addEventListener('change', handleStreamChange);
elements.playBtn.addEventListener('click', () => getCurrentPlayer()?.play());
elements.pauseBtn.addEventListener('click', () => getCurrentPlayer()?.pause());
elements.reloadBtn.addEventListener('click', handleReload);

// 获取直播信息
async function handleFetch() {
  const roomId = elements.roomIdInput.value.trim();
  if (!roomId || !/^\d+$/.test(roomId)) {
    showMessage('请输入有效的房间ID', true);
    return;
  }

  try {
    elements.loading.style.display = 'block';
    hideMessage();
    destroyPlayer();

    // 1. 获取直播基础信息（ches2010方案）
    const infoRes = await getLiveInfo(roomId);
    if (infoRes.code !== 0) {
      throw new Error(infoRes.message || '获取直播信息失败');
    }
    const info = infoRes.data;
    currentRoomId = info.room_id;

    // 2. 渲染直播信息
    renderLiveInfo(info);

    // 3. 获取流地址（文件夹方案）
    const streamRes = await getStreamUrls(roomId);
    if (streamRes.code !== 0 || streamRes.urls.length === 0) {
      throw new Error(streamRes.message || '获取流地址失败');
    }
    currentStreams = streamRes.urls;
    renderStreamOptions();

    // 4. 自动播放第一个流
    playStream(currentStreams[0]);

  } catch (err) {
    showMessage(err.message, true);
  } finally {
    elements.loading.style.display = 'none';
  }
}

// 渲染直播信息
function renderLiveInfo(info) {
  elements.resultContainer.style.display = 'block';
  elements.videoSection.style.display = 'block';
  elements.titleDisplay.textContent = info.title;
  elements.unameDisplay.textContent = info.uname;
  elements.statusDisplay.textContent = info.live_status === 1 ? '直播中' : '未开播';
  elements.liveTimeDisplay.textContent = info.live_time || '未知';

  // 渲染封面和截图
  elements.coverImage.src = `/api/image-proxy?url=${encodeURIComponent(info.user_cover)}`;
  elements.screenshotImage.src = `/api/image-proxy?url=${encodeURIComponent(info.keyframe)}`;

  // 下载按钮
  elements.downloadCoverBtn.onclick = () => {
    window.open(`/api/download-cover?url=${encodeURIComponent(info.user_cover)}&roomId=${info.room_id}`);
  };
  elements.downloadScreenshotBtn.onclick = () => {
    window.open(`/api/download-screenshot?url=${encodeURIComponent(info.keyframe)}&roomId=${info.room_id}`);
  };
}

// 渲染流选项
function renderStreamOptions() {
  elements.qualitySelect.innerHTML = '';
  currentStreams.forEach((stream, i) => {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = `${stream.desc} (线路${i + 1})`;
    elements.qualitySelect.appendChild(option);
  });
}

// 切换流
function handleStreamChange() {
  const index = elements.qualitySelect.value;
  if (index !== '' && currentStreams[index]) {
    playStream(currentStreams[index]);
  }
}

// 播放流（文件夹方案播放器）
function playStream(stream) {
  destroyPlayer();
  elements.videoStatus.textContent = `加载${stream.desc}...`;
  
  try {
    const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(stream.url)}`;
    if (stream.format.includes('flv')) {
      playFLV(proxyUrl);
    } else {
      playHLS(proxyUrl);
    }
    elements.videoStatus.textContent = `${stream.desc}加载完成`;
  } catch (err) {
    elements.videoStatus.textContent = `播放失败: ${err.message}`;
  }
}

// 重新加载
function handleReload() {
  const index = elements.qualitySelect.value;
  if (index !== '' && currentStreams[index]) {
    playStream(currentStreams[index]);
  }
}
