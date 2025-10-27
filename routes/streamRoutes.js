const express = require('express');
const router = express.Router();
const { getAllStreamUrls, verifyRoom } = require('../services/streamService');

/**
 * 获取直播流地址接口
 * POST /api/getStreamUrls
 */
router.get('/proxy-stream', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url || !url.includes('bilibili.com')) {
            return res.status(400).send('无效的流地址');
        }

        // 转发请求时添加完整头信息
        const response = await axios.get(url, {
            headers: {
                "User-Agent": HEADERS["User-Agent"],
                "Referer": "https://live.bilibili.com/",
                "Origin": "https://live.bilibili.com",
                "Accept": "*/*",
                "Range": req.headers.range || "bytes=0-"
            },
            responseType: 'stream',
            timeout: 10000
        });

        // 转发响应头
        res.set({
            'Content-Type': response.headers['content-type'],
            'Content-Length': response.headers['content-length'],
            'Accept-Ranges': response.headers['accept-ranges'] || 'bytes'
        });

        // 转发流数据
        response.data.pipe(res);
    } catch (error) {
        console.error('流代理失败:', error.message);
        res.status(500).send(`流代理失败: ${error.message}`);
    }
});

module.exports = router;