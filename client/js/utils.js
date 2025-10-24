/**
 * 显示消息提示
 * @param {string} message - 消息内容
 * @param {boolean} isError - 是否为错误消息
 */
function showMessage(message, isError = false) {
  const container = document.getElementById('messageContainer');
  container.innerHTML = `
    <div class="${isError ? 'error' : 'success'}">${message}</div>
  `;
}

/**
 * 隐藏消息提示
 */
function hideMessage() {
  document.getElementById('messageContainer').innerHTML = '';
}

/**
 * 验证直播间ID
 * @param {string} roomId - 直播间ID
 * @returns {boolean} 是否有效
 */
function validateRoomId(roomId) {
  return /^\d+$/.test(roomId);
}

/**
 * 启动直播流定时刷新
 * @param {string} roomId - 直播间ID
 * @param {object} state - 全局状态
 */
function startStreamRefresh(roomId, state) {
  clearInterval(state.streamRefreshTimer);
  state.streamRefreshTimer = setInterval(async () => {
    // 刷新逻辑见原代码...
  }, 5 * 60 * 1000);
}

export { showMessage, hideMessage, validateRoomId, startStreamRefresh };
