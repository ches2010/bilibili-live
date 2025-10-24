const axios = require('axios');
const { COMMON_HEADERS } = require('../utils/config');
const { validateUrl } = require('../utils/validators');

// 图片代理
async function imageProxy(req, res) {
  try {
    const { url } = req.query;
    if (!validateUrl(url)) {
      return res.status(400).send('无效的图片URL');
    }

    const imgRes = await axios.get(url, {
      headers: COMMON_HEADERS,
      responseType: 'arraybuffer',
      timeout: 5000
    });

    res.set('Content-Type', imgRes.headers['content-type']);
    res.send(imgRes.data);
  } catch (err) {
    res.status(500).send(`图片代理失败: ${err.message}`);
  }
}

// 流代理
async function streamProxy(req, res) {
  try {
    const { url } = req.query;
    if (!validateUrl(url)) {
      return res.status(400).send('无效的流URL');
    }

    const streamRes = await axios.get(url, {
      headers: {
        ...COMMON_HEADERS,
        'Origin': 'https://live.bilibili.com',
        'Accept-Encoding': 'identity', // 禁止压缩，避免解析问题
        'Connection': 'keep-alive'
      },
      responseType: 'stream', // 关键：确保以流形式接收
      timeout: 10000
    });

    // 复制响应头（排除可能冲突的头）
    const headers = {
      'Content-Type': streamRes.headers['content-type'] || 'application/octet-stream',
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Credentials': 'true'
    };
    res.set(headers);

    // 流式转发
    streamRes.data.pipe(res);

    // 处理客户端断开连接
    req.on('close', () => {
      streamRes.data.destroy();
      res.end();
    });

  } catch (err) {
    console.error('流代理错误:', err); // 打印详细错误
    res.status(500).send(`流代理失败: ${err.message}`);
  }
}

module.exports = { imageProxy, streamProxy };
