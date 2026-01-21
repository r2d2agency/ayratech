import { Injectable, BadRequestException } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UPLOAD_ROOT } from '../config/upload.config';

@Injectable()
export class UploadService {
  async uploadFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const uploadDir = UPLOAD_ROOT;
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `${uuidv4()}.webp`;
    const filepath = path.join(uploadDir, filename);

    // Process image: resize to max 800px width, convert to webp, compress quality 80
    await sharp(file.buffer)
      .resize(800, null, { withoutEnlargement: true }) // maintain aspect ratio, max width 800
      .webp({ quality: 80 })
      .toFile(filepath);

    // Return the URL (assuming standard setup)
    // Note: The frontend needs to prepend the API base URL or host if this returns relative path
    // Based on ServeStaticModule in AppModule, it serves from /uploads
    const host = process.env.API_URL || 'http://localhost:3000'; 
    // Ideally we return relative path or full URL. Let's return full URL to be safe, or just path.
    // Let's return the relative path that matches ServeStaticModule
    return { 
      url: `${host}/uploads/${filename}`,
      path: `/uploads/${filename}`
    };
  }
}
