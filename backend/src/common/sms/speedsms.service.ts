import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class SpeedSmsService {
  private readonly logger = new Logger(SpeedSmsService.name);
  private readonly baseUrl = 'https://api.speedsms.vn/index.php';

  async sendOtp(phone: string, otp: string): Promise<boolean> {
    const apiKey = process.env.SPEEDSMS_API_KEY;

    if (!apiKey) {
      this.logger.warn(`[DEV] OTP for ${phone}: ${otp}`);
      return true;
    }

    const normalizedPhone = this.normalizePhone(phone);
    const message = `[NextTalk] Ma xac thuc cua ban la: ${otp}. Co hieu luc trong 2 phut.`;

    try {
      const token = Buffer.from(`${apiKey}:x`).toString('base64');
      const response = await axios.post(
        `${this.baseUrl}/sms/send`,
        {
          to: [normalizedPhone],
          content: message,
          sms_type: 4,
          sender: process.env.SPEEDSMS_SENDER || 'NextTalk',
        },
        {
          headers: {
            Authorization: `Basic ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      if (response.data?.status === 'success') {
        this.logger.log(`OTP sent to ${phone}`);
        return true;
      }

      this.logger.error(`SpeedSMS error: ${JSON.stringify(response.data)}`);
      return false;
    } catch (err) {
      this.logger.error(`SpeedSMS request failed: ${err.message}`);
      return false;
    }
  }

  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('0')) return '84' + digits.slice(1);
    if (digits.startsWith('84')) return digits;
    return digits;
  }
}
