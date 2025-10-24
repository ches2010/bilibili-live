/**
 * 验证直播间ID是否为有效数字
 * @param {string} roomId - 直播间ID
 * @returns {boolean} 是否有效
 */
function validateRoomId(roomId) {
  return /^\d+$/.test(roomId);
}

/**
 * 验证URL参数是否存在
 * @param {string} url - 待验证的URL
 * @returns {boolean} 是否有效
 */
function validateUrl(url) {
  return !!url && (url.startsWith('http://') || url.startsWith('https://'));
}

module.exports = { validateRoomId, validateUrl };
