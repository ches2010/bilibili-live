const axios = require('axios');
const { ROOM_INIT_API, PLAY_INFO_API, HEADERS, QN_MAP } = require('../config');

/**
 * 获取直播流地址
 * @param {string} roomId - 直播间ID
 * @returns {Object} 包含多种格式的流地址
 */
async function getAllStreamUrls(roomId) {
    try {
        const params = {
            "room_id": roomId,
            "protocol": "0,1",
            "format": "0,1,2",
            "codec": "0,1",
            "qn": 10000
        };

        // 添加更完整的请求头，模拟真实浏览器
        const headers = {
            ...HEADERS,
            "Origin": "https://live.bilibili.com",  // 关键：添加Origin头
            "Accept": "*/*",
            "Connection": "keep-alive",
            "Range": "bytes=0-"  // 部分流需要Range头
        };

        const response = await axios.get(PLAY_INFO_API, { 
            params, 
            headers,  // 使用新的headers
            timeout: 10000
        });
        
        if (response.data.code !== 0) {
            throw new Error(`API 错误: ${response.data.message}`);
        }

        const streams = response.data.data.playurl_info.playurl.stream;
        const results = { flv: null, fmp4: null, ts: null };

        for (const stream of streams) {
            for (const fmt of stream.format) {
                const fmtName = fmt.format_name;
                if (!results.hasOwnProperty(fmtName)) continue;
                
                for (const codec of fmt.codec) {
                    if (codec.codec_name !== "avc") continue; // 优先 H.264
                    
                    const currentQn = codec.current_qn;
                    const baseUrl = codec.base_url;
                    const urlInfo = codec.url_info[0];
                    const fullUrl = urlInfo.host + baseUrl + urlInfo.extra;
                    const qnLabel = QN_MAP[currentQn] || `QN${currentQn}`;
                    
                    results[fmtName] = {
                        qn: currentQn,
                        label: qnLabel,
                        url: fullUrl
                    };
                    break;
                }
            }
        }
        return results;
    } catch (error) {
        throw new Error(`获取流地址失败: ${error.message}`);
    }
}

/**
 * 验证房间号并获取基本信息
 * @param {string} roomId - 直播间ID
 * @returns {Object} 房间基本信息
 */
async function verifyRoom(roomId) {
    try {
        const initResponse = await axios.get(ROOM_INIT_API, {
            params: { id: roomId },
            headers: HEADERS,
            timeout: 10000
        });

        if (initResponse.data.code !== 0) {
            throw new Error(initResponse.data.msg || '房间信息获取失败');
        }

        const roomData = initResponse.data.data;
        const liveStatus = roomData.live_status;
        const statusText = { 0: "未开播", 1: "直播中", 2: "轮播中" }[liveStatus] || "未知";
        const isLive = liveStatus === 1;

        return {
            room_info: {
                room_id: roomId,
                title: roomData.title || "未知标题",
                cover: roomData.cover || "",
                face: roomData.face || "",
                uname: roomData.uname || "未知主播",
                live_status: liveStatus,
                status_text: statusText,
                is_live: isLive
            }
        };
    } catch (error) {
        throw new Error(`房间验证失败: ${error.message}`);
    }
}

module.exports = {
    getAllStreamUrls,
    verifyRoom
};