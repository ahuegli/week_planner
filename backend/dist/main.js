"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const useDatabase = process.env.USE_DATABASE !== 'false';
    console.log(`Running in ${useDatabase ? 'DATABASE' : 'MOCK'} mode`);
    app.enableCors({
        origin: [
            'http://localhost:4200',
            'http://localhost:4300',
            'http://localhost:4301',
            'http://localhost:3000',
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
    }));
    app.setGlobalPrefix('api/v1');
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`Backend running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map