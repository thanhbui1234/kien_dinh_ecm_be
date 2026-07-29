import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { AiChatDto } from './dto/ai-chat.dto';
import { AiChatResponseDto } from './dto/ai-chat-response.dto';
import {
  AI_LIMITS,
  AI_MESSAGES,
  AI_TOOLS,
  AI_TOOL_DESCRIPTIONS,
  AI_DEFAULT_CONTACT,
  AI_SYSTEM_PROMPT_TEMPLATE,
} from './constants/ai.constants';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Hàm hỗ trợ loại bỏ dấu tiếng Việt để tìm kiếm không dấu
 */
function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ai: GoogleGenAI;
  private readonly models: string[];
  private readonly temperature: number;

  /**
   * Strategy Pattern Dispatcher Map cho các Tool Handlers
   */
  private readonly toolHandlers: Record<string, (args: any) => Promise<any>> = {
    [AI_TOOLS.SEARCH_PRODUCTS]: (args) => this.handleSearchProducts(args),
    [AI_TOOLS.SEARCH_CATEGORIES]: (args) => this.handleSearchCategories(args),
    [AI_TOOLS.SEARCH_PROJECTS]: (args) => this.handleSearchProjects(args),
    [AI_TOOLS.SEARCH_JOBS]: (args) => this.handleSearchJobs(args),
    [AI_TOOLS.GET_ABOUT_COMPANY]: () => this.handleGetAboutCompany(),
    [AI_TOOLS.SUBMIT_CONTACT_REQUEST]: (args) => this.handleSubmitContactRequest(args),
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.ai = new GoogleGenAI({ apiKey });

    const fallbackStr = this.configService.get<string>(
      'GEMINI_FALLBACK_MODELS',
      'gemini-3.5-flash,gemini-3.1-flash-lite,gemini-2.0-flash,gemini-2.0-flash-lite',
    );
    this.models = fallbackStr.split(',').map((m) => m.trim());
    this.temperature = parseFloat(
      this.configService.get<string>('GEMINI_TEMPERATURE', '0.7'),
    );
  }

  /**
   * Đọc thông tin liên hệ từ file JSON tĩnh hoặc dùng giá trị mặc định từ Hằng số
   */
  private getCompanyContactInfo(): typeof AI_DEFAULT_CONTACT {
    try {
      const filePath = path.resolve(__dirname, 'data/company-contact.json');
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (e) {
      this.logger.warn(`Could not read company-contact.json: ${e.message}`);
    }
    return AI_DEFAULT_CONTACT;
  }

  /**
   * System Prompt nghiêm ngặt đóng vai trò Guardrails bảo mật và Đào tạo Toàn diện
   */
  private async getSystemInstruction(): Promise<string> {
    let contact = this.getCompanyContactInfo();

    try {
      const dbContact = await this.prisma.contactSetting.findUnique({
        where: { id: 'singleton' },
      });
      if (dbContact) {
        contact = {
          ...contact,
          SALES_PHONE: dbContact.hotline || contact.SALES_PHONE,
          WARRANTY_PHONE: dbContact.hotline || contact.WARRANTY_PHONE,
          EMAIL: dbContact.email || contact.EMAIL,
        };
      }
    } catch (e) {}

    return AI_SYSTEM_PROMPT_TEMPLATE(contact);
  }

  /**
   * Khai báo toàn bộ các Tool (Function Calling) cho Gemini
   */
  private getToolDeclarations(): FunctionDeclaration[] {
    return [
      {
        name: AI_TOOLS.SEARCH_PRODUCTS,
        description: AI_TOOL_DESCRIPTIONS.SEARCH_PRODUCTS_DESC,
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: AI_TOOL_DESCRIPTIONS.SEARCH_PRODUCTS_QUERY_DESC,
            },
            maxPrice: {
              type: Type.NUMBER,
              description: AI_TOOL_DESCRIPTIONS.SEARCH_PRODUCTS_MAX_PRICE_DESC,
            },
          },
        },
      },
      {
        name: AI_TOOLS.SEARCH_CATEGORIES,
        description: AI_TOOL_DESCRIPTIONS.SEARCH_CATEGORIES_DESC,
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: AI_TOOL_DESCRIPTIONS.SEARCH_CATEGORIES_QUERY_DESC,
            },
          },
        },
      },
      {
        name: AI_TOOLS.SEARCH_PROJECTS,
        description: AI_TOOL_DESCRIPTIONS.SEARCH_PROJECTS_DESC,
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: AI_TOOL_DESCRIPTIONS.SEARCH_PROJECTS_QUERY_DESC,
            },
          },
        },
      },
      {
        name: AI_TOOLS.SEARCH_JOBS,
        description: AI_TOOL_DESCRIPTIONS.SEARCH_JOBS_DESC,
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: AI_TOOL_DESCRIPTIONS.SEARCH_JOBS_QUERY_DESC,
            },
          },
        },
      },
      {
        name: AI_TOOLS.GET_ABOUT_COMPANY,
        description: AI_TOOL_DESCRIPTIONS.GET_ABOUT_COMPANY_DESC,
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: AI_TOOLS.SUBMIT_CONTACT_REQUEST,
        description: AI_TOOL_DESCRIPTIONS.SUBMIT_CONTACT_DESC,
        parameters: {
          type: Type.OBJECT,
          properties: {
            fullName: {
              type: Type.STRING,
              description: AI_TOOL_DESCRIPTIONS.SUBMIT_CONTACT_NAME_DESC,
            },
            phoneNumber: {
              type: Type.STRING,
              description: AI_TOOL_DESCRIPTIONS.SUBMIT_CONTACT_PHONE_DESC,
            },
            email: {
              type: Type.STRING,
              description: AI_TOOL_DESCRIPTIONS.SUBMIT_CONTACT_EMAIL_DESC,
            },
            message: {
              type: Type.STRING,
              description: AI_TOOL_DESCRIPTIONS.SUBMIT_CONTACT_MSG_DESC,
            },
          },
          required: ['fullName', 'phoneNumber'],
        },
      },
    ];
  }

  /**
   * Helper chạy Tool với Redis Cache (TTL 10 phút)
   */
  private async getOrSetToolCache(
    toolName: string,
    args: Record<string, any>,
    fetcher: () => Promise<any>,
  ): Promise<any> {
    const toolCacheHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ toolName, args }))
      .digest('hex');
    const toolCacheKey = `ai:tool:${toolName}:${toolCacheHash}`;

    try {
      const cachedStr = await this.redis.client.get<string | any>(toolCacheKey);
      if (cachedStr) {
        const cachedResult = typeof cachedStr === 'string' ? JSON.parse(cachedStr) : cachedStr;
        this.logger.log(`⚡ Tool Cache Hit for [${toolName}]`);
        return cachedResult;
      }
    } catch (e) {
      this.logger.warn(`Redis tool cache read error: ${e.message}`);
    }

    const result = await fetcher();

    try {
      await this.redis.client.set(toolCacheKey, JSON.stringify(result), {
        ex: AI_LIMITS.REDIS_TOOL_CACHE_TTL_SEC,
      });
    } catch (e) {
      this.logger.warn(`Redis tool cache write error: ${e.message}`);
    }

    return result;
  }

  /**
   * Dispatcher chính cho Function Calls (Strategy Pattern gọn gàng & maintainable)
   */
  private async executeFunctionCall(name: string, args: Record<string, any>): Promise<any> {
    this.logger.log(`🤖 Executing Tool [${name}] with args: ${JSON.stringify(args)}`);
    const handler = this.toolHandlers[name];
    if (!handler) {
      return { error: AI_MESSAGES.UNKNOWN_TOOL };
    }
    try {
      if (name === AI_TOOLS.SUBMIT_CONTACT_REQUEST) {
        // Submit contact là hàm mutation (write DB) -> Không cache Redis
        return await handler(args);
      }
      return await this.getOrSetToolCache(name, args, () => handler(args));
    } catch (err: any) {
      this.logger.error(`Error executing Tool [${name}]: ${err.message}`, err.stack);
      return { error: err.message };
    }
  }

  // =========================================================================
  // TOOL HANDLERS ISOLATED METHODS (Tách nhỏ Handler cho từng Tool dễ bảo trì)
  // =========================================================================

  /**
   * Handler tra cứu Sản phẩm & Thông số kỹ thuật
   */
  private async handleSearchProducts(args: Record<string, any>): Promise<any> {
    const { query, maxPrice } = args;
    const where: any = { status: true };

    if (query) {
      const cleanQ = String(query).trim();
      const unaccentedQ = removeVietnameseAccents(cleanQ);
      const slugQ = unaccentedQ.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const compactQ = unaccentedQ.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Tách từ thông minh loại bỏ ký tự đặc biệt như +, ., -, _
      const rawTerms = cleanQ.split(/[\s+\-_.]+/).filter((t) => t.length > 1);
      const unaccentedTerms = rawTerms.map((t) => removeVietnameseAccents(t));

      where.OR = [
        { name: { contains: cleanQ, mode: 'insensitive' } },
        { name: { contains: unaccentedQ, mode: 'insensitive' } },
        { slug: { contains: slugQ, mode: 'insensitive' } },
        { slug: { contains: unaccentedQ.toLowerCase(), mode: 'insensitive' } },
        { slug: { contains: compactQ, mode: 'insensitive' } },
        { category: { name: { contains: cleanQ, mode: 'insensitive' } } },
        { category: { name: { contains: unaccentedQ, mode: 'insensitive' } } },
        ...rawTerms.map((t) => ({ name: { contains: t, mode: 'insensitive' } })),
        ...unaccentedTerms.map((t) => ({ name: { contains: t, mode: 'insensitive' } })),
        ...unaccentedTerms.map((t) => ({ slug: { contains: t, mode: 'insensitive' } })),
        ...rawTerms.map((t) => ({ category: { name: { contains: t, mode: 'insensitive' } } })),
        ...unaccentedTerms.map((t) => ({ category: { name: { contains: t, mode: 'insensitive' } } })),
      ];
    }

    if (maxPrice) {
      where.price = { lte: Number(maxPrice) };
    }

    let products = await this.prisma.product.findMany({
      where,
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        thumbnailUrl: true,
        category: { select: { name: true } },
        detail: {
          select: {
            contentDetail: true,
            specifications: true,
            features: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (products.length === 0) {
      products = await this.prisma.product.findMany({
        where: { status: true },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          thumbnailUrl: true,
          category: { select: { name: true } },
          detail: {
            select: {
              contentDetail: true,
              specifications: true,
              features: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return {
      total: products.length,
      products: products.map((p) => ({
        name: p.name,
        priceFormatted: p.price
          ? `${p.price.toLocaleString('vi-VN')} VNĐ`
          : AI_MESSAGES.CONTACT_PRICE_FALLBACK,
        category: p.category?.name,
        thumbnailUrl: p.thumbnailUrl,
        specifications: p.detail?.specifications || null,
        features: p.detail?.features || null,
        detailSummary: p.detail?.contentDetail
          ? p.detail.contentDetail.replace(/<[^>]*>?/gm, '').substring(0, 300)
          : null,
      })),
    };
  }

  /**
   * Handler tra cứu Danh mục
   */
  private async handleSearchCategories(args: Record<string, any>): Promise<any> {
    const { query } = args;
    const where: any = { status: true };

    if (query) {
      const cleanQ = String(query).trim();
      const unaccentedQ = removeVietnameseAccents(cleanQ);
      where.OR = [
        { name: { contains: cleanQ, mode: 'insensitive' } },
        { name: { contains: unaccentedQ, mode: 'insensitive' } },
        { slug: { contains: unaccentedQ.toLowerCase(), mode: 'insensitive' } },
      ];
    }

    const categories = await this.prisma.category.findMany({
      where,
      take: 10,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
      },
      orderBy: { orderIndex: 'asc' },
    });

    return {
      total: categories.length,
      categories: categories.map((c) => ({
        name: c.name,
        slug: c.slug,
        imageUrl: c.imageUrl,
      })),
    };
  }

  /**
   * Handler tra cứu Dự án / Công trình
   */
  private async handleSearchProjects(args: Record<string, any>): Promise<any> {
    const { query } = args;
    const where: any = { status: true };

    if (query) {
      const cleanQ = String(query).trim();
      const unaccentedQ = removeVietnameseAccents(cleanQ);
      where.OR = [
        { name: { contains: cleanQ, mode: 'insensitive' } },
        { name: { contains: unaccentedQ, mode: 'insensitive' } },
        { description: { contains: cleanQ, mode: 'insensitive' } },
        { description: { contains: unaccentedQ, mode: 'insensitive' } },
      ];
    }

    let projects = await this.prisma.project.findMany({
      where,
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        coverImage: true,
        isFeatured: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (projects.length === 0) {
      projects = await this.prisma.project.findMany({
        where: { status: true },
        take: 5,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          coverImage: true,
          isFeatured: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return {
      total: projects.length,
      projects: projects.map((pj) => ({
        name: pj.name,
        description: pj.description,
        slug: pj.slug,
        coverImage: pj.coverImage,
        isFeatured: pj.isFeatured,
      })),
    };
  }

  /**
   * Handler tra cứu Tuyển dụng / Việc làm
   */
  private async handleSearchJobs(args: Record<string, any>): Promise<any> {
    const { query } = args;
    const where: any = { status: true };

    if (query) {
      const cleanQ = String(query).trim();
      const unaccentedQ = removeVietnameseAccents(cleanQ);
      where.OR = [
        { title: { contains: cleanQ, mode: 'insensitive' } },
        { title: { contains: unaccentedQ, mode: 'insensitive' } },
        { slug: { contains: unaccentedQ.toLowerCase(), mode: 'insensitive' } },
      ];
    }

    const jobs = await this.prisma.jobPost.findMany({
      where,
      take: 10,
      select: {
        id: true,
        title: true,
        slug: true,
        salary: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      total: jobs.length,
      jobs: jobs.map((j) => ({
        jobId: j.id,
        title: j.title,
        salary: j.salary,
        slug: j.slug,
      })),
    };
  }

  /**
   * Handler tra cứu Thông tin Công ty
   */
  private async handleGetAboutCompany(): Promise<any> {
    const profile = await this.prisma.companyProfile.findUnique({
      where: { id: 'singleton' },
    });

    const facilities = await this.prisma.facility.findMany({
      orderBy: { orderIndex: 'asc' },
      select: { name: true, address: true, phone: true, country: true },
    });

    const historyEvents = await this.prisma.companyHistoryEvent.findMany({
      orderBy: { orderIndex: 'asc' },
      select: { year: true, period: true, text: true },
    });

    const slogan = await this.prisma.companySlogan.findMany({
      orderBy: { orderIndex: 'asc' },
      select: { title: true, description: true },
    });

    return {
      introSummary: profile?.introHtml
        ? profile.introHtml.replace(/<[^>]*>?/gm, '').substring(0, 300)
        : 'Công ty Cổ phần Thanh Bằng là đơn vị hàng đầu chế tạo máy công cụ, máy ép gạch.',
      facilities,
      historyEvents,
      slogans: slogan,
    };
  }

  /**
   * Handler ghi nhận liên hệ / ứng tuyển
   */
  private async handleSubmitContactRequest(args: Record<string, any>): Promise<any> {
    const { fullName, phoneNumber, email, message } = args;
    const newLead = await this.prisma.contactRequest.create({
      data: {
        fullName,
        phoneNumber,
        email: email || null,
        message: message || AI_MESSAGES.CONTACT_DEFAULT_MESSAGE,
        status: 'PENDING',
        priority: 'HIGH',
      },
    });

    return {
      success: true,
      leadId: newLead.id,
      message: AI_MESSAGES.CONTACT_SUBMIT_SUCCESS,
    };
  }

  /**
   * Kiểm tra giới hạn câu hỏi/ngày cho mỗi IP dựa theo AI_LIMITS.DAILY_IP_LIMIT
   */
  async checkDailyIpLimit(clientIp: string): Promise<void> {
    if (!clientIp) return;

    const today = new Date().toISOString().split('T')[0];
    const key = `ai:daily_limit:${clientIp}:${today}`;

    try {
      const currentCountStr = await this.redis.client.get<string | number>(key);
      const currentCount = currentCountStr ? Number(currentCountStr) : 0;

      if (currentCount >= AI_LIMITS.DAILY_IP_LIMIT) {
        this.logger.warn(`⛔ Daily IP limit reached for IP: ${clientIp}`);
        throw new HttpException(
          {
            message: AI_MESSAGES.DAILY_LIMIT_EXCEEDED,
            errorCode: 'DAILY_RATE_LIMIT_EXCEEDED',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      await this.redis.client.set(key, currentCount + 1, { ex: 86400 });
    } catch (e) {
      if (e instanceof HttpException) throw e;
      this.logger.warn(`Redis daily limit check error: ${e.message}`);
    }
  }

  /**
   * Hàm chính xử lý Chat AI
   */
  async chat(dto: AiChatDto, clientIp?: string): Promise<AiChatResponseDto> {
    // 1. Kiểm tra Daily IP Limit (Tối đa DAILY_IP_LIMIT câu/ngày per IP)
    if (clientIp) {
      await this.checkDailyIpLimit(clientIp);
    }

    const cleanMessage = dto.message.trim();
    const sessionId = dto.sessionId || crypto.randomUUID();

    // 2. Kiểm tra Standalone Cache Redis (nếu không có sessionId hoặc câu hỏi trùng lặp)
    const cacheHash = crypto
      .createHash('sha256')
      .update(cleanMessage.toLowerCase())
      .digest('hex');
    const cacheKey = `ai:chat:${cacheHash}`;

    // Mục đích: Nếu câu hỏi trùng khớp 100% với câu hỏi trước đó và KHÔNG nằm trong phiên hội thoại đa lượt,
    // ta trả về câu trả lời đã lưu trong Redis (<10ms) để tiết kiệm 100% chi phí & lượt gọi Gemini API.
    if (!dto.sessionId) {
      try {
        const cachedReply = await this.redis.client.get<string>(cacheKey);
        if (cachedReply) {
          this.logger.log(`⚡ Standalone Cache Hit for prompt: "${cleanMessage.substring(0, 30)}..."`);
          return { reply: cachedReply, cached: true, sessionId };
        }
      } catch (e) {
        this.logger.warn(`Redis get cache error: ${e.message}`);
      }
    }

    // 3. Lấy lịch sử hội thoại trước đó từ Redis Session (nếu có)
    const sessionKey = `ai:session:${sessionId}`;
    let sessionHistory: any[] = [];
    try {
      const existingHistoryStr = await this.redis.client.get<string | any[]>(sessionKey);
      if (existingHistoryStr) {
        sessionHistory = typeof existingHistoryStr === 'string'
          ? JSON.parse(existingHistoryStr)
          : existingHistoryStr;
      }
    } catch (e) {
      this.logger.warn(`Redis get session history error: ${e.message}`);
    }

    // Ghép lịch sử cũ + câu hỏi mới
    const contents: any[] = [
      ...sessionHistory,
      { role: 'user', parts: [{ text: cleanMessage }] },
    ];

    // 4. Thử gọi Gemini với Fallback Models
    let lastError: Error | null = null;

    for (const modelName of this.models) {
      try {
        this.logger.log(`🤖 Attempting Gemini completion with model: ${modelName} (Session: ${sessionId})`);

        let finalReply = '';
        let turns = 0;

        while (turns < AI_LIMITS.MAX_TOOL_TURNS) {
          turns++;
          const response = await this.ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction: await this.getSystemInstruction(),
              temperature: this.temperature,
              maxOutputTokens: AI_LIMITS.MAX_OUTPUT_TOKENS,
              tools: [{ functionDeclarations: this.getToolDeclarations() }],
            },
          });

          const candidate = response.candidates?.[0];
          if (!candidate?.content?.parts) {
            finalReply = response.text || '';
            break;
          }

          // Lưu lượt trả lời của Model vào lịch sử hội thoại của lượt này
          contents.push({ role: 'model', parts: candidate.content.parts });

          const functionCalls = candidate.content.parts.filter((p) => p.functionCall);

          // Nếu không có yêu cầu gọi Tool -> Lấy văn bản trả lời và kết thúc vòng lặp
          if (!functionCalls || functionCalls.length === 0) {
            const textParts = candidate.content.parts
              .map((p) => p.text)
              .filter(Boolean);
            finalReply = textParts.join('\n') || response.text || '';
            break;
          }

          // Thực thi các Tool được yêu cầu
          const functionResponses: any[] = [];
          for (const fcPart of functionCalls) {
            const toolCall = fcPart.functionCall;
            if (toolCall && toolCall.name) {
              const toolResult = await this.executeFunctionCall(
                toolCall.name,
                (toolCall.args as Record<string, any>) || {},
              );
              functionResponses.push({
                functionResponse: {
                  name: toolCall.name,
                  response: { result: toolResult },
                },
              });
            }
          }

          if (functionResponses.length > 0) {
            contents.push({ role: 'user', parts: functionResponses });
          } else {
            break;
          }
        }

        const isErrorFallback = !finalReply || finalReply.startsWith('Xin lỗi');

        if (isErrorFallback) {
          finalReply = AI_MESSAGES.ERROR_FALLBACK;
        } else {
          // 5. Lưu Standalone Cache vào Redis
          try {
            await this.redis.client.set(cacheKey, finalReply, {
              ex: AI_LIMITS.REDIS_CACHE_TTL_SEC,
            });
          } catch (e) {
            this.logger.warn(`Redis set cache error: ${e.message}`);
          }

          // 6. Lưu Session History vào Redis
          try {
            const updatedHistory = [
              ...sessionHistory,
              { role: 'user', parts: [{ text: cleanMessage }] },
              { role: 'model', parts: [{ text: finalReply }] },
            ].slice(-AI_LIMITS.SESSION_MAX_MESSAGES);

            await this.redis.client.set(sessionKey, JSON.stringify(updatedHistory), {
              ex: AI_LIMITS.REDIS_SESSION_TTL_SEC,
            });
          } catch (e) {
            this.logger.warn(`Redis set session history error: ${e.message}`);
          }
        }

        return { reply: finalReply, cached: false, sessionId };
      } catch (err: any) {
        this.logger.error(`Failed with model ${modelName}: ${err.message}`);
        lastError = err;
      }
    }

    throw new Error(
      `${AI_MESSAGES.ALL_MODELS_FAILED} ${lastError?.message}`,
    );
  }
}
