import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as os from 'os';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Trả về IP LAN thật của server để frontend tạo QR Code đúng
  // Điện thoại cần IP này để kết nối, không thể dùng localhost
  @Get('network-ip')
  getNetworkIp(): { ip: string } {
    const interfaces = os.networkInterfaces();

    // Danh sách tên interface WiFi ưu tiên (exact match)
    const preferredNames = ['Wi-Fi', 'WLAN', 'wlan0', 'en0', 'eth0'];

    // Lần 1: Exact match tên WiFi
    for (const name of preferredNames) {
      const iface = (interfaces[name] || []).find(
        i => i.family === 'IPv4' && !i.internal
      );
      if (iface) return { ip: iface.address };
    }

    // Lần 2: Loại bỏ adapter ảo, lấy IP bất kỳ
    const blacklist = ['vEthernet', 'Ethernet 2', 'VirtualBox', 'VMware', 'Bluetooth', 'Loopback', 'WSL'];
    for (const name of Object.keys(interfaces)) {
      if (blacklist.some(b => name.includes(b))) continue;
      const iface = (interfaces[name] || []).find(
        i => i.family === 'IPv4' && !i.internal
      );
      if (iface) return { ip: iface.address };
    }

    // Lần 3: Bất kỳ IPv4 non-loopback
    for (const name of Object.keys(interfaces)) {
      const iface = (interfaces[name] || []).find(
        i => i.family === 'IPv4' && !i.internal
      );
      if (iface) return { ip: iface.address };
    }

    return { ip: 'localhost' };
  }
}
