"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const response_wrapper_interceptor_1 = require("./common/interceptors/response-wrapper.interceptor");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule, {
            logger: ['log', 'error', 'warn', 'debug', 'verbose'],
        });
        app.use((0, helmet_1.default)());
        app.enableCors({
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            credentials: true,
        });
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: { enableImplicitConversion: true },
        }));
        app.useGlobalInterceptors(new response_wrapper_interceptor_1.ResponseWrapperInterceptor());
        app.setGlobalPrefix('api');
        const port = process.env.PORT || 3000;
        await app.listen(port);
        logger.log(`Server running on http://localhost:${port}`);
        logger.log(`API available at http://localhost:${port}/api`);
    }
    catch (error) {
        logger.error('Failed to start server:', error.message);
        if (error.message?.includes('database') || error.code === 'ECONNREFUSED') {
            logger.warn('PostgreSQL is not available. Please start PostgreSQL and set DATABASE_URL in .env');
            logger.warn('Install PostgreSQL: https://www.postgresql.org/download/');
        }
        process.exit(1);
    }
}
bootstrap();
//# sourceMappingURL=main.js.map