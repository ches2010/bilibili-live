// 播放器模块 - 处理FLV/HLS播放、截图等功能
export let currentPlayer = null;
export let currentVideo = null;
export let currentRoomId = null;

// 销毁播放器
export function destroyPlayer() {
    if (currentPlayer) {
        if (typeof currentPlayer.destroy === 'function') {
            currentPlayer.destroy();
        }
        currentPlayer = null;
    }
    currentVideo = null;
    document.getElementById('playerArea').innerHTML = '';
}

// 播放FLV流
export function playFLV(url) {
    // 使用后端代理地址（关键！）
    const proxyUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}`;
    
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
        // 使用代理后的URL
        const player = flvjs.createPlayer({ type: 'flv', url: proxyUrl });
        player.attachMediaElement(video);
        player.load();
        player.play().catch(e => console.warn('播放被阻止:', e));
        currentPlayer = player;
    } else {
        alert('浏览器不支持 FLV');
    }
}

// 播放HLS流（优化版，解决之前的XMLHttpRequest错误）
export function playHLS(url) {
    const proxyUrl = `/api/proxy-stream?url=${encodeURIComponent(url)}`;
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
        // 显式配置加载器，避免responseType冲突
        const hls = new Hls({
            loader: {
                xhrSetup: function(xhr) {
                    xhr.responseType = 'arraybuffer';
                }
            }
        });
        
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(e => console.warn('播放被阻止:', e));
        });
        
        // 错误处理
        hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS错误:', data);
            if (data.fatal) {
                switch(data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        hls.recoverMediaError();
                        break;
                    default:
                        destroyPlayer();
                        break;
                }
            }
        });
        
        currentPlayer = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener('loadedmetadata', () => {
            video.play().catch(e => console.warn('播放被阻止:', e));
        });
        currentPlayer = { destroy: () => video.src = '' };
    } else {
        alert('浏览器不支持 HLS');
    }
}

// 视频截图
export function takeScreenshot() {
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

// 设置当前房间ID（供外部调用）
export function setCurrentRoomId(roomId) {
    currentRoomId = roomId;
}