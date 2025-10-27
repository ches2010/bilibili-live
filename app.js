const express = require('express');
const streamRoutes = require('./routes/streamRoutes');
const imageRoutes = require('./routes/imageRoutes');
const { PORT } = require('./config');

// 初始化Express应用
const app = express();

// 中间件配置
app.use(express.static('public'));
app.use(express.json());

// 路由注册
app.use('/api', streamRoutes);   // 直播流相关路由
app.use('/api', imageRoutes);    // 图片相关路由

// 根路由
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});