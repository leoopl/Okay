import type { BreathingDurations } from '@/hooks/use-breathing-animation';

export type BreathingTone = 'earth' | 'sky' | 'sage' | 'lavender' | 'mint' | 'sand';

export interface BreathingReference {
  citation: string;
  url: string;
}

export interface BreathingTechnique {
  id: number;
  name: string;
  /** One line on the card saying what the technique is for (max. 60 characters). */
  purpose: string;
  desc: string;
  /** Seconds for [Inspire, Segure, Expire, Espere]; 0 skips the phase. */
  secs: BreathingDurations;
  tone: BreathingTone;
  references: readonly BreathingReference[];
}

const ZACCARO_2018: BreathingReference = {
  citation:
    'Zaccaro et al. (2018). How Breath-Control Can Change Your Life: A Systematic Review on Psycho-Physiological Correlates of Slow Breathing. Frontiers in Human Neuroscience.',
  url: 'https://doi.org/10.3389/fnhum.2018.00353',
};

export const breathingTechniques: readonly BreathingTechnique[] = [
  {
    id: 1,
    name: 'Respiração de Caixa',
    purpose: 'Ajuda a acalmar a mente em momentos de estresse',
    desc: 'Também chamada de Respiração Quadrada, tem quatro etapas com a mesma duração, como os lados de um quadrado. Tem raízes no yoga e ficou conhecida por ser ensinada a militares e policiais para manter a calma sob pressão. Em um estudo com 108 pessoas, praticar 5 minutos por dia durante um mês reduziu a ansiedade e melhorou o humor. Inspire por 4 segundos, segure por 4, expire por 4 e segure por mais 4, sem forçar.',
    secs: [4, 4, 4, 4],
    tone: 'earth',
    references: [
      {
        citation:
          'Balban et al. (2023). Brief structured respiration practices enhance mood and reduce physiological arousal. Cell Reports Medicine.',
        url: 'https://doi.org/10.1016/j.xcrm.2022.100895',
      },
      {
        citation: 'Cleveland Clinic (2021). How Box Breathing Can Help You Destress.',
        url: 'https://health.clevelandclinic.org/box-breathing-benefits',
      },
    ],
  },
  {
    id: 2,
    name: 'Respiração 4-7-8',
    purpose: 'Acalma o corpo e ajuda a relaxar antes de dormir',
    desc: 'Vem do pranayama, a respiração do yoga, e foi popularizada pelo médico Andrew Weil como uma "respiração relaxante". Um estudo com adultos jovens mostrou queda da frequência cardíaca e da pressão arterial logo após a prática, e muitas pessoas a usam para relaxar antes de dormir. Inspire pelo nariz por 4 segundos, segure por 7 e solte o ar pela boca por 8. Se estiver começando, faça no máximo 4 ciclos.',
    secs: [4, 7, 8, 0],
    tone: 'sky',
    references: [
      {
        citation:
          'Vierra et al. (2022). Effects of sleep deprivation and 4-7-8 breathing control on heart rate variability, blood pressure, blood glucose, and endothelial function in healthy young adults. Physiological Reports.',
        url: 'https://doi.org/10.14814/phy2.15389',
      },
      {
        citation: 'Cleveland Clinic (2022). How To Do the 4-7-8 Breathing Exercise.',
        url: 'https://health.clevelandclinic.org/4-7-8-breathing',
      },
    ],
  },
  {
    id: 3,
    name: 'Respiração Profunda',
    purpose: 'Ajuda a acalmar o corpo e aliviar a ansiedade do momento',
    desc: 'Respiração lenta e profunda, com a expiração mais longa que a inspiração. Respirar devagar ajuda o corpo a sair do estado de alerta: em um estudo, uma única sessão de respiração lenta e profunda reduziu a ansiedade e aumentou marcadores de relaxamento do corpo. Inspire pelo nariz por 4 segundos, enchendo a barriga, segure por 4, sem forçar, e expire devagar por 6.',
    secs: [4, 4, 6, 0],
    tone: 'sage',
    references: [
      {
        citation:
          'Magnon et al. (2021). Benefits from one session of deep and slow breathing on vagal tone and anxiety in young and older adults. Scientific Reports.',
        url: 'https://doi.org/10.1038/s41598-021-98736-9',
      },
      ZACCARO_2018,
    ],
  },
  {
    id: 4,
    name: 'Respiração Sama Vritti Pranayama',
    purpose: 'Respiração ritmada para desacelerar e aliviar o estresse',
    desc: 'Técnica de respiração do yoga (pranayama) cujo nome, em sânscrito, significa "movimento igual": você inspira e expira pelo mesmo tempo. Nesse ritmo, são cerca de 7 respirações por minuto, uma respiração lenta que as pesquisas associam a mais relaxamento e menos ansiedade. Inspire por 4 segundos e expire por 4 segundos.',
    secs: [4, 0, 4, 0],
    tone: 'lavender',
    references: [
      ZACCARO_2018,
      {
        citation:
          'Fincham et al. (2023). Effect of breathwork on stress and mental health: A meta-analysis of randomised-controlled trials. Scientific Reports.',
        url: 'https://doi.org/10.1038/s41598-022-27247-y',
      },
    ],
  },
  {
    id: 5,
    name: 'Respiração Contada',
    purpose: 'Exercita a atenção e ajuda a notar quando a mente se distrai',
    desc: 'Prática de atenção plena de origem zen: acompanhe a respiração e conte mentalmente cada expiração, de 1 a 10. Quando perceber que perdeu a conta ou se distraiu, recomece do 1 — perceber a distração faz parte do exercício. Estudos mostram que contar as respirações com precisão está associado a menos divagação da mente e mais consciência da própria atenção. Siga o guia: inspire por 5 segundos e expire por 5.',
    secs: [5, 0, 5, 0],
    tone: 'mint',
    references: [
      {
        citation:
          'Levinson et al. (2014). A mind you can count on: validating breath counting as a behavioral measure of mindfulness. Frontiers in Psychology.',
        url: 'https://doi.org/10.3389/fpsyg.2014.01202',
      },
      {
        citation:
          'Wong et al. (2018). Towards an Objective Measure of Mindfulness: Replicating and Extending the Features of the Breath-Counting Task. Mindfulness.',
        url: 'https://doi.org/10.1007/s12671-017-0880-1',
      },
    ],
  },
  {
    id: 6,
    name: 'Respiração Rítmica',
    purpose: 'Um ritmo lento e constante para ajudar a acalmar',
    desc: 'Respiração lenta em ritmo constante, com pausas curtas depois de inspirar e de expirar. São 5 respirações por minuto, dentro da faixa de respiração lenta (4 a 10 por minuto) que as pesquisas associam a mais relaxamento e menos ansiedade. Inspire por 4 segundos, segure por 2, expire por 4 e segure por 2, sem forçar.',
    secs: [4, 2, 4, 2],
    tone: 'sand',
    references: [
      {
        citation:
          'Russo et al. (2017). The physiological effects of slow breathing in the healthy human. Breathe.',
        url: 'https://doi.org/10.1183/20734735.009817',
      },
      ZACCARO_2018,
    ],
  },
];
