'use client';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../ui/carousel';
import TestimonialCard from './testimonials-card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Form, FormControl, FormField, FormItem } from '../ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const formSchema = z.object({
  message: z.string().min(2, { message: 'Message must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  location: z.string().optional(),
  newsletter: z.boolean(),
});

const Testimonials: React.FC = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
      email: '',
      location: '',
      newsletter: false,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    form.reset();
  }

  const testimonials = [
    {
      quote:
        'escapismo com mídia ❤️ evitar e se distrair é saudável quando minha ansiedade não tem fundamento e é quase delirante — o que acontece comigo 95% do tempo.',
    },
    {
      quote:
        'Música. Estou no exército e temos que fazer várias coisas envolvendo testes na frente de outras pessoas. Sinto que estou sob muita pressão quando não tem música nos meus ouvidos.',
    },
    {
      quote:
        'tempo diário no chão. só eu, no chão, sem pensar em nada. pontos extras se o chão estiver frio. só de deitar ali, me ajuda a relaxar e respirar.',
    },
    {
      quote:
        'Encontrei um lugar tranquilo para ficar sozinho e ouvir jazz ou música instrumental. Alguns dos meus lugares favoritos: o terraço de um prédio, um quarto silencioso ou a praia à noite.',
    },
    {
      quote:
        'Esporte (yoga, corrida). Cozinhar. Assistir alguns dos meus filmes ou séries favoritas. Escrever, ler.',
    },
    {
      quote:
        'Natureza. Às vezes, quando me sinto desconectado, me desconecto da vida. Desapareço para as montanhas, o deserto e o oceano para me reencontrar. Meu coração realmente bate e minha alma se enche de tanta alegria — e é isso que me ajuda a amar.',
    },
    {
      quote:
        'O aplicativo de saúde comportamental MI PEACE https://mipeace.com/app-in-action/ fornece ferramentas para lidar com desafios comuns como ansiedade, privação de sono, depressão, raiva, etc. Também conecta pessoas a profissionais de saúde mental. O MAIS importante é que foi desenvolvido por psicólogos clínicos reais, treinados em Yale e baseado em pesquisas científicas. Muitas vezes, empreendedores oportunistas vendem aplicativos parecidos apenas para lucrar às custas das comunidades mais vulneráveis.',
    },
    {
      quote:
        'Tenho ansiedade desde sempre. Yoga, leitura, poesia, ouvir música, escrever em diário e tricotar são coisas que me ajudam a me acalmar quando estou ansiosa. Quando tenho ataques de pânico, às vezes algo bobo como nomear todos os animais que consigo lembrar em ordem alfabética me ajuda a acalmar a mente. Em uma escala maior, as coisas mais úteis que fiz para minha ansiedade foram experimentar novos hobbies e viajar sozinha. Acho que é muito importante fazer coisas que te deixam ansioso, porque senão você nunca vai conseguir superar o que te assusta.',
    },
    {
      quote:
        'Usei o aplicativo SAM para montar uma caixa de ferramentas tanto para identificar gatilhos quanto para saber o que me ajuda. Eles também têm recursos em tempo real para lidar com ataques de ansiedade no momento em que acontecem. Isso me ajudou a não depender mais do app e percebi que a ferramenta mais útil foi me dar tempo para entender o que estava me deixando ansiosa, por quê, e se a ansiedade era justificada. Isso geralmente me ajuda a me acalmar ou a mexer meu corpo para liberar a sensação. Também me lembro de que tudo bem ter um ataque completo às vezes — especialmente no meio de um. Costumo me dizer que está tudo bem e que posso chorar. Às vezes, o único caminho é atravessar isso ♡',
    },
  ];

  return (
    <section className="w-full py-4">
      <div className="mx-auto px-3 lg:max-w-6xl">
        <div className="mb-12 text-center">
          <h2 className="text-green-dark font-varela mb-4 text-3xl font-bold">
            Você não precisa sentir isso em silêncio.
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-gray-800">
            Compartilhe o que te ajudou com seus momentos dificeis. Quaisquer links para recursos,
            mecanismos de enfrentamento e conselhos podem ajudar outra pessoa.
          </p>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mx-auto mt-8 max-w-2xl space-y-4"
            >
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        id="message"
                        placeholder="O que te ajudou?"
                        className="focus:border-green-dark focus:ring-green-dark block rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
                      />
                    </FormControl>
                    {form.formState.errors.message && (
                      <p className="mt-1 text-sm text-red-500">
                        {form.formState.errors.message.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="E-mail"
                        className="focus:border-green-dark focus:ring-green-dark block rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
                      />
                    </FormControl>
                    {form.formState.errors.email && (
                      <p className="mt-1 text-sm text-red-500">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        id="location"
                        type="text"
                        placeholder="De onde você fala?"
                        className="focus:border-green-dark focus:ring-green-dark block rounded-md border-gray-500 bg-transparent px-3 py-2 text-gray-900 shadow-md sm:text-sm"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newsletter"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-6">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <p>Fique por dentro de todas as nossas novidades</p>
                  </FormItem>
                )}
              />
              <div>
                <Button type="submit" className="small-caps w-full cursor-pointer px-4 py-2">
                  Compartilhar
                </Button>
              </div>
            </form>
          </Form>
        </div>
        <Carousel>
          <CarouselContent>
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                <TestimonialCard {...testimonial} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="absolute top-1/2 left-[-50px] -translate-y-1/2 cursor-pointer fill-black" />
          <CarouselNext className="absolute top-1/2 right-[-50px] -translate-y-1/2 cursor-pointer fill-black" />
        </Carousel>
      </div>
    </section>
  );
};

export default Testimonials;
