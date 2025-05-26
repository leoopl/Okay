import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  mixin,
  Type,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';

export interface FileUploadOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  fieldName?: string;
}

// Create a mixin factory function
export function FileUploadInterceptor(
  options?: FileUploadOptions,
): Type<NestInterceptor> {
  @Injectable()
  class FileUploadInterceptorMixin implements NestInterceptor {
    private readonly defaultMaxSize: number;
    private readonly defaultAllowedTypes: string[];

    constructor(private configService: ConfigService) {
      this.defaultMaxSize = this.configService.get<number>(
        'MAX_FILE_SIZE',
        5 * 1024 * 1024,
      ); // 5MB
      this.defaultAllowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const request = context.switchToHttp().getRequest();
      const file = request.file;

      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      // Validate file size
      const maxSize = options?.maxFileSize || this.defaultMaxSize;
      if (file.size > maxSize) {
        throw new BadRequestException(
          `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
        );
      }

      // Validate mime type
      const allowedTypes =
        options?.allowedMimeTypes || this.defaultAllowedTypes;
      if (!allowedTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        );
      }

      return next.handle();
    }
  }

  return mixin(FileUploadInterceptorMixin);
}
