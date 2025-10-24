const axios = require('axios');
const sharp = require('sharp');
const { COMMON_HEADERS } = require('../utils/config');
const { validateUrl } = require('../utils/validators');

/**
 * 图片代理API：解决防盗链
 */
async function imageProxy(req, res) {
  try {
    const { url } = req.query;
    if (!validateUrl(url)) {
      return res.status(400).send('无效的URL参数');
    }

    const res = await axios.get(url, {
      headers: { ...COMMON_HEADERS, Accept: 'image/webp,image/apng,image/*,*/*;q=0.8' },
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const metadata = await sharp(res.data).metadata();
    const imgBuffer = await sharp(res.data).toBuffer();

    res.setHeader('Content-Type', metadata.format ? `image/${metadata.format}` : 'image/jpeg');
    res.send(imgBuffer);
  } catch (err) {
    res.status(500).send(`图片代理失败：${err.message}`);
  }
}

/**
 * 直播流代理API：流式转发
 */
async function streamProxy(req, res) {
  try {
    const { url } = req.query;
    if (!validateUrl(url)) {
      return res.status(400).send('无效的URL参数');
    }

    const streamRes = await axios.get(url, {
      headers: {
        ...COMMON_HEADERS,
        Origin: 'https://live.bilibili.com',
        'Accept-Encoding': 'identity',
        Connection: 'keep-alive'
      },
      responseType: 'stream',
      timeout: 10000
    });

    // 设置跨域与流响应头
    res.set({
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true',
      'Content-Type': streamRes.headers['content-type'] || 'application/octet-stream'
    });

    // 流式转发
    streamRes.data.pipe(res);

    // 处理客户端断开
    req.on('close', () => streamRes.data.destroy());
  } catch (err) {
    res.status(502).send(`流代理失败：${err.message}`);
  }
}

module.exports = { imageProxy, streamProxy };
