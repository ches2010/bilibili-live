const express = require('express');
const path = require('path');
const { getLiveInfo } = require('./api/liveInfo');
const { imageProxy, streamProxy } = require('./api/proxy');
const { downloadCover, downloadScreenshot } = require('./api/download');
const { handleGetStreamUrls } = require('./api/streamUrls');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../client')));

// 忽略SSL验证（开发环境用）
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 原有API（ches2010方案）
app.post('/api/bilibili-live-info', getLiveInfo);
app.get('/api/image-proxy', imageProxy);
app.get('/api/stream-proxy', streamProxy);
app.get('/api/download-cover', downloadCover);
app.get('/api/download-screenshot', downloadScreenshot);

// 新增流地址接口（文件夹方案）
app.get('/api/stream-urls', handleGetStreamUrls);

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务运行在 http://localhost:${PORT}`);
});
