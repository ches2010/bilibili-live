// 工具模块 - 提供通用功能
export const Utils = {
    // 复制到剪贴板
    copyToClipboard: function(text) {
        navigator.clipboard.writeText(text)
            .then(() => alert('已复制！'))
            .catch(() => alert('复制失败'));
    },

    // 显示消息提示
    showMessage: function(elementId, message, isError = false) {
        const container = document.getElementById(elementId);
        if (!container) return;
        
        container.innerHTML = `
            <div class="${isError ? 'notification is-danger' : 'notification is-success'}">
                ${message}
            </div>
        `;
    },

    // 清除消息提示
    clearMessage: function(elementId) {
        const container = document.getElementById(elementId);
        if (container) container.innerHTML = '';
    },

    // 重置页面区域
    resetRegions: function() {
        document.getElementById('roomInfo').innerHTML = '';
        document.getElementById('streamResult').innerHTML = '';
        this.clearMessage('imageMessage');
    }
};