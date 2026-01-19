import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  try {
    // Ensure uploads directory exists
    const uploadsPath = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsPath)) {
      console.log(`Creating uploads directory at: ${uploadsPath}`);
      fs.mkdirSync(uploadsPath, { recursive: true });
    }
  } catch (err) {
    console.error('Warning: Could not create uploads directory:', err);
  }

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  
  // Configure CORS
  app.enableCors({
    origin: true, // Allow all origins for development/mobile access
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

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
