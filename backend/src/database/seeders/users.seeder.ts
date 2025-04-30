import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../../modules/user/entities/user.entity';
import { Role } from '../../modules/user/entities/role.entity';

/**
 * Seed script to create default users
 * Run with: yarn seed:users
 */
async function bootstrap() {
  const logger = new Logger('UsersSeeder');
  logger.log('Starting users seeding...');

  // Create a standalone NestJS application
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    // Get the repositories
    const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    const roleRepository = app.get<Repository<Role>>(getRepositoryToken(Role));

    // Find the admin and patient roles
    const adminRole = await roleRepository.findOne({
      where: { name: 'admin' },
    });
    const patientRole = await roleRepository.findOne({
      where: { name: 'patient' },
    });

    if (!adminRole || !patientRole) {
      logger.error(
        'Required roles not found. Please run the roles seeder first.',
      );
      return;
    }

    // Define user data
    const usersData = [
      {
        email: 'admin@admin.com',
        name: 'Admin',
        surname: 'User',
        password: 'Admin0021!',
        status: UserStatus.ACTIVE,
        roles: [adminRole],
        consentToDataProcessing: true,
        consentToResearch: true,
        consentToMarketing: true,
      },
      {
        email: 'patient@patient.com',
        name: 'Patient',
        surname: 'User',
        password: 'Patient0021!',
        status: UserStatus.ACTIVE,
        roles: [patientRole],
        consentToDataProcessing: true,
        consentToResearch: true,
        consentToMarketing: true,
      },
    ];

    // Create users if they don't exist
    for (const userData of usersData) {
      const existingUser = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (!existingUser) {
        // Create a new user
        const newUser = userRepository.create(userData);

        // When we use create(), User entity's @BeforeInsert hook will hash the password
        await userRepository.save(newUser);
        logger.log(
          `Created user: ${userData.email} with role: ${userData.roles[0].name}`,
        );
      } else {
        logger.log(`User already exists: ${userData.email}`);
      }
    }

    logger.log('Users seeding completed successfully');
  } catch (error) {
    logger.error(`Error during seeding: ${error.message}`, error.stack);
  } finally {
    await app.close();
  }
}

bootstrap();
