function validateRoomId(roomId) {
  return /^\d+$/.test(roomId);
}

function validateUrl(url) {
  return !!url && (url.startsWith('http://') || url.startsWith('https://'));
}

module.exports = { validateRoomId, validateUrl };
