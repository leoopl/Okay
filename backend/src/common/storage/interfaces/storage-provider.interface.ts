export interface IStorageProvider {
  upload(file: Express.Multer.File, path: string): Promise<StorageResult>;
  delete(fileKey: string): Promise<void>;
  getUrl(fileKey: string): string;
  getStream(fileKey: string): Promise<NodeJS.ReadableStream>;
  exists(fileKey: string): Promise<boolean>;
}

export interface StorageResult {
  key: string;
  url: string;
  size: number;
  mimetype: string;
  provider: string;
}

export enum StorageProvider {
  LOCAL = 'local',
  //   S3 = 's3',
  //   AZURE = 'azure',
  //   GCS = 'gcs',
}
