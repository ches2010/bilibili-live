from flask import Flask, request, jsonify, send_from_directory, send_file, render_template_string
import requests
import os
import io
from PIL import Image

app = Flask(__name__, static_folder='static')

# B站API地址
ROOM_INIT_API = "https://api.live.bilibili.com/room/v1/Room/room_init"
PLAY_INFO_API = "https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo"
LIVE_INFO_API = "https://api.live.bilibili.com/room/v1/Room/get_info"

# 请求头
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Referer": "https://live.bilibili.com/"
}

# 清晰度映射
QN_MAP = {
    30000: "杜比",
    20000: "4K",
    15000: "2K",
    10000: "原画",
    400: "蓝光 (1080P)",
    250: "超清 (720P)",
    150: "高清 (480P)",
    80: "流畅 (360P)"
}

# 直播流获取相关函数
def get_all_stream_urls(room_id):
    params = {
        "room_id": room_id,
        "protocol": "0,1",
        "format": "0,1,2",
        "codec": "0,1",
        "qn": 10000
    }
    resp = requests.get(PLAY_INFO_API, params=params, headers=HEADERS, timeout=10)
    data = resp.json()
    if data["code"] != 0:
        raise Exception(f"API 错误: {data['message']}")

    streams = data["data"]["playurl_info"]["playurl"]["stream"]
    results = {"flv": None, "fmp4": None, "ts": None}

    for stream in streams:
        for fmt in stream["format"]:
            fmt_name = fmt["format_name"]
            if fmt_name not in results:
                continue
            for codec in fmt["codec"]:
                if codec["codec_name"] != "avc":  # 优先 H.264
                    continue
                current_qn = codec["current_qn"]
                base_url = codec["base_url"]
                url_info = codec["url_info"][0]
                full_url = url_info["host"] + base_url + url_info["extra"]
                qn_label = QN_MAP.get(current_qn, f"QN{current_qn}")
                results[fmt_name] = {
                    "qn": current_qn,
                    "label": qn_label,
                    "url": full_url
                }
                break
    return results

# 封面截图相关函数
def get_live_info(room_id):
    params = {'room_id': room_id}
    try:
        response = requests.get(LIVE_INFO_API, params=params, headers=HEADERS)
        response.raise_for_status()
        data = response.json()
        
        if data['code'] != 0:
            return {
                'code': data['code'],
                'message': data.get('message', '未知错误'),
                'data': {}
            }
        
        live_info = data['data']
        live_status = live_info.get('live_status', 0)
        live_time = live_info.get('live_time', '')
        keyframe = live_info.get('keyframe', '')
        cover = live_info.get('cover', '') or live_info.get('user_cover', '')
        
        return {
            'code': 0,
            'message': 'success',
            'data': {
                'user_cover': cover,
                'keyframe': keyframe,
                'title': live_info.get('title', ''),
                'uname': live_info.get('uname', ''),
                'room_id': live_info.get('room_id', room_id),
                'live_status': live_status,
                'live_time': live_time
            }
        }
        
    except requests.exceptions.RequestException as e:
        return {'code': -1, 'message': f'请求错误: {str(e)}', 'data': {}}
    except Exception as e:
        return {'code': -1, 'message': f'未知错误: {str(e)}', 'data': {}}

# 路由定义
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/api/getStreamUrls', methods=['POST'])
def get_stream_urls():
    try:
        data = request.get_json()
        room_id = data.get('roomId')
        if not room_id or not str(room_id).isdigit():
            return jsonify({"error": True, "message": "请输入有效的直播间号码"}), 400

        room_id = int(room_id)
        init_resp = requests.get(ROOM_INIT_API, params={"id": room_id}, headers=HEADERS, timeout=10).json()
        if init_resp["code"] != 0:
            return jsonify({"error": True, "message": f"直播间错误: {init_resp['msg']}"}), 400

        room_data = init_resp["data"]
        live_status = room_data["live_status"]
        status_text = {0: "未开播", 1: "直播中", 2: "轮播中"}.get(live_status, "未知")
        is_live = live_status == 1

        room_info = {
            "room_id": room_id,
            "title": room_data.get("title", "未知标题"),
            "cover": room_data.get("cover", ""),
            "face": room_data.get("face", ""),
            "uname": room_data.get("uname", "未知主播"),
            "live_status": live_status,
            "status_text": status_text,
            "is_live": is_live
        }

        if not is_live:
            return jsonify({
                "error": False,
                "room_info": room_info,
                "streams": None
            })

        streams = get_all_stream_urls(room_id)
        stream_result = {}
        for key in ["flv", "fmp4", "ts"]:
            if streams[key]:
                stream_result[key] = {
                    "label": streams[key]["label"],
                    "url": streams[key]["url"]
                }
            else:
                stream_result[key] = None

        return jsonify({
            "error": False,
            "room_info": room_info,
            "streams": stream_result
        })

    except Exception as e:
        return jsonify({"error": True, "message": f"获取失败: {str(e)}"}), 500

@app.route('/api/bilibili-live-info', methods=['POST'])
def api_bilibili_live_info():
    try:
        data = request.get_json()
        room_id = data.get('room_id')
        
        if not room_id or not room_id.isdigit():
            return jsonify({
                'code': -1,
                'message': '房间ID必须是数字',
                'data': {}
            }), 400
        
        result = get_live_info(room_id)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'code': -1,
            'message': str(e),
            'data': {}
        }), 500

@app.route('/api/image-proxy')
def image_proxy():
    try:
        url = request.args.get('url')
        if not url:
            return "URL参数缺失", 400
            
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        
        content_type = response.headers.get('content-type', 'image/jpeg')
        img_bytes = io.BytesIO(response.content)
        img = Image.open(img_bytes)
        
        output = io.BytesIO()
        img.save(output, format=img.format)
        output.seek(0)
        
        return send_file(
            output,
            mimetype=content_type,
            as_attachment=False
        )
    except Exception as e:
        return str(e), 500

@app.route('/api/download-cover')
def download_cover():
    try:
        url = request.args.get('url')
        room_id = request.args.get('roomId', 'unknown')
        
        if not url:
            return "URL参数缺失", 400
            
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        
        content_type = response.headers.get('content-type', 'image/jpeg')
        ext = 'jpg'
        if 'png' in content_type:
            ext = 'png'
        elif 'gif' in content_type:
            ext = 'gif'
            
        filename = f"封面_{room_id}.{ext}"
        img_bytes = io.BytesIO(response.content)
        img = Image.open(img_bytes)
        
        output = io.BytesIO()
        img.save(output, format=img.format)
        output.seek(0)
        
        return send_file(
            output,
            mimetype=content_type,
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return str(e), 500

@app.route('/api/download-screenshot')
def download_screenshot():
    try:
        url = request.args.get('url')
        room_id = request.args.get('roomId', 'unknown')
        
        if not url:
            return "URL参数缺失", 400
            
        response = requests.get(url, headers=HEADERS)
        response.raise_for_status()
        
        content_type = response.headers.get('content-type', 'image/jpeg')
        ext = 'jpg'
        if 'png' in content_type:
            ext = 'png'
        elif 'gif' in content_type:
            ext = 'gif'
            
        filename = f"截图_{room_id}.{ext}"
        img_bytes = io.BytesIO(response.content)
        img = Image.open(img_bytes)
        
        output = io.BytesIO()
        img.save(output, format=img.format)
        output.seek(0)
        
        return send_file(
            output,
            mimetype=content_type,
            as_attachment=True,
            download_name=filename
        )
    except Exception as e:
        return str(e), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)