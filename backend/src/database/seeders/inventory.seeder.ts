import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../../modules/inventory/entities/inventory.entity';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seed script to create standard psychological assessment inventories
 * Run with: yarn seed:inventories
 */
async function bootstrap() {
  const logger = new Logger('InventorySeeder');
  logger.log('Starting psychological assessments seeding...');

  // Create a standalone NestJS application
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get the inventory repository directly instead of using the service
    const inventoryRepository = app.get<Repository<Inventory>>(
      getRepositoryToken(Inventory),
    );

    // Define assessments to import
    const assessmentFiles = [
      { name: 'DASS-21', filename: 'dass21_ptbr.json' },
      { name: 'GAD-7', filename: 'gad7_ptbr.json' },
      { name: 'PHQ-9', filename: 'phq9_ptbr.json' },
      { name: 'PSS-10', filename: 'pss10_ptbr.json' },
    ];

    // Directory where assessment JSON files are stored
    const dataDir = path.join(__dirname, '../data');

    // Import each assessment
    for (const assessment of assessmentFiles) {
      try {
        logger.log(`Importing ${assessment.name} assessment...`);

        // Read the JSON file
        const filePath = path.join(dataDir, assessment.filename);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const assessmentData = JSON.parse(fileContent);

        // Check if inventory already exists
        const existingInventory = await inventoryRepository.findOne({
          where: { name: assessmentData.id },
        });

        if (existingInventory) {
          logger.log(`${assessment.name} already exists in the database`);
          continue;
        }

        // Create inventory directly
        const inventory = inventoryRepository.create({
          name: assessmentData.name,
          title: assessmentData.title,
          description: assessmentData.description,
          disclaimer: assessmentData.disclaimer,
          version: assessmentData.version,
          source: assessmentData.source,
          questions: assessmentData.questions,
          scoring: assessmentData.scoring,
        });

        await inventoryRepository.save(inventory);
        logger.log(`Successfully imported ${assessment.name}`);
      } catch (error) {
        // Log any errors during import
        logger.error(
          `Error importing ${assessment.name}: ${error.message}`,
          error.stack,
        );
      }
    }

    logger.log('Psychological assessments seeding completed successfully');
  } catch (error) {
    logger.error(`Error during seeding: ${error.message}`, error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
