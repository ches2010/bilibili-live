const axios = require('axios');
const sharp = require('sharp');
const { LIVE_INFO_API, HEADERS } = require('../config');

/**
 * 获取直播封面和截图信息
 * @param {string} roomId - 直播间ID
 * @returns {Object} 包含封面和截图的信息
 */
async function getLiveInfo(roomId) {
    try {
        const response = await axios.get(LIVE_INFO_API, {
            params: { room_id: roomId },
            headers: HEADERS,
            timeout: 10000
        });

        if (response.data.code !== 0) {
            return {
                code: response.data.code,
                message: response.data.message || '未知错误',
                data: {}
            };
        }

        const liveInfo = response.data.data;
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
                live_time: liveInfo.live_time || ''
            }
        };
    } catch (error) {
        return {
            code: -1,
            message: `请求错误: ${error.message}`,
            data: {}
        };
    }
}

/**
 * 代理图片请求（处理跨域和图片优化）
 * @param {string} url - 图片URL
 * @returns {Promise<Buffer>} 处理后的图片Buffer
 */
async function proxyImage(url) {
    try {
        const response = await axios.get(url, {
            headers: HEADERS,
            responseType: 'arraybuffer',
            timeout: 10000
        });

        // 使用sharp处理图片（保持原格式）
        return await sharp(response.data).toBuffer();
    } catch (error) {
        throw new Error(`图片代理失败: ${error.message}`);
    }
}

/**
 * 下载图片（用于封面和截图下载）
 * @param {string} url - 图片URL
 * @returns {Promise<Object>} 包含图片Buffer和ContentType的对象
 */
async function downloadImage(url) {
    try {
        const response = await axios.get(url, {
            headers: HEADERS,
            responseType: 'arraybuffer',
            timeout: 10000
        });

        return {
            buffer: response.data,
            contentType: response.headers['content-type'] || 'image/jpeg'
        };
    } catch (error) {
        throw new Error(`图片下载失败: ${error.message}`);
    }
}

module.exports = {
    getLiveInfo,
    proxyImage,
    downloadImage
};