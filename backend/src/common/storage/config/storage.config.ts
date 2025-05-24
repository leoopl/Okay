import { registerAs } from '@nestjs/config';
import { StorageProvider } from '../interfaces/storage-provider.interface';

export default registerAs('storage', () => ({
  provider: process.env.STORAGE_PROVIDER || StorageProvider.LOCAL,

  local: {
    uploadPath: process.env.UPLOAD_PATH,
    baseUrl: process.env.BASE_URL,
  },

  fileUpload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10), // 5MB
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(','),
  },
}));
