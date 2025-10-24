document.addEventListener('DOMContentLoaded', function() {
    // DOM元素获取
    const roomIdInput = document.getElementById('roomIdInput');
    const fetchBtn = document.getElementById('fetchBtn');
    const resultContainer = document.getElementById('resultContainer');
    const titleDisplay = document.getElementById('titleDisplay');
    const unameDisplay = document.getElementById('unameDisplay');
    const roomIdDisplay = document.getElementById('roomIdDisplay');
    const statusDisplay = document.getElementById('statusDisplay');
    const statusIndicator = document.getElementById('statusIndicator');
    const liveTimeDisplay = document.getElementById('liveTimeDisplay');
    const coverImage = document.getElementById('coverImage');
    const screenshotImage = document.getElementById('screenshotImage');
    const messageContainer = document.getElementById('messageContainer');
    const loadingDiv = document.getElementById('loading');
    const downloadCoverBtn = document.getElementById('downloadCoverBtn');
    const downloadScreenshotBtn = document.getElementById('downloadScreenshotBtn');
    const coverImageInfo = document.getElementById('coverImageInfo');
    const screenshotImageInfo = document.getElementById('screenshotImageInfo');
    const videoSection = document.getElementById('videoSection');
    const videoPlayer = document.getElementById('videoPlayer');
    const playBtn = document.getElementById('playBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const reloadBtn = document.getElementById('reloadBtn');
    const videoStatus = document.getElementById('videoStatus');
    const qualitySelect = document.getElementById('qualitySelect');
    const playPrompt = document.getElementById('playPrompt');
    
    // 全局变量
    let currentStreamUrl = '';
    let allStreamUrls = [];
    let currentRoomId = '';
    let flvPlayer = null;
    let dashPlayer = null;
    let streamRefreshTimer = null;
    
    // 销毁FLV播放器
    function destroyFlvPlayer() {
        if (flvPlayer) {
            if (flvPlayer.mediaElement) {
                flvPlayer.mediaElement.pause().catch(e => {
                    console.warn('暂停视频时的预期错误:', e);
                });
                flvPlayer.off(flvjs.Events.ERROR);
            }
            flvPlayer.destroy();
            flvPlayer = null;
        }
    }
    
    // 销毁DASH播放器
    function destroyDashPlayer() {
        if (dashPlayer) {
            dashPlayer.reset();
            dashPlayer = null;
        }
    }
    
    // 清除流刷新定时器
    function clearStreamRefreshTimer() {
        if (streamRefreshTimer) {
            clearInterval(streamRefreshTimer);
            streamRefreshTimer = null;
        }
    }
    
    // 验证房间ID
    function validateRoomId(roomId) {
        return /^\d+$/.test(roomId);
    }
    
    // 显示消息
    function showMessage(message, isError = false) {
        messageContainer.innerHTML = `
            <div class="${isError ? 'error' : 'success'}">
                ${message}
            </div>
        `;
    }
    
    // 隐藏消息
    function hideMessage() {
        messageContainer.innerHTML = '';
    }
    
    // 检测流格式
    async function detectStreamFormat(url) {
        // 优先通过URL特征判断
        if (url.includes('.m3u8') || url.includes('hls')) return 'hls';
        if (url.includes('.flv')) return 'flv';
        if (url.includes('.mp4')) return 'mp4';
        if (url.includes('.mpd') || url.includes('dash')) return 'dash';
        if (url.includes('.ts')) return 'hls';
        
        // URL无特征时发起HEAD请求
        try {
            const response = await fetch(`/api/stream-proxy?url=${encodeURIComponent(url)}`, {
                method: 'HEAD',
                headers: {
                    'Referer': 'https://live.bilibili.com/',
                    'Origin': 'https://live.bilibili.com'
                },
                timeout: 5000
            });
            
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('mpegurl') || contentType.includes('hls') || contentType.includes('application/x-mpegURL')) {
                return 'hls';
            } else if (contentType.includes('flv') || contentType.includes('video/x-flv')) {
                return 'flv';
            } else if (contentType.includes('mp4') || contentType.includes('video/mp4')) {
                return 'mp4';
            } else if (contentType.includes('mpd') || contentType.includes('dash') || contentType.includes('application/dash+xml')) {
                return 'dash';
            } else if (contentType.includes('ts') || contentType.includes('video/MP2T')) {
                return 'hls';
            }
        } catch (e) {
            console.warn('HEAD请求探测格式失败，使用URL特征 fallback:', e);
        }
        // 最终fallback到URL特征
        if (url.includes('live-bvc') && url.includes('.m3u8')) return 'hls';
        if (url.includes('live-bvc') && url.includes('.flv')) return 'flv';
        return 'unknown';
    }
    
    // 加载视频流（兼容多种格式）
    async function loadVideoStream(streamUrl) {
        destroyFlvPlayer();
        destroyDashPlayer();
        videoPlayer.src = '';
        playPrompt.style.display = 'none';
        
        if (!streamUrl) {
            videoStatus.textContent = '无可用直播流';
            return;
        }
        
        currentStreamUrl = streamUrl;
        videoStatus.textContent = '正在加载直播流...';
        
        // 使用代理解决跨域问题
        const proxyUrl = `/api/stream-proxy?url=${encodeURIComponent(streamUrl)}`;
        
        // 判断流类型
        const format = await detectStreamFormat(streamUrl);
        console.log('探测到流格式:', format, 'URL:', streamUrl);
        
        try {
            // 优先处理FLV格式
            if (format === 'flv') {
                if (window.flvjs && flvjs.isSupported()) {
                    flvPlayer = flvjs.createPlayer({
                        type: 'flv',
                        url: proxyUrl
                    }, {
                        enableWorker: true,
                        lazyLoadMaxDuration: 3 * 60,
                        autoCleanupSourceBuffer: true
                    });
                    
                    flvPlayer.attachMediaElement(videoPlayer);
                    flvPlayer.load();
                        
                    flvPlayer.on(flvjs.Events.MEDIA_INFO_LOAD_COMPLETE, () => {
                        videoStatus.textContent = 'FLV直播流已加载，点击播放';
                        playPrompt.style.display = 'block';
                    });
                        
                    flvPlayer.on(flvjs.Events.ERROR, (errType, errDetails) => {
                        console.error('FLV播放错误:', errType, errDetails);
                        videoStatus.textContent = `FLV错误: ${errDetails}，尝试切换线路`;
                        // 自动切换到HLS线路
                        const hlsUrl = allStreamUrls.find(url => url.includes('.m3u8'));
                        if (hlsUrl) setTimeout(() => loadVideoStream(hlsUrl), 2000);
                    });
                } else {
                    videoStatus.textContent = '浏览器不支持FLV播放，尝试HLS线路';
                    // 自动切换到HLS线路
                    const hlsUrl = allStreamUrls.find(url => url.includes('.m3u8'));
                    if (hlsUrl) loadVideoStream(hlsUrl);
                }
            }
            // 其次处理HLS格式
            else if (format === 'hls') {
                // 清除之前的事件监听
                videoPlayer.removeEventListener('loadedmetadata', handleLoadedMetadata);
                videoPlayer.removeEventListener('error', handleError);
                
                // 定义元数据加载成功的处理函数
                function handleLoadedMetadata() {
                    videoStatus.textContent = 'HLS直播流已加载，点击播放';
                    playPrompt.style.display = 'block';
                }

                // 定义错误处理函数
                function handleError() {
                    const error = videoPlayer.error;
                    console.error('HLS播放错误（错误码：' + error.code + '），尝试修复...');
        
                    const errorMap = {
                        1: '获取资源失败',
                        2: '网络错误',
                        3: '解码失败',
                        4: '格式不支持'
                    };
                    
                    videoStatus.textContent = `HLS错误: ${errorMap[error.code] || '未知错误'}，重试中...`;
            
                    // 错误码2（网络错误）优先切换FLV线路
                    if (error.code === 2) {
                        const flvUrl = allStreamUrls.find(url => url.includes('.flv'));
                         if (flvUrl) {
                             setTimeout(() => loadVideoStream(flvUrl), 1000);
                             return;
                         }
                    }
                    // 重试当前线路（最多3次）
                    let retryCount = 0;
                    const retryInterval = setInterval(() => {
                        if (retryCount >= 3) {
                            clearInterval(retryInterval);
                            // 重试失败则切换到下一条线路
                            const currentIndex = allStreamUrls.indexOf(currentStreamUrl);
                            const nextIndex = (currentIndex + 1) % allStreamUrls.length;
                            if (allStreamUrls[nextIndex]) {
                                loadVideoStream(allStreamUrls[nextIndex]);
                            }
                            return;
                        }
                        
                        videoStatus.textContent = `HLS错误: 第${retryCount + 1}次重试...`;
                        videoPlayer.src = proxyUrl;
                        videoPlayer.load();
                        retryCount++;
                    }, 2000);
                }
                // 绑定事件并加载视频
                videoPlayer.addEventListener('loadedmetadata', handleLoadedMetadata);
                videoPlayer.addEventListener('error', handleError);
                videoPlayer.src = proxyUrl;
                videoPlayer.type = 'application/x-mpegURL';
                videoPlayer.load();
            }
            // 处理MP4格式
            else if (format === 'mp4') {
                videoPlayer.src = proxyUrl;
                videoPlayer.type = 'video/mp4';
                videoPlayer.load();
                    
                videoPlayer.addEventListener('loadedmetadata', () => {
                    videoStatus.textContent = 'MP4直播流已加载，点击播放';
                    playPrompt.style.display = 'block';
                });
            }
            // 处理DASH格式
            else if (format === 'dash') {
                if (window.dashjs) {
                    videoPlayer.src = proxyUrl;
                    dashPlayer = dashjs.MediaPlayer().create();
                    dashPlayer.initialize(videoPlayer, proxyUrl, false);
                        
                    videoPlayer.addEventListener('loadedmetadata', () => {
                        videoStatus.textContent = 'DASH直播流已加载，点击播放';
                        playPrompt.style.display = 'block';
                    });
                } else {
                    videoStatus.textContent = 'DASH库加载失败，尝试其他线路';
                    // 自动切换到FLV/HLS线路
                    const fallbackUrl = allStreamUrls.find(url => url.includes('.flv')) ||
                                        allStreamUrls.find(url => url.includes('.m3u8'));
                    if (fallbackUrl) loadVideoStream(fallbackUrl);
                }
            }
            // 未知格式，尝试通用播放
            else {
                videoStatus.textContent = `尝试播放未知格式流...`;
                videoPlayer.src = proxyUrl;
                videoPlayer.removeAttribute('type');
                videoPlayer.load();
                    
                videoPlayer.addEventListener('loadedmetadata', () => {
                    videoStatus.textContent = '未知格式流已加载，点击播放';
                    playPrompt.style.display = 'block';
                });
                    
                videoPlayer.addEventListener('error', (e) => {
                    console.error('未知格式播放错误:', e);
                    videoStatus.textContent = `播放失败（错误码: ${e.target.error.code}）`;
                    // 自动切换到其他线路
                    const currentIndex = allStreamUrls.indexOf(currentStreamUrl);
                    const nextIndex = (currentIndex + 1) % allStreamUrls.length;
                    if (allStreamUrls[nextIndex]) {
                        setTimeout(() => loadVideoStream(allStreamUrls[nextIndex]), 2000);
                    }
                });
            }
        } catch (e) {
            console.error('加载直播流失败:', e);
            videoStatus.textContent = `加载失败: ${e.message}，尝试切换线路`;
            // 自动切换到下一条线路
            const currentIndex = allStreamUrls.indexOf(currentStreamUrl);
            const nextIndex = (currentIndex + 1) % allStreamUrls.length;
            if (allStreamUrls[nextIndex]) {
                setTimeout(() => loadVideoStream(allStreamUrls[nextIndex]), 2000);
            }
        }
    }
    
    // 定时刷新直播流（每5分钟）
    function startStreamRefresh(roomId) {
        clearStreamRefreshTimer();
        
        streamRefreshTimer = setInterval(async () => {
            try {
                const response = await fetch('/api/bilibili-live-info', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ room_id: roomId })
                });
                
                const data = await response.json();
                if (data.code === 0 && data.data.stream_url && data.data.stream_url !== currentStreamUrl) {
                    loadVideoStream(data.data.stream_url);
                    showMessage('直播流已自动刷新');
                }
            } catch (e) {
                console.warn('刷新直播流失败:', e);
            }
        }, 5 * 60 * 1000);
    }
    
    // 获取直播信息并显示
    async function getLiveInfo(roomId) {
        if (!validateRoomId(roomId)) {
            showMessage('错误：直播间ID必须是数字！', true);
            return;
        }
        
        try {
            loadingDiv.style.display = 'block';
            resultContainer.style.display = 'none';
            videoSection.style.display = 'block';
            hideMessage();
            destroyFlvPlayer();
            destroyDashPlayer();
            clearStreamRefreshTimer();
            
            const response = await fetch('/api/bilibili-live-info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ room_id: roomId })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP错误! 状态码: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.code !== 0) {
                throw new Error(`获取直播信息失败，错误码: ${data.code}, 错误信息: ${data.message || '未知错误'}`);
            }
            
            const liveInfo = data.data;
            const userCover = liveInfo.user_cover || '';
            const keyframe = liveInfo.keyframe || '';
            const title = liveInfo.title || `直播间${roomId}`;
            const uname = liveInfo.uname || '未知主播';
            const actualRoomId = liveInfo.room_id || roomId;
            const liveStatus = liveInfo.live_status || 0;
            const liveTime = liveInfo.live_time || '未开播';
            const streamUrl = liveInfo.stream_url || '';
            const streamUrls = liveInfo.stream_urls || [];
            const qnDesc = liveInfo.qn_desc || {};
            
            // 更新信息显示
            titleDisplay.textContent = title;
            unameDisplay.textContent = uname;
            roomIdDisplay.textContent = actualRoomId;
            
            // 设置直播状态
            let statusText = '';
            let statusClass = '';
            switch(liveStatus) {
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
            statusDisplay.textContent = statusText;
            statusIndicator.className = `status-indicator ${statusClass}`;
            liveTimeDisplay.textContent = liveTime;
            
            // 加载封面图片
            if (userCover) {
                coverImage.onload = function() {
                    coverImageInfo.textContent = `封面尺寸: ${this.naturalWidth} × ${this.naturalHeight} 像素`;
                };
                coverImage.onerror = function() {
                    coverImageInfo.textContent = '封面图片加载失败';
                };
                coverImage.src = `/api/image-proxy?url=${encodeURIComponent(userCover)}`;
                
                downloadCoverBtn.onclick = () => {
                    window.open(`/api/download-cover?url=${encodeURIComponent(userCover)}&roomId=${actualRoomId}`, '_blank');
                    showMessage(`封面图片正在下载: 封面_${actualRoomId}.jpg`);
                };
            } else {
                coverImageInfo.textContent = '未找到封面图片';
            }
            
            // 加载截图
            if (keyframe) {
                screenshotImage.onload = function() {
                    screenshotImageInfo.textContent = `截图尺寸: ${this.naturalWidth} × ${this.naturalHeight} 像素`;
                };
                screenshotImage.onerror = function() {
                    screenshotImageInfo.textContent = '截图加载失败';
                };
                screenshotImage.src = `/api/image-proxy?url=${encodeURIComponent(keyframe)}`;
                
                downloadScreenshotBtn.onclick = () => {
                    window.open(`/api/download-screenshot?url=${encodeURIComponent(keyframe)}&roomId=${actualRoomId}`, '_blank');
                    showMessage(`直播截图正在下载: 截图_${actualRoomId}.jpg`);
                };
            } else {
                screenshotImageInfo.textContent = '未找到直播截图';
            }
            
            resultContainer.style.display = 'block';
            
            // 处理直播流
            if (liveStatus === 1) {
                allStreamUrls = [...streamUrls];
                currentRoomId = actualRoomId;
                
                // 填充画质选择器
                qualitySelect.innerHTML = '<option value="">自动</option>';
                
                // 添加画质选项
                Object.keys(qnDesc).forEach((qn, index) => {
                    if (streamUrls[index]) {
                        const option = document.createElement('option');
                        option.value = streamUrls[index];
                        option.textContent = qnDesc[qn];
                        qualitySelect.appendChild(option);
                    }
                });
                
                // 添加线路选项
                streamUrls.forEach((url, index) => {
                    const option = document.createElement('option');
                    option.value = url;
                    option.textContent = `线路 ${index + 1}`;
                    qualitySelect.appendChild(option);
                });
                
                if (streamUrls.length > 0) {
                    loadVideoStream(streamUrl);
                    startStreamRefresh(actualRoomId);
                    showMessage('直播信息获取成功！点击播放按钮开始观看');
                } else {
                    videoStatus.textContent = '未获取到有效直播流地址';
                    showMessage('未获取到直播流地址', true);
                }
            } else {
                videoStatus.textContent = '直播间未处于直播状态';
                showMessage('直播间未开播，无法加载实时画面', true);
            }
            
        } catch (error) {
            console.error('获取直播信息错误:', error);
            showMessage(`发生错误: ${error.message}`, true);
            videoStatus.textContent = '获取直播信息失败';
        } finally {
            loadingDiv.style.display = 'none';
        }
    }
    
    // 绑定事件
    fetchBtn.addEventListener('click', () => {
        const roomId = roomIdInput.value.trim();
        if (!roomId) {
            showMessage('请输入直播间ID！', true);
            return;
        }
        getLiveInfo(roomId);
    });
    
    roomIdInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            fetchBtn.click();
        }
    });
    
    qualitySelect.addEventListener('change', () => {
        const selectedUrl = qualitySelect.value;
        if (selectedUrl) {
            loadVideoStream(selectedUrl);
        }
    });
    
    // 视频控制
    playBtn.addEventListener('click', () => {
        playPrompt.style.display = 'none';
        if (flvPlayer) {
            flvPlayer.play();
        } else if (dashPlayer) {
            videoPlayer.play();
        } else if (currentStreamUrl) {
            videoPlayer.play();
        } else {
            showMessage('没有可用的直播流', true);
        }
    });
    
    pauseBtn.addEventListener('click', () => {
        if (flvPlayer) {
            flvPlayer.pause();
        } else if (dashPlayer) {
            videoPlayer.pause();
        } else {
            videoPlayer.pause();
        }
    });
    
    reloadBtn.addEventListener('click', () => {
        if (currentStreamUrl) {
            loadVideoStream(currentStreamUrl);
        } else if (allStreamUrls.length > 0) {
            loadVideoStream(allStreamUrls[0]);
        } else {
            showMessage('没有可用的直播流', true);
        }
    });
    
    // 点击播放提示层
    playPrompt.addEventListener('click', () => {
        playBtn.click();
    });
    
    // 页面关闭时清理资源
    window.addEventListener('beforeunload', () => {
        destroyFlvPlayer();
        destroyDashPlayer();
        clearStreamRefreshTimer();
    });
});
