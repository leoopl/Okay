import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Professional } from './entities/professional.entity';
import { SearchProfessionalsDto } from './dto/search-professional.dto';
import {
  ProfessionalResponseDto,
  SearchProfessionalsResponseDto,
  SearchMetadataDto,
} from './dto/professional-response.dto';

@Injectable()
export class ProfessionalService {
  constructor(
    @InjectRepository(Professional)
    private readonly professionalRepository: Repository<Professional>,
  ) {}

  /**
   * Searches professionals based on multiple criteria with pagination
   * @param searchParams - Search parameters and pagination options
   * @returns Paginated search results with metadata
   */
  async searchProfessionals(
    searchParams: SearchProfessionalsDto,
  ): Promise<SearchProfessionalsResponseDto> {
    const queryBuilder = this.createBaseQuery();
    this.applyFilters(queryBuilder, searchParams);
    this.applyPagination(queryBuilder, searchParams);

    const [professionals, totalItems] = await queryBuilder.getManyAndCount();
    const metadata = this.calculateMetadata(searchParams, totalItems);
    const professionalDtos = this.mapToProfessionalResponseDtos(professionals);

    return {
      professionals: professionalDtos,
      metadata,
    };
  }

  private createBaseQuery(): SelectQueryBuilder<Professional> {
    return this.professionalRepository
      .createQueryBuilder('professional')
      .select([
        'professional.id',
        'professional.nomeFantasia',
        'professional.profissionalNome',
        'professional.municipio',
        'professional.unidadeFederativa',
        'professional.professionalCbo',
        'professional.professionalAtendeSus',
        'professional.logradouro',
        'professional.telefone',
        'professional.tipoUnidade',
        'professional.profissionalVinculo',
      ]);
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<Professional>,
    searchParams: SearchProfessionalsDto,
  ): void {
    this.applyExactFilters(queryBuilder, searchParams);
    this.applyTextSearchFilter(queryBuilder, searchParams);
    this.applyLocationSearchFilter(queryBuilder, searchParams);
  }

  private applyExactFilters(
    queryBuilder: SelectQueryBuilder<Professional>,
    searchParams: SearchProfessionalsDto,
  ): void {
    if (searchParams.professionalCbo) {
      queryBuilder.andWhere('professional.professionalCbo = :professionalCbo', {
        professionalCbo: searchParams.professionalCbo,
      });
    }

    if (searchParams.professionalAtendeSus !== undefined) {
      queryBuilder.andWhere(
        'professional.professionalAtendeSus = :professionalAtendeSus',
        {
          professionalAtendeSus: searchParams.professionalAtendeSus,
        },
      );
    }

    if (searchParams.municipio) {
      queryBuilder.andWhere('professional.municipio ILIKE :municipio', {
        municipio: `%${searchParams.municipio}%`,
      });
    }
  }

  private applyTextSearchFilter(
    queryBuilder: SelectQueryBuilder<Professional>,
    searchParams: SearchProfessionalsDto,
  ): void {
    if (!searchParams.textSearch) return;

    const searchTerm = searchParams.textSearch.trim();
    queryBuilder.andWhere(
      `(
        to_tsvector('portuguese', professional.nomeFantasia) @@ plainto_tsquery('portuguese', :fullTextSearch) OR 
        to_tsvector('portuguese', professional.profissionalNome) @@ plainto_tsquery('portuguese', :fullTextSearch) OR
        professional.nomeFantasia ILIKE :likeTextSearch OR 
        professional.profissionalNome ILIKE :likeTextSearch
      )`,
      {
        fullTextSearch: searchTerm,
        likeTextSearch: `%${searchTerm}%`,
      },
    );
  }

  private applyLocationSearchFilter(
    queryBuilder: SelectQueryBuilder<Professional>,
    searchParams: SearchProfessionalsDto,
  ): void {
    if (!searchParams.locationSearch) return;

    const locationTerm = searchParams.locationSearch.trim();
    queryBuilder.andWhere(
      `(
        to_tsvector('portuguese', professional.logradouro) @@ plainto_tsquery('portuguese', :fullTextLocation) OR
        professional.logradouro ILIKE :likeLocationSearch
      )`,
      {
        fullTextLocation: locationTerm,
        likeLocationSearch: `%${locationTerm}%`,
      },
    );
  }

  private applyPagination(
    queryBuilder: SelectQueryBuilder<Professional>,
    searchParams: SearchProfessionalsDto,
  ): void {
    const offset = (searchParams.page! - 1) * searchParams.limit!;
    queryBuilder.skip(offset).take(searchParams.limit!);
  }

  private calculateMetadata(
    searchParams: SearchProfessionalsDto,
    totalItems: number,
  ): SearchMetadataDto {
    const currentPage = searchParams.page!;
    const itemsPerPage = searchParams.limit!;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPreviousPage = currentPage > 1;

    return {
      currentPage,
      itemsPerPage,
      totalItems,
      totalPages,
      hasNextPage,
      hasPreviousPage,
    };
  }

  private mapToProfessionalResponseDtos(
    professionals: Professional[],
  ): ProfessionalResponseDto[] {
    return professionals.map((professional) => ({
      id: professional.id,
      nomeFantasia: professional.nomeFantasia,
      profissionalNome: professional.profissionalNome,
      municipio: professional.municipio,
      unidadeFederativa: professional.unidadeFederativa,
      professionalCbo: professional.professionalCbo,
      professionalAtendeSus: professional.professionalAtendeSus,
      logradouro: professional.logradouro,
      telefone: professional.telefone,
      tipoUnidade: professional.tipoUnidade,
      profissionalVinculo: professional.profissionalVinculo,
    }));
  }
}
