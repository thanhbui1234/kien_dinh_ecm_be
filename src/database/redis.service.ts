import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);
  public client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
    const token = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

    if (!url || !token) {
      this.logger.error('Upstash Redis credentials are not configured');
      return;
    }

    try {
      this.client = new Redis({
        url,
        token,
      });
      this.logger.log('Upstash Redis client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Upstash Redis client', error);
    }
  }
}
