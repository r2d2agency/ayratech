import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFiles, HttpException, HttpStatus } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import { UPLOAD_ROOT } from '../config/upload.config';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
    { name: 'referenceImage', maxCount: 1 },
  ]))
  async create(
    @Body() createProductDto: CreateProductDto, 
    @UploadedFiles() files: { image?: Express.Multer.File[], referenceImage?: Express.Multer.File[] }
  ) {
    try {
      if (files?.image?.[0]) {
        const file = files.image[0];
        const filename = `product-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
        const uploadDir = path.join(UPLOAD_ROOT, 'products');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        try {
          await sharp(file.buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(path.join(uploadDir, filename));
        } catch (sharpError) {
          console.error('Sharp processing error:', sharpError);
          throw new HttpException(`Image processing failed: ${sharpError.message}`, HttpStatus.BAD_REQUEST);
        }
          
        createProductDto.image = `/uploads/products/${filename}`;
      }

      if (files?.referenceImage?.[0]) {
        const file = files.referenceImage[0];
        const filename = `ref-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
        const uploadDir = path.join(UPLOAD_ROOT, 'products/references');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        try {
          await sharp(file.buffer)
            .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(path.join(uploadDir, filename));
        } catch (sharpError) {
          console.error('Sharp processing error:', sharpError);
          throw new HttpException(`Reference Image processing failed: ${sharpError.message}`, HttpStatus.BAD_REQUEST);
        }
          
        createProductDto.referenceImageUrl = `/uploads/products/references/${filename}`;
      }

      return await this.productsService.create(createProductDto);
    } catch (error) {
      console.error('Error in ProductsController.create:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message || 'Internal server error during creation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('debug/files')
  debugFiles() {
    const uploadDir = path.join(UPLOAD_ROOT, 'products');
    try {
      if (!fs.existsSync(uploadDir)) {
        return { message: 'Directory does not exist', path: uploadDir, cwd: process.cwd() };
      }
      const files = fs.readdirSync(uploadDir);
      return { 
        path: uploadDir,
        cwd: process.cwd(),
        count: files.length,
        files: files.sort((a, b) => {
            return fs.statSync(path.join(uploadDir, b)).mtime.getTime() - 
                   fs.statSync(path.join(uploadDir, a)).mtime.getTime();
        }).slice(0, 10) // Newest 10 files
      };
    } catch (e) {
      return { error: e.message, path: uploadDir };
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'image', maxCount: 1 },
    { name: 'referenceImage', maxCount: 1 },
  ]))
  async update(
    @Param('id') id: string, 
    @Body() updateProductDto: UpdateProductDto, 
    @UploadedFiles() files: { image?: Express.Multer.File[], referenceImage?: Express.Multer.File[] }
  ) {
    try {
      if (files?.image?.[0]) {
        const file = files.image[0];
        const filename = `product-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
        const uploadDir = path.join(UPLOAD_ROOT, 'products');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        try {
          await sharp(file.buffer)
            .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80 })
            .toFile(path.join(uploadDir, filename));
        } catch (sharpError) {
          console.error('Sharp processing error:', sharpError);
          throw new HttpException(`Image processing failed: ${sharpError.message}`, HttpStatus.BAD_REQUEST);
        }
          
        updateProductDto.image = `/uploads/products/${filename}`;
      }

      if (files?.referenceImage?.[0]) {
        const file = files.referenceImage[0];
        const filename = `ref-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
        const uploadDir = path.join(UPLOAD_ROOT, 'products/references');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        try {
          await sharp(file.buffer)
            .resize(1280, 1280, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 85 })
            .toFile(path.join(uploadDir, filename));
        } catch (sharpError) {
          console.error('Sharp processing error:', sharpError);
          throw new HttpException(`Reference Image processing failed: ${sharpError.message}`, HttpStatus.BAD_REQUEST);
        }
          
        updateProductDto.referenceImageUrl = `/uploads/products/references/${filename}`;
      }

      return await this.productsService.update(id, updateProductDto);
    } catch (error) {
      console.error('Error in ProductsController.update:', error);
      if (error instanceof HttpException) throw error;
      throw new HttpException(error.message || 'Internal server error during update', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
