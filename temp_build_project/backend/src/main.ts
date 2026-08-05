import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ResponseWrapperInterceptor } from './common/interceptors/response-wrapper.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['log', 'error', 'warn', 'debug', 'verbose'],
    });

    app.use(helmet());
    app.enableCors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new ResponseWrapperInterceptor());

    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`Server running on http://localhost:${port}`);
    logger.log(`API available at http://localhost:${port}/api`);
  } catch (error) {
    logger.error('Failed to start server:', error.message);
    if (error.message?.includes('database') || error.code === 'ECONNREFUSED') {
      logger.warn('PostgreSQL is not available. Please start PostgreSQL and set DATABASE_URL in .env');
      logger.warn('Install PostgreSQL: https://www.postgresql.org/download/');
    }
    process.exit(1);
  }
}
bootstrap();
