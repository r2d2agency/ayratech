import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from './clients/clients.module';
import { ProductsModule } from './products/products.module';
import { SupermarketsModule } from './supermarkets/supermarkets.module';
import { SupermarketGroupsModule } from './supermarket-groups/supermarket-groups.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContractsModule } from './contracts/contracts.module';
import { RoutesModule } from './routes/routes.module';
import { ContractTemplatesModule } from './contract-templates/contract-templates.module';
import { RolesModule } from './roles/roles.module';
import { BrandsModule } from './brands/brands.module';
import { EmployeesModule } from './employees/employees.module';
import { WorkSchedulesModule } from './work-schedules/work-schedules.module';
import { TimeClockModule } from './time-clock/time-clock.module';
import { AbsencesModule } from './absences/absences.module';
import { UploadModule } from './upload/upload.module';
import { CategoriesModule } from './categories/categories.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AppSyncModule } from './app-sync/app-sync.module';
import { ImageAnalysisModule } from './integrations/image-analysis/image-analysis.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('DB_USERNAME', 'postgres'),
          password: configService.get<string>('DB_PASSWORD', 'password'),
          database: configService.get<string>('DB_DATABASE', 'ayratech_db'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true, // Auto-create tables (dev only)
        };
        console.log('Attempting to connect to DB with:', { 
          ...dbConfig, 
          password: '***' 
        });
        return dbConfig as any;
      },
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ClientsModule,
    ProductsModule,
    SupermarketsModule,
    SupermarketGroupsModule,
    AuthModule,
    UsersModule,
    ContractsModule,
    RoutesModule,
    ContractTemplatesModule,
    BrandsModule,
    RolesModule,
    EmployeesModule,
    WorkSchedulesModule,
    TimeClockModule,
    AbsencesModule,
    UploadModule,
    CategoriesModule,
    DashboardModule,
    AppSyncModule,
    ImageAnalysisModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
