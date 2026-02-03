import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiConfig } from './entities/ai-config.entity';
import { AiPrompt } from './entities/ai-prompt.entity';
import { RouteItemProduct } from '../routes/entities/route-item-product.entity';
import { Product } from '../entities/product.entity';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { In } from 'typeorm';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @InjectRepository(AiConfig)
    private aiConfigRepository: Repository<AiConfig>,
    @InjectRepository(AiPrompt)
    private aiPromptRepository: Repository<AiPrompt>,
    @InjectRepository(RouteItemProduct)
    private routeItemProductRepository: Repository<RouteItemProduct>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async getPendingItems() {
    return this.routeItemProductRepository.find({
      where: { aiStatus: 'UNCHECKED' },
      relations: ['product', 'routeItem', 'routeItem.route', 'routeItem.route.user'],
      take: 50,
      order: { checkInTime: 'DESC' }
    });
  }

  async analyzeBatch(ids: string[]) {
    const items = await this.routeItemProductRepository.find({
      where: { id: In(ids) },
      relations: ['product']
    });

    const results = [];

    for (const item of items) {
      if (!item.product.analysisPrompt) {
        results.push({ id: item.id, status: 'SKIPPED', reason: 'Produto sem prompt' });
        continue;
      }
      
      if (!item.photos || item.photos.length === 0) {
        results.push({ id: item.id, status: 'SKIPPED', reason: 'Sem fotos' });
        continue;
      }

      const photoPath = item.photos[0];
      try {
        const analysis = await this.verifyImage(photoPath, item.product.analysisPrompt);
        
        item.aiStatus = analysis.status;
        item.aiObservation = analysis.observation;
        await this.routeItemProductRepository.save(item);
        
        results.push({ id: item.id, status: analysis.status, reason: analysis.observation });
      } catch (error) {
        this.logger.error(`Erro ao analisar item ${item.id}`, error);
        results.push({ id: item.id, status: 'ERROR', reason: error.message });
      }
    }

    return results;
  }

  async generateProductPrompt(productId: string) {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) throw new Error('Produto não encontrado');
    if (!product.referenceImageUrl) throw new Error('Produto sem imagem de referência');

    const description = await this.generateDescription(product.referenceImageUrl);
    product.analysisPrompt = description;
    await this.productRepository.save(product);
    return { description };
  }

  async createConfig(data: any) {
    const config = this.aiConfigRepository.create(data);
    if (data.isActive) {
      await this.aiConfigRepository.update({}, { isActive: false });
    }
    return this.aiConfigRepository.save(config);
  }

  async getActiveConfig() {
    return this.aiConfigRepository.findOne({ where: { isActive: true } });
  }

  async createPrompt(data: any) {
    return this.aiPromptRepository.save(this.aiPromptRepository.create(data));
  }

  async getPromptByName(name: string) {
    return this.aiPromptRepository.findOne({ where: { name } });
  }

  async generateDescription(imagePath: string): Promise<string> {
    const config = await this.getActiveConfig();
    if (!config) throw new Error('IA não configurada.');

    const prompt = 'Descreva detalhadamente este produto, incluindo marca, tipo de embalagem, cores principais, textos visíveis e características chave para identificação visual. Responda em português.';
    
    return this.processImage(config, imagePath, prompt);
  }

  async verifyImage(imagePath: string, referenceDescription: string): Promise<{ status: string; observation: string }> {
    const config = await this.getActiveConfig();
    if (!config) throw new Error('IA não configurada.');

    const prompt = `
      Você é um assistente de auditoria de varejo. 
      Compare a imagem fornecida com a seguinte descrição de referência do produto esperado:
      "${referenceDescription}"
      
      A imagem mostra o produto descrito? 
      Responda EXATAMENTE no seguinte formato JSON:
      {
        "match": true/false,
        "reason": "Explicação breve"
      }
    `;

    try {
      const resultText = await this.processImage(config, imagePath, prompt);
      const cleanedText = resultText.replace(/```json|```/g, '').trim();
      const result = JSON.parse(cleanedText);
      
      return {
        status: result.match ? 'OK' : 'FLAGGED',
        observation: result.reason
      };
    } catch (error) {
      this.logger.error('Erro ao processar resposta da IA', error);
      return { status: 'FLAGGED', observation: 'Erro ao processar resposta da IA.' };
    }
  }

  private async processImage(config: AiConfig, imagePath: string, promptText: string): Promise<string> {
    // Resolve full path
    const fullPath = imagePath.startsWith('/') ? path.join(process.cwd(), imagePath) : imagePath;
    
    if (!fs.existsSync(fullPath)) {
        // Try prepending uploads/ if not found
        const uploadPath = path.join(process.cwd(), 'uploads', imagePath.replace(/^\/uploads\//, ''));
        if (!fs.existsSync(uploadPath)) {
             throw new Error(`Imagem não encontrada: ${fullPath}`);
        }
    }

    const imageBuffer = fs.readFileSync(fullPath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = this.getMimeType(fullPath);

    if (config.provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(config.apiKey);
      const model = genAI.getGenerativeModel({ model: config.model || 'gemini-pro-vision' });
      
      const result = await model.generateContent([
        promptText,
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        }
      ]);
      const response = await result.response;
      return response.text();
    } else if (config.provider === 'openai') {
      const openai = new OpenAI({ apiKey: config.apiKey });
      const response = await openai.chat.completions.create({
        model: config.model || 'gpt-4-vision-preview',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: promptText },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
      });
      return response.choices[0].message.content || '';
    }
    
    throw new Error('Provedor desconhecido');
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    return 'image/jpeg';
  }
}
