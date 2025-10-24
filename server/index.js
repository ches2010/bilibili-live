const express = require('express');
const path = require('path');
const { getLiveInfo } = require('./api/liveInfo');
const { imageProxy, streamProxy } = require('./api/proxy');
const { downloadCover, downloadScreenshot } = require('./api/download');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 忽略SSL证书验证
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 静态文件托管（前端页面）
app.use(express.static(path.join(__dirname, '../client')));

// API路由映射
app.post('/api/bilibili-live-info', getLiveInfo);
app.get('/api/image-proxy', imageProxy);
app.get('/api/stream-proxy', streamProxy);
app.get('/api/download-cover', downloadCover);
app.get('/api/download-screenshot', downloadScreenshot);

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
