import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SettingsService {
  private readonly filePath = path.join(process.cwd(), 'uploads', 'system_settings.json');

  private defaultSettings = {
    general: {
      siteName: 'Hệ thống thi trực tuyến AI',
      contactEmail: 'admin@gmail.com',
      passwordPolicy: {
        minLength: 6,
        requireSpecialChar: false,
        requireUppercase: false
      }
    },
    proctoring: {
      aiSensitivity: 70,
      captureInterval: 30,
      enableFaceDetection: true,
      enableTabDetection: true,
      autoLockThreshold: 5 // số lần vi phạm để khóa bài tự động
    }
  };

  getSettings() {
    if (!fs.existsSync(this.filePath)) {
      // Đảm bảo thư mục tồn tại
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      this.saveSettings(this.defaultSettings);
      return this.defaultSettings;
    }
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return this.defaultSettings;
    }
  }

  saveSettings(settings: any) {
    fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2));
    return settings;
  }
}
