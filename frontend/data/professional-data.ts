export interface Address {
  latitude: string;
  longitude: string;
  number: string;
  office: string;
  city: string;
  state: string;
  country: string;
  neighborhood: string;
  street: string;
  zipcode: string;
}

export interface Specialty {
  Profession: string;
  Approach: string[];
}

export interface Professional {
  id: number;
  name: string;
  specialty: Specialty;
  resume: string;
  email: string;
  photo: string;
  number: string;
  address: Address;
}

export const mockProfessionals: Professional[] = [
  {
    id: 1,
    name: 'Dr. Carlos Mendes',
    specialty: {
      Profession: 'Psicólogo',
      Approach: ['Terapia Cognitivo-Comportamental', 'Psicanálise'],
    },
    resume:
      'Psicólogo com mais de 15 anos de experiência no tratamento de transtornos de ansiedade e depressão. Especialista em terapia cognitivo-comportamental e abordagens integrativas.',
    email: 'carlos.mendes@example.com',
    photo: 'avatar2.svg',
    number: '+5511987654321',
    address: {
      latitude: '-23.5505',
      longitude: '-46.6333',
      number: '123',
      office: 'Centro de Psicologia Integrada',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      neighborhood: 'Jardins',
      street: 'Rua Augusta',
      zipcode: '01305-000',
    },
  },
  {
    id: 2,
    name: 'Naomi Cavalcante',
    specialty: {
      Profession: 'Psicóloga',
      Approach: ['Gestalt psychology', 'TCC'],
    },
    resume:
      'Psicóloga formada na Universidade São José FA, com muita experiência em pacientes diagnosticados com TDAH, possuo uma clínica, onde posso tratar da melhor e mais adequa maneira possível meus pacientes.',
    email: 'na.cavalcante2234@outlook.com',
    photo: 'avatar1.svg',
    number: '+5582993245599',
    address: {
      latitude: '-9.553569319241287',
      longitude: '-35.77570852377799',
      number: '458',
      office: 'Escola da mente',
      city: 'Novo Gama',
      state: 'Goiás',
      country: 'Brasil',
      neighborhood: 'São José',
      street: 'Fazenda São José',
      zipcode: '68962-098',
    },
  },
  {
    id: 3,
    name: 'Darla Santos',
    specialty: {
      Profession: 'Psiquiatra',
      Approach: [],
    },
    resume:
      'Psiquiatra formada na URE-SA, 1 ano de experiência em pacientes diagnosticados com depressão e ansiedade, buscando melhores oportunidades e novos pacientes.',
    email: 'darla_santos9898@gmail.com',
    photo: 'avatar3.svg',
    number: '+55872994593240',
    address: {
      latitude: '37.4267861',
      longitude: '-122.0806032',
      number: '1600',
      office: 'Psicologia Aplicada',
      city: 'San Jose',
      state: 'Califórnia',
      country: 'EUA',
      neighborhood: 'Mountain View',
      street: 'Amphitheatre Parkway',
      zipcode: '94043',
    },
  },
  {
    id: 4,
    name: 'Dr. Marcos Oliveira',
    specialty: {
      Profession: 'Psiquiatra',
      Approach: ['Psiquiatria Biológica', 'Neuropsiquiatria'],
    },
    resume:
      'Médico psiquiatra especializado em transtornos do humor e ansiedade. Experiência em tratamentos farmacológicos e abordagens integrativas para saúde mental.',
    email: 'marcos.oliveira@example.com',
    photo: 'avatar4.svg',
    number: '+5511912345678',
    address: {
      latitude: '-23.5505',
      longitude: '-46.6333',
      number: '456',
      office: 'Clínica Mente Sã',
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil',
      neighborhood: 'Pinheiros',
      street: 'Rua dos Pinheiros',
      zipcode: '05422-000',
    },
  },
  {
    id: 5,
    name: 'Dra. Ana Luiza Costa',
    specialty: {
      Profession: 'Terapeuta',
      Approach: ['Terapia Familiar', 'Terapia de Casal'],
    },
    resume:
      'Terapeuta familiar e de casal com formação em psicologia sistêmica. Especialista em resolução de conflitos e melhoria da comunicação interpessoal.',
    email: 'ana.costa@example.com',
    photo: 'avatar5.svg',
    number: '+5521987654321',
    address: {
      latitude: '-22.9068',
      longitude: '-43.1729',
      number: '789',
      office: 'Centro de Terapia Familiar',
      city: 'Rio de Janeiro',
      state: 'RJ',
      country: 'Brasil',
      neighborhood: 'Copacabana',
      street: 'Avenida Atlântica',
      zipcode: '22070-000',
    },
  },

  {
    id: 6,
    name: 'Isabelly Souza',
    specialty: {
      Profession: 'Terapeuta',
      Approach: ['TCC', 'Gestalt'],
    },
    resume:
      'Psicóloga com 2 anos de experiência profissional, área de atuação: hiperatividade e transtornos de ansiedade e síndrome do pensamento acelerado.',
    email: 'bella.fsw234@gmail.com',
    photo: 'avatar6.svg',
    number: '+55839934537677',
    address: {
      latitude: '-9.553569319241287',
      longitude: '-35.77570852377799',
      number: 'S/N',
      office: 'Centro de Terapia Familiar',
      city: 'Maceió',
      state: 'Alagoas',
      country: 'Brasil',
      neighborhood: 'Cidade Universitária',
      street: 'Av. Lourival Melo Mota',
      zipcode: '57072-970',
    },
  },
  {
    id: 7,
    name: 'Carlos Gonçalves',
    specialty: {
      Profession: 'Psiquiatra',
      Approach: [],
    },
    resume:
      'Psiquiatra com 3 anos de experiência profissional, atuando na área de educação auxiliando e contribuindo para melhorar e analisar a saúde mental de jovens do ensino fundamental e médio nas escolas.',
    email: 'carlosgoncalvessilva789@gmail.com',
    photo: 'avatar7.svg',
    number: '+5583998534000',
    address: {
      latitude: '-9.668312140602707',
      longitude: '-35.72541077430134',
      number: '255-239',
      city: 'Maceió',
      office: 'Centro de Terapia Familiar',
      state: 'Alagoas',
      country: 'Brasil',
      street: 'Av. Comendador Leao',
      neighborhood: 'Jaraguá',
      zipcode: '57022-240',
    },
  },
];

export const getAllProfessions = (): string[] => {
  const professions = new Set<string>();
  mockProfessionals.forEach((professional) => {
    professions.add(professional.specialty.Profession);
  });
  return Array.from(professions);
};

export const getAllApproaches = (): string[] => {
  const approaches = new Set<string>();
  mockProfessionals.forEach((professional) => {
    professional.specialty.Approach.forEach((approach) => {
      approaches.add(approach);
    });
  });
  return Array.from(approaches);
};

export const getProfessionalById = (id: number): Professional | undefined => {
  return mockProfessionals.find((professional) => professional.id === id);
};
