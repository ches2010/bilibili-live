const express = require('express');
const axios = require('axios');
const cors = require('cors');
const sharp = require('sharp');
const { createServer } = require('http');
const { Readable } = require('stream');
const path = require('path'); // 用于处理文件路径

// 初始化 Express 应用
const app = express();
const server = createServer(app);
const PORT = 5000;

// 中间件配置
app.use(cors({ origin: true, credentials: true })); // 允许跨域
app.use(express.json()); // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true }));

// 关键：托管前端静态文件（指向 client 目录，让后端能访问前端 HTML）
app.use(express.static(path.join(__dirname, '../client')));

// 忽略 SSL 证书验证（同原逻辑）
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// B站 API 常量
const LIVE_INFO_API = "https://api.live.bilibili.com/room/v1/Room/get_info";
const LIVE_STREAM_API = "https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo";

// 通用请求头（伪装浏览器，解决防盗链）
const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
  'Referer': 'https://live.bilibili.com/',
  'Cookie': 'SESSDATA=bf30894e%2C1776504713%2C093c5%2Aa1CjCDJlHXAwea0my36SkB54MSg4ysPQoi7qOI7UP_3GQ9c9S9H_OvtylHqxab3oOzPUgSVjNwenl4ekMxSHBmbm9oNWhpaC1Hb1V3elFfd1dpbHYyMHpKSUk0bG9qMk1aLUhwTjE5RlI4QkhLMm1hOFZMaG5falNLdlRHNlFvX2dTTUtXd2lKUC1BIIEC; bili_jct=71ddcaabfed5b6a95b490fdc9e716042'
};

/**
 * 1. 获取B站直播间基础信息 API
 * 接口地址：/api/bilibili-live-info（POST）
 */
async function getLiveInfo(roomId) {
  try {
    const infoRes = await axios.get(LIVE_INFO_API, {
      params: { room_id: roomId, platform: 'web' },
      headers: COMMON_HEADERS,
      timeout: 10000
    });

    if (infoRes.data.code !== 0) {
      return { code: infoRes.data.code, message: infoRes.data.message || '未知错误', data: {} };
    }

    const liveInfo = infoRes.data.data;
    const streamInfo = await getLiveStream(roomId);

    return {
      code: 0,
      message: 'success',
      data: {
        user_cover: liveInfo.cover || liveInfo.user_cover || '',
        keyframe: liveInfo.keyframe || '',
        title: liveInfo.title || '',
        uname: liveInfo.uname || '',
        room_id: liveInfo.room_id || roomId,
        live_status: liveInfo.live_status || 0,
        live_time: liveInfo.live_time || '',
        stream_url: streamInfo.stream_url,
        stream_urls: streamInfo.stream_urls,
        qn_desc: streamInfo.qn_desc
      }
    };
  } catch (error) {
    return { code: -1, message: `请求错误: ${error.message}`, data: {} };
  }
}

/**
 * 2. 解析直播流地址（内部方法，不对外暴露）
 */
async function getLiveStream(roomId) {
  try {
    const streamRes = await axios.get(LIVE_STREAM_API, {
      params: {
        room_id: roomId,
        protocol: '0,1',
        format: '0,1',
        codec: '0',
        qn: '10000',
        platform: 'web',
        ptype: '8'
      },
      headers: { ...COMMON_HEADERS, Origin: 'https://live.bilibili.com' },
      timeout: 10000
    });

    if (streamRes.data.code !== 0) {
      return { stream_url: '', stream_urls: [], qn_desc: {}, message: streamRes.data.message || '获取直播流失败' };
    }

    // 解析流地址逻辑（同原代码）
    const playurl = streamRes.data.data.playurl_info.playurl;
    const streams = playurl.stream || [];
    const streamUrls = [];

    for (const stream of streams) {
      const formats = stream.format || [];
      for (const fmt of formats) {
        const codecs = fmt.codec || [];
        for (const codec of codecs) {
          const baseUrl = codec.base_url || '';
          const urlInfos = codec.url_info || [];
          for (const info of urlInfos) {
            const fullUrl = `${info.host || ''}${baseUrl}${info.extra || ''}`;
            if (fullUrl.startsWith(('http://', 'https://')) && !streamUrls.includes(fullUrl)) {
              streamUrls.push(fullUrl);
            }
          }
        }
      }
    }

    // 解析画质描述
    const qnDesc = {};
    const qnList = streamRes.data.data.quality_description || [];
    qnList.forEach(qn => { qnDesc[qn.qn] = qn.desc || ''; });

    return {
      stream_url: streamUrls[0] || '',
      stream_urls: streamUrls,
      qn_desc: qnDesc,
      message: streamUrls.length ? 'success' : '未找到有效流地址'
    };
  } catch (error) {
    return { stream_url: '', stream_urls: [], qn_desc: {}, message: `解析直播流失败: ${error.message}` };
  }
}

/**
 * 3. 图片代理 API（解决防盗链）
 * 接口地址：/api/image-proxy（GET）
 */
app.get('/api/image-proxy', async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).send('URL参数缺失');

    const imgRes = await axios.get(url, {
      headers: { ...COMMON_HEADERS, Accept: 'image/webp,image/apng,image/*,*/*;q=0.8' },
      responseType: 'arraybuffer', // 二进制流
      timeout: 10000
    });

    // 用 sharp 处理图片（替代原 PIL 逻辑）
    const imgMetadata = await sharp(imgRes.data).metadata();
    const imgBuffer = await sharp(imgRes.data).toBuffer();

    // 设置响应头并返回图片
    res.setHeader('Content-Type', imgMetadata.format ? `image/${imgMetadata.format}` : 'image/jpeg');
    res.send(imgBuffer);
  } catch (error) {
    res.status(500).send(`图片代理失败: ${error.message}`);
  }
});

/**
 * 4. 直播流代理 API（流式转发）
 * 接口地址：/api/stream-proxy（GET）
 */
app.get('/api/stream-proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).send('URL参数缺失');

  try {
    const streamRes = await axios.get(url, {
      headers: {
        ...COMMON_HEADERS,
        Origin: 'https://live.bilibili.com',
        'Accept-Encoding': 'identity',
        Connection: 'keep-alive',
        Pragma: 'no-cache',
        'Cache-Control': 'no-cache'
      },
      responseType: 'stream', // 流式响应
      timeout: 10000
    });

    // 设置跨域响应头
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', streamRes.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Accept-Ranges', streamRes.headers['accept-ranges'] || 'bytes');

    // 流式转发（避免内存占用过高）
    const readableStream = Readable.from(streamRes.data);
    readableStream.pipe(res);

    // 处理连接关闭
    req.on('close', () => {
      readableStream.destroy();
      streamRes.data.destroy();
    });
  } catch (error) {
    res.status(502).send(`流代理失败: ${error.message}`);
  }
});

/**
 * 5. 封面下载 API
 * 接口地址：/api/download-cover（GET）
 */
app.get('/api/download-cover', async (req, res) => {
  try {
    const { url, roomId = 'unknown' } = req.query;
    if (!url) return res.status(400).send('URL参数缺失');

    const imgRes = await axios.get(url, {
      headers: COMMON_HEADERS,
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const imgMetadata = await sharp(imgRes.data).metadata();
    const imgFormat = imgMetadata.format || 'jpg';
    const filename = `封面_${roomId}.${imgFormat}`;

    // 设置下载响应头
    res.setHeader('Content-Type', `image/${imgFormat}`);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(imgRes.data);
  } catch (error) {
    res.status(500).send(`封面下载失败: ${error.message}`);
  }
});

/**
 * 6. 截图下载 API
 * 接口地址：/api/download-screenshot（GET）
 */
app.get('/api/download-screenshot', async (req, res) => {
  try {
    const { url, roomId = 'unknown' } = req.query;
    if (!url) return res.status(400).send('URL参数缺失');

    const imgRes = await axios.get(url, {
      headers: COMMON_HEADERS,
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const imgMetadata = await sharp(imgRes.data).metadata();
    const imgFormat = imgMetadata.format || 'jpg';
    const filename = `截图_${roomId}.${imgFormat}`;

    // 设置下载响应头
    res.setHeader('Content-Type', `image/${imgFormat}`);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(imgRes.data);
  } catch (error) {
    res.status(500).send(`截图下载失败: ${error.message}`);
  }
});

/**
 * 7. 核心 API：获取直播信息（前端调用入口）
 * 接口地址：/api/bilibili-live-info（POST）
 */
app.post('/api/bilibili-live-info', async (req, res) => {
  try {
    const { room_id } = req.body;
    if (!room_id || !/^\d+$/.test(room_id)) {
      return res.status(400).json({
        code: -1,
        message: '房间ID必须是数字',
        data: {}
      });
    }

    const result = await getLiveInfo(room_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      code: -1,
      message: error.message,
      data: {}
    });
  }
});

// 启动服务
server.listen(PORT, () => {
  console.log(`服务已启动：http://localhost:${PORT}`);
  console.log(`前端页面：http://localhost:${PORT}/index.html`);
  console.log(`API地址：http://localhost:${PORT}/api/bilibili-live-info`);
});
