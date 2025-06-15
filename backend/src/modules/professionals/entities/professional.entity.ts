import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('professionals')
@Index('idx_professionals_atende_sus', ['professionalAtendeSus'])
@Index('idx_professionals_cbo', ['professionalCbo'])
@Index('idx_professionals_municipio', ['municipio'])
@Index('idx_professionals_text_search', ['nomeFantasia', 'profissionalNome'])
@Index('idx_professionals_composite_filters', [
  'municipio',
  'professionalCbo',
  'professionalAtendeSus',
])
export class Professional {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'dt_comp', type: 'varchar', nullable: true })
  dataCompetencia: string;

  @Column({ name: 'uf', type: 'varchar', length: 2 })
  unidadeFederativa: string;

  @Column({ name: 'municipio', type: 'varchar' })
  municipio: string;

  @Column({ name: 'cnes', type: 'integer', nullable: true })
  codigoCnes: number;

  @Column({ name: 'nome_fantasia', type: 'varchar' })
  nomeFantasia: string;

  @Column({ name: 'tipo_unidade', type: 'varchar' })
  tipoUnidade: string;

  @Column({ name: 'natureza_juridica', type: 'varchar' })
  naturezaJuridica: string;

  @Column({ name: 'gestao', type: 'varchar' })
  gestao: string;

  @Column({ name: 'profissional_nome', type: 'varchar' })
  profissionalNome: string;

  @Column({ name: 'profissional_cns', type: 'bigint', nullable: true })
  profissionalCns: number;

  @Column({ name: 'profissional_atende_sus', type: 'boolean' })
  professionalAtendeSus: boolean;

  @Column({ name: 'profissional_cbo', type: 'varchar' })
  professionalCbo: string;

  @Column({ name: 'profissional_vinculo', type: 'varchar' })
  profissionalVinculo: string;

  @Column({ name: 'atendimento_prestado', type: 'varchar' })
  atendimentoPrestado: string;

  @Column({ name: 'nivel_atencao', type: 'varchar' })
  nivelAtencao: string;

  @Column({ name: 'convenio_sus', type: 'varchar' })
  convenioSus: string;

  @Column({ name: 'telefone', type: 'varchar', nullable: true })
  telefone: string;

  @Column({ name: 'logradouro', type: 'varchar' })
  logradouro: string;

  @Column({ name: 'complemento', type: 'varchar', nullable: true })
  complemento: string;
}
