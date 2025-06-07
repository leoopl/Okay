import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  UnauthorizedException,
  ParseUUIDPipe,
  UploadedFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserProfile } from './dto/user-profile.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/is-public.decorator';
import { IAuthenticatedRequest } from '../../core/auth/interfaces/auth-request.interface';
import { ChangePasswordDto } from './dto/change-password.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadInterceptor } from 'src/common/storage/interceptors/file-upload.interceptor';
import { AuthService } from 'src/core/auth/services/auth.service';

@ApiTags('users')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth('JWT')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserProfile,
  })
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    return new UserProfile(user);
  }

  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
    type: [UserProfile],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async findAll() {
    const users = await this.userService.findAll();
    return users.map((user) => new UserProfile(user));
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserProfile,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: IAuthenticatedRequest) {
    const user = await this.userService.findOne(req.user.userId);
    return new UserProfile(user);
  }

  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User details', type: UserProfile })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: IAuthenticatedRequest) {
    // Users can only access their own profile unless they're admins
    if (id !== req.user.userId && !req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You can only access your own user profile');
    }

    const user = await this.userService.findOne(id);
    return new UserProfile(user);
  }

  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserProfile,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: IAuthenticatedRequest,
  ) {
    // Users can only update their own profile unless they're admins
    if (id !== req.user.userId && !req.user.roles?.includes('admin')) {
      throw new ForbiddenException('You can only update your own user profile');
    }

    const user = await this.userService.update(
      id,
      updateUserDto,
      req.user.userId,
    );
    return new UserProfile(user);
  }

  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiResponse({
    status: 200,
    description: 'Profile picture uploaded successfully',
    type: UserProfile,
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard)
  @Post(':id/profile-picture')
  @UseInterceptors(
    FileInterceptor('file'),
    FileUploadInterceptor(), // Call as a function with optional options
  )
  async uploadProfilePicture(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: IAuthenticatedRequest,
  ) {
    // Users can only update their own profile picture unless they're admins
    if (id !== req.user.userId && !req.user.roles?.includes('admin')) {
      throw new ForbiddenException(
        'You can only update your own profile picture',
      );
    }

    const user = await this.userService.uploadProfilePicture(
      id,
      file,
      req.user.userId,
    );
    return new UserProfile(user);
  }

  @ApiOperation({ summary: 'Delete profile picture' })
  @ApiResponse({
    status: 200,
    description: 'Profile picture deleted successfully',
    type: UserProfile,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @UseGuards(JwtAuthGuard)
  @Delete(':id/profile-picture')
  async deleteProfilePicture(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: IAuthenticatedRequest,
  ) {
    // Users can only delete their own profile picture unless they're admins
    if (id !== req.user.userId && !req.user.roles?.includes('admin')) {
      throw new ForbiddenException(
        'You can only delete your own profile picture',
      );
    }

    const user = await this.userService.deleteProfilePicture(
      id,
      req.user.userId,
    );
    return new UserProfile(user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  @Post('update-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() passwordData: ChangePasswordDto,
    @Req() req: IAuthenticatedRequest,
  ) {
    // Verify current password first
    const user = await this.authService.validateUser(
      req.user.email,
      passwordData.currentPassword,
    );

    if (!user) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Change to new password
    await this.userService.updatePassword(
      req.user.userId,
      passwordData.newPassword,
    );

    return { message: 'Password updated successfully' };
  }

  @ApiOperation({ summary: 'Update user consent settings' })
  @ApiResponse({
    status: 200,
    description: 'Consent updated successfully',
    type: UserProfile,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @UseGuards(JwtAuthGuard)
  @Patch(':id/consent')
  async updateConsent(
    @Param('id') id: string,
    @Req() req: IAuthenticatedRequest,
  ) {
    // Users can only update their own consent unless they're admins
    if (id !== req.user.userId && !req.user.roles?.includes('admin')) {
      throw new ForbiddenException(
        'You can only update your own consent settings',
      );
    }

    const user = await this.userService.updateConsent(id, req.user.userId);

    return new UserProfile(user);
  }

  @ApiOperation({ summary: 'Add a role to a user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Role added successfully',
    type: UserProfile,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/roles/:roleName')
  async addRole(
    @Param('id') id: string,
    @Param('roleName') roleName: string,
    @Req() req: IAuthenticatedRequest,
  ) {
    const user = await this.userService.addRole(id, roleName, req.user.userId);
    return new UserProfile(user);
  }

  @ApiOperation({ summary: 'Remove a role from a user (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Role removed successfully',
    type: UserProfile,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id/roles/:roleName')
  async removeRole(
    @Param('id') id: string,
    @Param('roleName') roleName: string,
    @Req() req: IAuthenticatedRequest,
  ) {
    const user = await this.userService.removeRole(
      id,
      roleName,
      req.user.userId,
    );
    return new UserProfile(user);
  }

  @ApiOperation({ summary: 'Delete a user (Admin only)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - requires admin role' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: IAuthenticatedRequest) {
    await this.userService.remove(id, req.user.userId);
  }
}
