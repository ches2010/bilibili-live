import { Utils } from './utils.js';
import { ApiService } from './api.js';
import * as Player from './player.js';

// 将模块暴露到全局，供HTML中的onclick调用
window.utils = Utils;
window.player = Player;
window.api = ApiService;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 查询按钮事件
    document.getElementById('queryBtn').addEventListener('click', async () => {
        const roomId = document.getElementById('roomId').value.trim();
        if (!roomId) return alert('请输入房间号');

        // 重置所有区域
        Utils.resetRegions();
        Player.destroyPlayer();
        document.getElementById('screenshotArea').innerHTML = '';
        document.getElementById('downloadCoverBtn').disabled = true;
        document.getElementById('downloadScreenshotBtn').disabled = true;
        
        // 调用API服务获取并渲染数据
        await ApiService.fetchLiveData(roomId);
    });

    // 回车查询
    document.getElementById('roomId').addEventListener('keypress', e => {
        if (e.key === 'Enter') {
            document.getElementById('queryBtn').click();
        }
    });
});