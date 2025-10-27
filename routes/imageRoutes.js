const express = require('express');
const router = express.Router();
const { getLiveInfo, proxyImage, downloadImage } = require('../services/imageService');

/**
 * 获取直播信息（封面、截图等）接口
 * POST /api/bilibili-live-info
 */
router.post('/bilibili-live-info', async (req, res) => {
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

/**
 * 图片代理接口
 * GET /api/image-proxy
 */
router.get('/image-proxy', async (req, res) => {
    try {
        const { url } = req.query;
        if (!url) {
            return res.status(400).send("URL参数缺失");
        }

        const imageBuffer = await proxyImage(url);
        // 自动识别图片类型（sharp处理后会保留原格式）
        res.set('Content-Type', await sharp(imageBuffer).metadata().then(meta => meta.format === 'png' ? 'image/png' : 'image/jpeg'));
        res.send(imageBuffer);
    } catch (error) {
        res.status(500).send(`图片代理错误: ${error.message}`);
    }
});

/**
 * 下载封面接口
 * GET /api/download-cover
 */
router.get('/download-cover', async (req, res) => {
    try {
        const { url, roomId = 'unknown' } = req.query;
        if (!url) {
            return res.status(400).send("URL参数缺失");
        }

        const { buffer, contentType } = await downloadImage(url);
        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('gif')) ext = 'gif';

        const filename = `封面_${roomId}.${ext}`;
        
        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
        });
        
        res.send(buffer);
    } catch (error) {
        res.status(500).send(`下载失败: ${error.message}`);
    }
});

/**
 * 下载截图接口
 * GET /api/download-screenshot
 */
router.get('/download-screenshot', async (req, res) => {
    try {
        const { url, roomId = 'unknown' } = req.query;
        if (!url) {
            return res.status(400).send("URL参数缺失");
        }

        const { buffer, contentType } = await downloadImage(url);
        let ext = 'jpg';
        if (contentType.includes('png')) ext = 'png';
        else if (contentType.includes('gif')) ext = 'gif';

        const filename = `截图_${roomId}.${ext}`;
        
        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
        });
        
        res.send(buffer);
    } catch (error) {
        res.status(500).send(`下载失败: ${error.message}`);
    }
});

module.exports = router;