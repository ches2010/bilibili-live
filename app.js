const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// 中间件配置
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 配置请求头模拟浏览器
const requestHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Referer': 'https://www.bilibili.com/'
};

// 直播信息接口
app.get('/api/live/info', async (req, res) => {
  const { roomId } = req.query;
  if (!roomId || isNaN(roomId)) {
    return res.json({ error: '请输入有效的直播间号' });
  }

  try {
    const response = await axios.get(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomId}`, {
      headers: requestHeaders
    });
    
    if (response.data.code !== 0) {
      return res.json({ error: '获取直播信息失败' });
    }

    // 获取直播流地址
    const playUrlResp = await axios.get(`https://api.live.bilibili.com/room/v1/Room/playUrl?cid=${response.data.data.cid}&quality=0&platform=web`, {
      headers: requestHeaders
    });

    res.json({
      type: 'live',
      info: response.data.data,
      playUrls: playUrlResp.data.data ? playUrlResp.data.data.durl : []
    });
  } catch (error) {
    res.json({ error: '获取信息失败: ' + error.message });
  }
});

// 视频信息接口(BV号)
app.get('/api/video/info', async (req, res) => {
  const { bvId } = req.query;
  if (!bvId || !/^BV[0-9A-Za-z]+$/.test(bvId)) {
    return res.json({ error: '请输入有效的BV号' });
  }

  try {
    // 获取视频基本信息
    const viewResponse = await axios.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvId}`, {
      headers: requestHeaders
    });
    
    if (viewResponse.data.code !== 0) {
      return res.json({ error: '获取视频信息失败' });
    }

    const videoData = viewResponse.data.data;
    
    // 获取视频播放地址
    const playInfoResponse = await axios.get(`https://api.bilibili.com/x/player/playurl?bvid=${bvId}&cid=${videoData.cid}&qn=80`, {
      headers: requestHeaders
    });

    res.json({
      type: 'video',
      info: videoData,
      playUrls: playInfoResponse.data.data ? playInfoResponse.data.data.durl : []
    });
  } catch (error) {
    res.json({ error: '获取信息失败: ' + error.message });
  }
});

// 截图处理接口
app.get('/api/screenshot', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('缺少图片URL');

  try {
    const response = await axios.get(url, { 
      responseType: 'arraybuffer',
      headers: requestHeaders
    });
    
    const image = await sharp(response.data)
      .resize(800, null, { fit: 'inside' })
      .toBuffer();
      
    res.set('Content-Type', 'image/jpeg');
    res.send(image);
  } catch (error) {
    res.status(500).send('截图处理失败: ' + error.message);
  }
});

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 启动服务器
app.listen(port, () => {
  console.log(`B站工具集运行在 http://localhost:${port}`);
});