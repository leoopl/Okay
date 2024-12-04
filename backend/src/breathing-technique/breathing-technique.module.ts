import { Module } from '@nestjs/common';
import { BreathController } from './breathing-technique.controller';
import { BreathService } from './breathing-technique.service';

@Module({
  controllers: [BreathController],
  providers: [BreathService],
})
export class BreathModule {}
