// 全局变量
let currentPlayer = null;
let currentVideo = null;
let currentRoomId = null;
let currentCoverUrl = null;
let currentScreenshotUrl = null;

// 销毁播放器
function destroyPlayer() {
    if (currentPlayer) {
        if (typeof currentPlayer.destroy === 'function') currentPlayer.destroy();
        currentPlayer = null;
    }
    currentVideo = null;
    document.getElementById('playerArea').innerHTML = '';
}

// 播放FLV流
function playFLV(url) {
    destroyPlayer();
    const container = document.getElementById('playerArea');
    const video = document.createElement('video');
    video.className = 'player-video';
    video.controls = true;
    video.playsInline = true;
    video.muted = false;
    currentVideo = video;

    const box = document.createElement('div');
    box.className = 'player-container';
    box.innerHTML = '<strong>正在播放 FLV 流</strong>';
    box.appendChild(video);
    container.appendChild(box);

    if (flvjs.isSupported()) {
        const player = flvjs.createPlayer({ type: 'flv', url });
        player.attachMediaElement(video);
        player.load();
        player.play().catch(e => console.warn('播放被阻止:', e));
        currentPlayer = player;
    } else {
        alert('浏览器不支持 FLV');
    }
}

// 播放HLS流
function playHLS(url) {
    destroyPlayer();
    const container = document.getElementById('playerArea');
    const video = document.createElement('video');
    video.className = 'player-video';
    video.controls = true;
    video.playsInline = true;
    video.muted = false;
    currentVideo = video;

    const box = document.createElement('div');
    box.className = 'player-container';
    box.innerHTML = '<strong>正在播放 HLS 流</strong>';
    box.appendChild(video);
    container.appendChild(box);

    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(e => console.warn('播放被阻止:', e)));
        currentPlayer = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', () => video.play().catch(e => console.warn('播放被阻止:', e)));
        currentPlayer = { destroy: () => video.src = '' };
    } else {
        alert('浏览器不支持 HLS');
    }
}

// 视频截图
function takeScreenshot() {
    if (!currentVideo || currentVideo.readyState < 2) {
        alert('请先播放视频并等待加载！');
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = currentVideo.videoWidth;
    canvas.height = currentVideo.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(currentVideo, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bili-live-${currentRoomId}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 'image/png');
}

// 复制到剪贴板
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => alert('已复制！')).catch(() => alert('复制失败'));
}

// 显示消息
function showMessage(elementId, message, isError = false) {
    document.getElementById(elementId).innerHTML = `
        <div class="${isError ? 'notification is-danger' : 'notification is-success'}">
            ${message}
        </div>
    `;
}

// 清除消息
function clearMessage(elementId) {
    document.getElementById(elementId).innerHTML = '';
}

// 页面加载完成后绑定事件
document.addEventListener('DOMContentLoaded', () => {
    // 查询按钮事件
    document.getElementById('queryBtn').addEventListener('click', async () => {
        const roomId = document.getElementById('roomId').value.trim();
        if (!roomId) return alert('请输入房间号');

        // 重置所有区域
        document.getElementById('roomInfo').innerHTML = '';
        document.getElementById('streamResult').innerHTML = '';
        clearMessage('imageMessage');
        destroyPlayer();
        document.getElementById('screenshotArea').innerHTML = '';
        document.getElementById('downloadCoverBtn').disabled = true;
        document.getElementById('downloadScreenshotBtn').disabled = true;
        
        // 显示加载状态
        document.getElementById('loading').classList.remove('is-hidden');
        currentRoomId = roomId;

        try {
            // 并行请求两个接口
            const [streamResponse, imageResponse] = await Promise.all([
                fetch('/api/getStreamUrls', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId })
                }),
                fetch('/api/bilibili-live-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ room_id: roomId })
                })
            ]);

            // 解析直播流数据
            const streamData = await streamResponse.json();
            // 解析封面截图数据
            const imageData = await imageResponse.json();

            // 处理房间基本信息
            if (!streamData.error && streamData.room_info) {
                const room_info = streamData.room_info;
                let statusClass = 'status-off';
                if (room_info.is_live) statusClass = 'status-live';
                else if (room_info.live_status === 2) statusClass = 'status-replay';

                document.getElementById('roomInfo').innerHTML = `
                    <div class="room-header">
                        <img src="${room_info.cover || 'https://i0.hdslb.com/bfs/live/new_room_cover/default.jpg'}" 
                             class="room-cover" alt="封面">
                        <div>
                            <h4 class="title is-4">${room_info.title}</h4>
                            <p><strong>主播：</strong>${room_info.uname}</p>
                            <p><strong>状态：</strong><span class="${statusClass}">${room_info.status_text}</span></p>
                            <img src="${room_info.face || 'https://i0.hdslb.com/bfs/face/member/noface.jpg'}" 
                                 class="avatar" alt="头像">
                        </div>
                    </div>
                `;
            }

            // 处理直播流信息
            if (streamData.error) {
                showMessage('streamResult', streamData.message, true);
            } else {
                const { room_info, streams } = streamData;
                
                if (!room_info.is_live) {
                    showMessage('streamResult', '当前未直播，无法获取流地址', false);
                } else {
                    let html = '<div class="box"><h5 class="title is-5">可用流地址</h5>';
                    const formats = [
                        { key: 'flv', name: 'FLV', lib: 'flv.js' },
                        { key: 'fmp4', name: 'FMP4 (HLS)', lib: 'hls.js' },
                        { key: 'ts', name: 'HLS (TS)', lib: 'hls.js' }
                    ];

                    formats.forEach(fmt => {
                        const stream = streams[fmt.key];
                        if (stream) {
                            html += `
                                <p><strong>${fmt.name}</strong>（${stream.label}）
                                    <button class="button is-small copy-btn" onclick="copyToClipboard('${stream.url}')">复制</button>
                                    <button class="button is-small is-success play-btn" 
                                        onclick="play${fmt.lib === 'flv.js' ? 'FLV' : 'HLS'}('${stream.url}')">
                                        播放
                                    </button>
                                </p>
                                <div class="stream-url">${stream.url}</div><hr>
                            `;
                        } else {
                            html += `<p><strong>${fmt.name}</strong>：不可用</p><hr>`;
                        }
                    });

                    html += '</div>';
                    document.getElementById('streamResult').innerHTML = html;
                    
                    // 添加截图按钮
                    document.getElementById('screenshotArea').innerHTML = `
                        <button class="button is-info screenshot-btn" onclick="takeScreenshot()">📸 截图当前画面</button>
                        <small class="has-text-grey">（需先播放视频）</small>
                    `;
                }
            }

            // 处理封面和截图信息
            if (imageData.code !== 0) {
                showMessage('imageMessage', `获取封面截图失败: ${imageData.message || '未知错误'}`, true);
            } else {
                const liveInfo = imageData.data;
                currentCoverUrl = liveInfo.user_cover || '';
                currentScreenshotUrl = liveInfo.keyframe || '';
                
                // 更新信息显示
                document.getElementById('titleDisplay').textContent = liveInfo.title || `直播间${roomId}`;
                document.getElementById('unameDisplay').textContent = liveInfo.uname || '未知主播';
                document.getElementById('liveTimeDisplay').textContent = liveInfo.live_time || '未开播';
                
                // 更新状态显示
                let statusText = '';
                let statusClass = '';
                switch(liveInfo.live_status || 0) {
                    case 1:
                        statusText = '直播中';
                        statusClass = 'live';
                        break;
                    case 2:
                        statusText = '轮播中';
                        statusClass = 'round';
                        break;
                    default:
                        statusText = '未开播';
                        statusClass = 'offline';
                }
                document.getElementById('statusDisplay').textContent = statusText;
                document.getElementById('statusIndicator').className = `status-indicator ${statusClass}`;
                
                // 处理封面图片
                if (currentCoverUrl) {
                    const coverImg = document.getElementById('coverImage');
                    coverImg.onload = function() {
                        document.getElementById('coverImageInfo').textContent = 
                            `封面尺寸: ${this.naturalWidth} × ${this.naturalHeight} 像素`;
                    };
                    coverImg.onerror = function() {
                        document.getElementById('coverImageInfo').textContent = '封面图片加载失败';
                    };
                    coverImg.src = `/api/image-proxy?url=${encodeURIComponent(currentCoverUrl)}`;
                    
                    // 启用下载按钮
                    document.getElementById('downloadCoverBtn').disabled = false;
                    document.getElementById('downloadCoverBtn').onclick = () => {
                        window.open(`/api/download-cover?url=${encodeURIComponent(currentCoverUrl)}&roomId=${roomId}`, '_blank');
                        showMessage('imageMessage', `封面图片正在下载: 封面_${roomId}.jpg`);
                    };
                } else {
                    document.getElementById('coverImageInfo').textContent = '未找到封面图片';
                }
                
                // 处理截图
                if (currentScreenshotUrl) {
                    const screenshotImg = document.getElementById('screenshotImage');
                    screenshotImg.onload = function() {
                        document.getElementById('screenshotImageInfo').textContent = 
                            `截图尺寸: ${this.naturalWidth} × ${this.naturalHeight} 像素`;
                    };
                    screenshotImg.onerror = function() {
                        document.getElementById('screenshotImageInfo').textContent = '截图加载失败，可能直播间未开播';
                    };
                    screenshotImg.src = `/api/image-proxy?url=${encodeURIComponent(currentScreenshotUrl)}`;
                    
                    // 启用下载按钮
                    document.getElementById('downloadScreenshotBtn').disabled = false;
                    document.getElementById('downloadScreenshotBtn').onclick = () => {
                        window.open(`/api/download-screenshot?url=${encodeURIComponent(currentScreenshotUrl)}&roomId=${roomId}`, '_blank');
                        showMessage('imageMessage', `直播截图正在下载: 截图_${roomId}.jpg`);
                    };
                } else {
                    document.getElementById('screenshotImageInfo').textContent = '未找到直播截图，可能直播间未开播';
                }
            }

        } catch (err) {
            showMessage('streamResult', `请求失败：${err.message || '未知错误'}`, true);
            showMessage('imageMessage', `请求失败：${err.message || '未知错误'}`, true);
        } finally {
            document.getElementById('loading').classList.add('is-hidden');
        }
    });

    // 回车查询
    document.getElementById('roomId').addEventListener('keypress', e => {
        if (e.key === 'Enter') document.getElementById('queryBtn').click();
    });
});