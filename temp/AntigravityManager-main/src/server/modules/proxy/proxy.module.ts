import { Module } from '@nestjs/common';
import { ProxyController } from './proxy.controller';
import { ProxyService } from './proxy.service';
import { TokenManagerService } from './token-manager.service';
import { GeminiClient } from './clients/gemini.client';

@Module({
  controllers: [ProxyController],
  providers: [ProxyService, TokenManagerService, GeminiClient],
})
export class ProxyModule {}
