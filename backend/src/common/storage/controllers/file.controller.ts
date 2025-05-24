import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { StorageService } from '../services/storage.service';
import { Public } from '../../decorators/is-public.decorator';

@ApiTags('files')
@Controller('files')
export class FileController {
  constructor(private readonly storageService: StorageService) {}

  @Public()
  @ApiOperation({ summary: 'Get file by key' })
  @ApiResponse({ status: 200, description: 'File stream' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @Get('*')
  async getFile(@Param('0') fileKey: string, @Res() res: Response) {
    const exists = await this.storageService.fileExists(fileKey);

    if (!exists) {
      throw new NotFoundException('File not found');
    }

    const stream = await this.storageService.getFileStream(fileKey);

    // Set appropriate headers based on file type
    const mimeType = this.getMimeType(fileKey);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year

    stream.pipe(res);
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();

    const mimeTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }
}
