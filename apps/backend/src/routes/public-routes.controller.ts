import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RoutesService } from './routes.service';

@Controller('public/routes')
export class PublicRoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get('validate-stock/:token')
  getValidationInfo(@Param('token') token: string) {
    return this.routesService.getPublicStockValidation(token);
  }

  @Post('validate-stock/:token')
  processValidation(
    @Param('token') token: string,
    @Body() body: { action: 'APPROVE' | 'REJECT'; observation?: string },
  ) {
    return this.routesService.processPublicStockValidation(token, body.action, body.observation);
  }

  @Get('debug/logs')
  getDebugLogs() {
    const fs = require('fs');
    const path = require('path');
    const logs: any = {
      cwd: process.cwd(),
      env_upload_dir: process.env.UPLOAD_DIR,
      timestamp: new Date().toISOString()
    };
    
    try {
      // Check debug files in CWD
      const debugLastSavePath = 'debug_last_save_path.txt';
      if (fs.existsSync(debugLastSavePath)) {
        logs['last_save_log'] = fs.readFileSync(debugLastSavePath, 'utf8');
      } else {
        logs['last_save_log'] = `File ${debugLastSavePath} not found in CWD`;
      }
      
      const debugUploadRootPath = 'debug_upload_root.txt';
      if (fs.existsSync(debugUploadRootPath)) {
        logs['upload_root_log'] = fs.readFileSync(debugUploadRootPath, 'utf8');
      } else {
         logs['upload_root_log'] = `File ${debugUploadRootPath} not found in CWD`;
      }

      // Check uploads directory
      // Use dynamic require to avoid build issues if file doesn't exist during compilation (though it should)
      let uploadDir;
      try {
        const uploadConfig = require('../config/upload.config');
        uploadDir = uploadConfig.UPLOAD_ROOT;
      } catch (e) {
        uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
      }
      
      logs['configured_upload_root'] = uploadDir;
      
      if (fs.existsSync(uploadDir)) {
        logs['uploads_dir_exists'] = true;
        const files = fs.readdirSync(uploadDir);
        logs['uploads_file_count'] = files.length;
        logs['uploads_files_sample'] = files.slice(0, 20); // First 20 files
      } else {
        logs['uploads_dir_exists'] = false;
        // Try to list current directory to help debug
        try {
            logs['cwd_files'] = fs.readdirSync(process.cwd());
        } catch (e) {
            logs['cwd_files_error'] = e.message;
        }
      }
      
    } catch (e) {
      logs['error'] = e.message;
      logs['stack'] = e.stack;
    }
    return logs;
  }
}
