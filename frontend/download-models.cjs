// Script tải models cho face-api.js
// Chạy: node download-models.js
const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_DIR = path.join(__dirname, 'public', 'models', 'face-api');
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const FILES = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2', // Thêm shard 2 bị thiếu
];


function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

async function main() {
  if (!fs.existsSync(MODEL_DIR)) fs.mkdirSync(MODEL_DIR, { recursive: true });
  
  for (const file of FILES) {
    const url = `${BASE_URL}/${file}`;
    const dest = path.join(MODEL_DIR, file);
    
    if (fs.existsSync(dest)) {
      console.log(`✓ Đã có: ${file}`);
      continue;
    }
    
    console.log(`⬇ Đang tải: ${file}...`);
    try {
      await downloadFile(url, dest);
      console.log(`✅ Hoàn tất: ${file}`);
    } catch (err) {
      console.error(`❌ Lỗi tải ${file}:`, err.message);
    }
  }
  
  console.log('\n🎉 Tải models xong! Hệ thống face-api.js sẵn sàng.');
}

main();
