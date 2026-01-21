import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';
import { UPLOAD_ROOT } from './config/upload.config';

async function bootstrap() {
  console.log('Starting application with MANUAL CORS MIDDLEWARE (v4)...');
  try {
    // Ensure uploads directory exists
    const uploadsPath = UPLOAD_ROOT;
    if (!fs.existsSync(uploadsPath)) {
      console.log(`Creating uploads directory at: ${uploadsPath}`);
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
  } catch (err) {
    console.error('Warning: Could not create uploads directory:', err);
  }

  const app = await NestFactory.create(AppModule);

  // MANUAL CORS MIDDLEWARE (Nuclear Option)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  
  // Disable standard CORS to avoid conflicts
  // app.enableCors({...});

  const port = process.env.PORT || 3000;
  try {
    console.log(`Starting application on port ${port}...`);
    // Force reload trigger
    await app.listen(port, '0.0.0.0');
    console.log(`Application is running on: ${await app.getUrl()}`);
    console.log(`Server bound to 0.0.0.0:${port}`);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}
bootstrap().catch(err => {
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
