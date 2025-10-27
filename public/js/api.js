import { Utils } from './utils.js';
import { destroyPlayer, setCurrentRoomId } from './player.js';

// API模块 - 处理后端请求与数据渲染
export const ApiService = {
    // 并行请求直播流和封面信息
    async fetchLiveData(roomId) {
        try {
            // 显示加载状态
            document.getElementById('loading').classList.remove('is-hidden');
            setCurrentRoomId(roomId);

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

            // 解析响应数据
            const streamData = await streamResponse.json();
            const imageData = await imageResponse.json();

            // 处理房间基本信息
            this.renderRoomInfo(streamData);
            
            // 处理直播流信息
            this.renderStreamInfo(streamData);
            
            // 处理封面和截图信息
            this.renderImageInfo(imageData, roomId);

        } catch (err) {
            Utils.showMessage('streamResult', `请求失败：${err.message || '未知错误'}`, true);
            Utils.showMessage('imageMessage', `请求失败：${err.message || '未知错误'}`, true);
        } finally {
            document.getElementById('loading').classList.add('is-hidden');
        }
    },

    // 渲染房间基本信息
    renderRoomInfo(streamData) {
        if (streamData.error || !streamData.room_info) return;

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
    },

    // 渲染直播流信息
    renderStreamInfo(streamData) {
        if (streamData.error) {
            Utils.showMessage('streamResult', streamData.message, true);
            return;
        }

        const { room_info, streams } = streamData;
        
        if (!room_info.is_live) {
            Utils.showMessage('streamResult', '当前未直播，无法获取流地址', false);
            return;
        }

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
                        <button class="button is-small copy-btn" 
                            onclick="window.utils.copyToClipboard('${stream.url}')">复制</button>
                        <button class="button is-small is-success play-btn" 
                            onclick="window.player.play${fmt.lib === 'flv.js' ? 'FLV' : 'HLS'}('${stream.url}')">
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
            <button class="button is-info screenshot-btn" onclick="window.player.takeScreenshot()">📸 截图当前画面</button>
            <small class="has-text-grey">（需先播放视频）</small>
        `;
    },

    // 渲染封面和截图信息
    renderImageInfo(imageData, roomId) {
        if (imageData.code !== 0) {
            Utils.showMessage('imageMessage', `获取封面截图失败: ${imageData.message || '未知错误'}`, true);
            return;
        }

        const liveInfo = imageData.data;
        let currentCoverUrl = liveInfo.user_cover || '';
        let currentScreenshotUrl = liveInfo.keyframe || '';
        
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
                Utils.showMessage('imageMessage', `封面图片正在下载: 封面_${roomId}.jpg`);
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
                Utils.showMessage('imageMessage', `直播截图正在下载: 截图_${roomId}.jpg`);
            };
        } else {
            document.getElementById('screenshotImageInfo').textContent = '未找到直播截图，可能直播间未开播';
        }
    }
};