import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用 CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 全局响应拦截器（统一响应格式）
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

  // 全局异常过滤器
  app.useGlobalFilters(
    new AllExceptionsFilter(),    // 捕获所有异常
    new HttpExceptionFilter(),    // 处理 HTTP 异常
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}
bootstrap();
