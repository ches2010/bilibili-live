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
      headers: { ...COMMON_HEADERS, Origin: 'https://live.bilibili.com' },
      responseType: 'stream',
      timeout: 5000
    });

    res.set({
      'Content-Type': streamRes.headers['content-type'],
      'Access-Control-Allow-Origin': '*'
    });
    streamRes.data.pipe(res);
    req.on('close', () => streamRes.data.destroy());
  } catch (err) {
    res.status(500).send(`流代理失败: ${err.message}`);
  }
}

module.exports = { imageProxy, streamProxy };
