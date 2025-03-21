/* eslint-disable @typescript-eslint/no-unused-vars */
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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserProfile } from './dto/user-profile.dto';
import { Auth0Guard } from '../../core/auth/guards/auth0.guard';
import { IAuthenticatedRequest } from '../../common/interfaces/auth-request.interface';
import { PoliciesGuard } from '../../core/casl/guards/policies.guard';
import { CheckPolicies } from '../../core/casl/decorators/check-policies.decorator';
import {
  ReadUserPolicyHandler,
  UpdateUserPolicyHandler,
} from '../../core/casl/policies/resource.policies';
import { Action } from '../../core/casl/types/ability.type';
import { User } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth('Auth0')
@UseGuards(Auth0Guard)
export class UserController {
  constructor(private readonly userService: UserService) {}

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

  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'List of all users',
    type: [UserProfile],
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, User))
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
  @UseGuards(PoliciesGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: IAuthenticatedRequest) {
    // Apply policy check
    const policyHandler = new ReadUserPolicyHandler(id);

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
  @UseGuards(PoliciesGuard)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: IAuthenticatedRequest,
  ) {
    // Apply policy check
    const policyHandler = new UpdateUserPolicyHandler(id);

    const user = await this.userService.update(
      id,
      updateUserDto,
      req.user.userId,
    );
    return new UserProfile(user);
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
  @UseGuards(PoliciesGuard)
  @Patch(':id/consent')
  async updateConsent(
    @Param('id') id: string,
    @Body()
    consentData: {
      dataProcessing?: boolean;
      research?: boolean;
      marketing?: boolean;
    },
    @Req() req: IAuthenticatedRequest,
  ) {
    // Apply policy check
    const policyHandler = new UpdateUserPolicyHandler(id);

    const user = await this.userService.updateConsent(
      id,
      {
        dataProcessing: consentData.dataProcessing,
        research: consentData.research,
        marketing: consentData.marketing,
      },
      req.user.userId,
    );

    return new UserProfile(user);
  }

  @ApiOperation({ summary: 'Add a role to a user' })
  @ApiResponse({
    status: 200,
    description: 'Role added successfully',
    type: UserProfile,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, User))
  @Patch(':id/roles/:roleName')
  async addRole(
    @Param('id') id: string,
    @Param('roleName') roleName: string,
    @Req() req: IAuthenticatedRequest,
  ) {
    const user = await this.userService.addRole(id, roleName, req.user.userId);
    return new UserProfile(user);
  }

  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiResponse({
    status: 200,
    description: 'Role removed successfully',
    type: UserProfile,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, User))
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

  @ApiOperation({ summary: 'Delete a user' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability) => ability.can(Action.Manage, User))
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Req() req: IAuthenticatedRequest) {
    await this.userService.remove(id, req.user.userId);
  }
}
