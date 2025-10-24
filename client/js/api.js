/**
 * 获取直播信息
 * @param {string} roomId - 直播间ID
 * @returns {Promise} 直播信息Promise
 */
async function getLiveInfo(roomId) {
  const response = await fetch('/api/bilibili-live-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_id: roomId })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP错误: ${response.status}`);
  }
  
  return response.json();
}

/**
 * 获取代理图片URL
 * @param {string} url - 原始图片URL
 * @returns {string} 代理后的URL
 */
function getProxyImageUrl(url) {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

/**
 * 获取下载链接
 * @param {string} url - 原始资源URL
 * @param {string} type - 类型（cover/screenshot）
 * @param {string} roomId - 直播间ID
 * @returns {string} 下载链接
 */
function getDownloadUrl(url, type, roomId) {
  const endpoint = type === 'cover' ? 'download-cover' : 'download-screenshot';
  return `/api/${endpoint}?url=${encodeURIComponent(url)}&roomId=${roomId}`;
}

export { getLiveInfo, getProxyImageUrl, getDownloadUrl };
