import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'rh', 'manager') // Default allowed roles for employee management
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('facialPhoto', {
    storage: diskStorage({
      destination: './uploads/employees',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  create(@Body() createEmployeeDto: CreateEmployeeDto, @UploadedFile() file: Express.Multer.File) {
    console.log('Creating employee with data:', JSON.stringify(createEmployeeDto, null, 2));
    if (file) {
      console.log('Uploaded file:', file.filename);
      createEmployeeDto.facialPhotoUrl = `/uploads/employees/${file.filename}`;
    }
    return this.employeesService.create(createEmployeeDto);
  }

  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('facialPhoto', {
    storage: diskStorage({
      destination: './uploads/employees',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  update(@Param('id') id: string, @Body() updateEmployeeDto: UpdateEmployeeDto, @UploadedFile() file: Express.Multer.File) {
    console.log(`Updating employee ${id} with data:`, JSON.stringify(updateEmployeeDto, null, 2));
    if (file) {
      console.log('Uploaded file:', file.filename);
      updateEmployeeDto.facialPhotoUrl = `/uploads/employees/${file.filename}`;
    }
    return this.employeesService.update(id, updateEmployeeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.employeesService.remove(id);
  }

  @Post(':id/compensation')
  addCompensation(@Param('id') id: string, @Body() data: any) {
    return this.employeesService.addCompensation({ ...data, employeeId: id });
  }

  @Get('documents/all')
  findAllDocuments() {
    return this.employeesService.findAllDocuments();
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/documents',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  addDocument(@Param('id') id: string, @Body() data: any, @UploadedFile() file: Express.Multer.File, @Request() req: any) {
    const fileUrl = file ? `/uploads/documents/${file.filename}` : data.fileUrl;
    
    // req.user is populated by JwtAuthGuard (if used on this route, which it is at controller level)
    const senderId = req.user?.userId;

    return this.employeesService.addDocument({ 
      ...data, 
      employeeId: id,
      fileUrl,
      senderId
    });
  }

  @Patch('documents/:id/read')
  markDocumentAsRead(@Param('id') id: string) {
    return this.employeesService.markDocumentAsRead(id);
  }
}
