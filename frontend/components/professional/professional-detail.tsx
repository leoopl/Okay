import {
  MapPin,
  Mail,
  Phone,
  Share2,
  Heart,
  Clock,
  Building,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Professional } from '@/data/professional-data';
import { ProfessionalMessageButton, ProfessionalScheduleButton } from './professional-actions';
import Image from 'next/image';

interface ProfessionalDetailProps {
  professional: Professional;
}

export function ProfessionalDetail({ professional }: ProfessionalDetailProps) {
  return (
    <div className="space-y-6">
      <div className="bg-primary/10 flex flex-col rounded-lg p-6 sm:flex-row sm:items-center sm:gap-6">
        <div className="mb-4 flex items-center justify-center sm:mb-0">
          <div className="bg-primary/20 ring-primary/30 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full ring-4">
            <Image
              src={`/${professional.photo}`}
              alt={professional.name}
              width={128}
              height={128}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-varela text-accent-strong text-3xl font-medium">
              {professional.name}
            </h1>
            <Badge className="text-primary border-primary bg-primary/10 text-lg">
              {professional.specialty.Profession}
            </Badge>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {professional.specialty.Approach.map((approach) => (
              <Badge
                key={approach}
                variant="outline"
                className="text-primary border-primary/70 bg-primary/10"
              >
                {approach}
              </Badge>
            ))}
          </div>

          <div className="text-muted-foreground grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Mail className="text-primary mt-0.5 size-4" />
              <span>{professional.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="text-primary mt-0.5 size-4" />
              <span>{professional.number}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="text-primary mt-0.5 size-4" />
              <span>{professional.address.office}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="text-primary mt-0.5 size-4" />
              <span>
                {professional.address.street}, {professional.address.number} -{' '}
                {professional.address.neighborhood}, {professional.address.city},{' '}
                {professional.address.state}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="font-varela text-accent-strong mb-4 text-xl font-medium">Sobre</h2>
              <p className="text-muted-foreground">{professional.resume}</p>

              <Separator className="my-6" />

              <h2 className="font-varela text-accent-strong mb-4 text-xl font-medium">Localização</h2>

              <div className="aspect-video w-full overflow-hidden rounded-lg bg-secondary/20">
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-center text-sm text-muted-foreground">
                    Mapa será carregado aqui usando as coordenadas:
                    <br />
                    Latitude: {professional.address.latitude}
                    <br />
                    Longitude: {professional.address.longitude}
                  </p>
                </div>
              </div>

              <div className="text-muted-foreground mt-4 text-sm">
                <p>
                  <strong>Endereço completo:</strong> {professional.address.street},{' '}
                  {professional.address.number} - {professional.address.neighborhood},{' '}
                  {professional.address.city}, {professional.address.state},{' '}
                  {professional.address.country} - CEP: {professional.address.zipcode}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="font-varela text-accent-strong mb-4 text-lg font-medium">
                Agendar Consulta
              </h2>

              <div className="space-y-3">
                <ProfessionalScheduleButton professional={professional} />
                <ProfessionalMessageButton professional={professional} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="font-varela text-accent-strong mb-4 text-lg font-medium">Compartilhar</h2>

              <Button variant="outline" className="w-full">
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar Perfil
              </Button>

              <div className="mt-4 flex items-center justify-between">
                <Button variant="ghost" size="sm">
                  <Heart className="mr-2 h-4 w-4" />
                  Salvar
                </Button>

                <div className="text-muted-foreground flex items-center text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  Atualizado recentemente
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-6">
              <h2 className="font-varela text-accent-strong mb-4 text-lg font-medium">
                Horários Disponíveis
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Segunda-feira</span>
                  <span className="text-muted-foreground font-medium">09:00 - 17:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Terça-feira</span>
                  <span className="text-muted-foreground font-medium">09:00 - 17:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quarta-feira</span>
                  <span className="text-muted-foreground font-medium">09:00 - 17:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quinta-feira</span>
                  <span className="text-muted-foreground font-medium">09:00 - 17:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sexta-feira</span>
                  <span className="text-muted-foreground font-medium">09:00 - 15:00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
