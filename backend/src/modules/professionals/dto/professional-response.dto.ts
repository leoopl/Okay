import { ApiProperty } from '@nestjs/swagger';

export class ProfessionalResponseDto {
  @ApiProperty({ description: 'Professional ID' })
  id: number;

  @ApiProperty({ description: 'Fantasy name of the establishment' })
  nomeFantasia: string;

  @ApiProperty({ description: 'Professional name' })
  profissionalNome: string;

  @ApiProperty({ description: 'Municipality' })
  municipio: string;

  @ApiProperty({ description: 'State' })
  unidadeFederativa: string;

  @ApiProperty({ description: 'Professional CBO code' })
  professionalCbo: string;

  @ApiProperty({ description: 'Whether professional attends SUS' })
  professionalAtendeSus: boolean;

  @ApiProperty({ description: 'Address' })
  logradouro: string;

  @ApiProperty({ description: 'Phone number', nullable: true })
  telefone: string | null;

  @ApiProperty({ description: 'Type of unit' })
  tipoUnidade: string;

  @ApiProperty({ description: 'Professional bond type' })
  profissionalVinculo: string;
}

export class SearchMetadataDto {
  @ApiProperty({ description: 'Current page number' })
  currentPage: number;

  @ApiProperty({ description: 'Number of items per page' })
  itemsPerPage: number;

  @ApiProperty({ description: 'Total number of items' })
  totalItems: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPreviousPage: boolean;
}

export class SearchProfessionalsResponseDto {
  @ApiProperty({
    description: 'Array of professionals',
    type: [ProfessionalResponseDto],
  })
  professionals: ProfessionalResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: SearchMetadataDto,
  })
  metadata: SearchMetadataDto;
}
