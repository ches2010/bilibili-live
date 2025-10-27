const express = require('express');
const router = express.Router();
const { getAllStreamUrls, verifyRoom } = require('../services/streamService');

/**
 * 获取直播流地址接口
 * POST /api/getStreamUrls
 */
router.post('/getStreamUrls', async (req, res) => {
    try {
        const { roomId } = req.body;
        if (!roomId || !/^\d+$/.test(roomId)) {
            return res.status(400).json({
                error: true,
                message: "请输入有效的直播间号码"
            });
        }

        // 验证房间并获取基本信息
        const { room_info } = await verifyRoom(roomId);

        // 如果未直播，不获取流地址
        if (!room_info.is_live) {
            return res.json({
                error: false,
                room_info,
                streams: null
            });
        }

        // 获取流地址
        const streams = await getAllStreamUrls(roomId);
        const streamResult = {};
        for (const key of ["flv", "fmp4", "ts"]) {
            streamResult[key] = streams[key] 
                ? { label: streams[key].label, url: streams[key].url }
                : null;
        }

        return res.json({
            error: false,
            room_info,
            streams: streamResult
        });

    } catch (error) {
        return res.status(500).json({
            error: true,
            message: `获取失败: ${error.message}`
        });
    }
});

module.exports = router;