import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AbsencesService } from './absences.service';
import { AbsencesController } from './absences.controller';
import { AbsenceRequest } from './entities/absence-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AbsenceRequest])],
  controllers: [AbsencesController],
  providers: [AbsencesService],
  exports: [AbsencesService],
})
export class AbsencesModule {}
