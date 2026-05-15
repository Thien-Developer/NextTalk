import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import * as Minio from 'minio';
import { randomUUID } from 'crypto';
import { extname } from 'path';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private minioClient: Minio.Client;
  private readonly bucket = 'nexttalk';

  constructor() {
    this.minioClient = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY || 'nexttalk',
      secretKey: process.env.MINIO_SECRET_KEY || 'nexttalk123',
    });
    this.ensureBucket();
  }

  private async ensureBucket() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucket, 'us-east-1');
        await this.minioClient.setBucketPolicy(
          this.bucket,
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: { AWS: ['*'] },
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucket}/*`],
              },
            ],
          }),
        );
        this.logger.log(`Bucket '${this.bucket}' created`);
      }
    } catch (err) {
      this.logger.warn(`MinIO bucket init failed: ${(err as Error).message}`);
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<{ url: string; key: string; size: number; mimeType: string }> {
    const ext = extname(file.originalname).toLowerCase();
    const objectName = `${Date.now()}-${randomUUID()}${ext}`;

    try {
      await this.minioClient.putObject(
        this.bucket,
        objectName,
        file.buffer,
        file.size,
        { 'Content-Type': file.mimetype },
      );

      const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const port = process.env.MINIO_PORT || '9000';
      const url = `http://${endpoint}:${port}/${this.bucket}/${objectName}`;

      return { url, key: objectName, size: file.size, mimeType: file.mimetype };
    } catch (err) {
      this.logger.error(`File upload failed: ${(err as Error).message}`);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async deleteFile(objectName: string) {
    try {
      await this.minioClient.removeObject(this.bucket, objectName);
    } catch (err) {
      this.logger.warn(`Delete file failed: ${(err as Error).message}`);
    }
  }
}
