import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { AiService } from './ai.service';
import { CreateAiConfigDto } from './dto/create-ai-config.dto';
import { CreateAiPromptDto } from './dto/create-ai-prompt.dto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('config')
  createConfig(@Body() createAiConfigDto: CreateAiConfigDto) {
    return this.aiService.createConfig(createAiConfigDto);
  }

  @Get('config')
  getActiveConfig() {
    return this.aiService.getActiveConfig();
  }

  @Post('prompts')
  createPrompt(@Body() createAiPromptDto: CreateAiPromptDto) {
    return this.aiService.createPrompt(createAiPromptDto);
  }

  @Get('prompts')
  getAllPrompts() {
    return this.aiService.getAllPrompts();
  }

  @Get('prompts/:name')
  getPrompt(@Param('name') name: string) {
    return this.aiService.getPromptByName(name);
  }

  @Get('pending')
  getPendingItems() {
    return this.aiService.getPendingItems();
  }

  @Post('analyze-batch')
  analyzeBatch(@Body() body: { ids: string[] }) {
    return this.aiService.analyzeBatch(body.ids);
  }

  @Post('generate-product-prompt')
  generateProductPrompt(@Body() body: { productId: string; promptId?: string }) {
    return this.aiService.generateProductPrompt(body.productId, body.promptId);
  }
}
