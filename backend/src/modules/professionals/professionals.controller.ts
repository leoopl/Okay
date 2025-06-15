import { Controller, Get, Query, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProfessionalService } from './professionals.service';
import { SearchProfessionalsDto } from './dto/search-professional.dto';
import { SearchProfessionalsResponseDto } from './dto/professional-response.dto';

@ApiTags('professionals')
@Controller('professionals')
export class ProfessionalController {
  constructor(private readonly professionalService: ProfessionalService) {}

  /**
   * Searches professionals with comprehensive filtering and pagination
   * @param searchParams - Search criteria and pagination parameters
   * @returns Paginated list of professionals matching the search criteria
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search professionals with filters',
    description:
      'Search professionals by CBO, SUS attendance, municipality, text, and location with pagination support',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved professionals',
    type: SearchProfessionalsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid search parameters',
  })
  @ApiQuery({
    name: 'professionalCbo',
    required: false,
    description: 'Filter by professional CBO code',
    example: '225125',
  })
  @ApiQuery({
    name: 'professionalAtendeSus',
    required: false,
    description: 'Filter by SUS attendance',
    example: 'true',
  })
  @ApiQuery({
    name: 'municipio',
    required: false,
    description: 'Filter by municipality',
    example: 'São Paulo',
  })
  @ApiQuery({
    name: 'textSearch',
    required: false,
    description: 'Search in fantasy name and professional name',
    example: 'Hospital Central',
  })
  @ApiQuery({
    name: 'locationSearch',
    required: false,
    description: 'Search in address',
    example: 'Rua das Flores',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  async searchProfessionals(
    @Query() searchParams: SearchProfessionalsDto,
  ): Promise<SearchProfessionalsResponseDto> {
    return this.professionalService.searchProfessionals(searchParams);
  }
}
