import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  Logger,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { StorageService } from '../services/storage.service';
import { Public } from '../../decorators/is-public.decorator';

@ApiTags('files')
@Controller('files')
export class FileController {
  private readonly logger = new Logger(FileController.name);

  constructor(private readonly storageService: StorageService) {}

  @Public()
  @ApiOperation({ summary: 'Get file by key' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  @Header('Access-Control-Allow-Headers', 'Content-Type, Accept, Range')
  @Get('*')
  async getFile(@Param('0') fileKey: string, @Res() res: Response) {
    this.logger.log(`Serving file request: ${fileKey}`);

    try {
      const exists = await this.storageService.fileExists(fileKey);

      if (!exists) {
        this.logger.warn(`File not found: ${fileKey}`);
        throw new NotFoundException('File not found');
      }

      // Get file stream
      const stream = await this.storageService.getFileStream(fileKey);

      // Determine mime type
      const mimeType = this.getMimeType(fileKey);

      // Set comprehensive headers for image serving
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept, Range',
      );
      res.setHeader(
        'Access-Control-Expose-Headers',
        'Content-Length, Content-Type',
      );
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Debug headers
      res.setHeader('X-File-Key', fileKey);
      res.setHeader('X-Mime-Type', mimeType);

      this.logger.log(`Successfully serving file: ${fileKey} as ${mimeType}`);

      // Handle range requests for better compatibility
      const range = res.req.headers.range;
      if (range && mimeType.startsWith('image/')) {
        // For images, we don't need range support typically, but some browsers request it
        res.setHeader('Accept-Ranges', 'bytes');
      }

      // Pipe the stream to response
      stream.on('error', (error) => {
        this.logger.error(`Stream error for file ${fileKey}:`, error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' });
        }
      });

      stream.pipe(res);
    } catch (error) {
      this.logger.error(`Error serving file ${fileKey}:`, error);

      if (error instanceof NotFoundException) {
        res.status(404).json({ error: 'File not found' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Handle OPTIONS requests for CORS preflight
  @Public()
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  @Header('Access-Control-Allow-Headers', 'Content-Type, Accept, Range')
  @Header('Access-Control-Max-Age', '86400')
  async handleOptions(@Res() res: Response) {
    res.status(200).end();
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
