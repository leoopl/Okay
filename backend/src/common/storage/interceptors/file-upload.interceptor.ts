import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';

export interface FileUploadOptions {
  maxFileSize?: number;
  allowedMimeTypes?: string[];
  fieldName?: string;
}

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private readonly defaultMaxSize: number;
  private readonly defaultAllowedTypes: string[];

  constructor(
    private configService: ConfigService,
    private options?: FileUploadOptions,
  ) {
    this.defaultMaxSize = this.configService.get<number>('MAX_FILE_SIZE');
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
    const maxSize = this.options?.maxFileSize || this.defaultMaxSize;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      );
    }

    // Validate mime type
    const allowedTypes =
      this.options?.allowedMimeTypes || this.defaultAllowedTypes;
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    return next.handle();
  }
}
