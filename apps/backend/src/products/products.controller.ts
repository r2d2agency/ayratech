import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(@Body() createProductDto: CreateProductDto, @UploadedFile() file: Express.Multer.File) {
    try {
      if (file) {
        const filename = `product-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
        const uploadDir = path.join(process.cwd(), 'uploads', 'products');
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto, @UploadedFile() file: Express.Multer.File) {
    try {
      if (file) {
        const filename = `product-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
        const uploadDir = path.join(process.cwd(), 'uploads', 'products');
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
