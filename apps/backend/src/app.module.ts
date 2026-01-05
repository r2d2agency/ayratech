import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    ClientsModule,
    ProductsModule,
    SupermarketsModule,
    SupermarketGroupsModule,
    AuthModule,
    UsersModule,
    ContractsModule,
    RoutesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
