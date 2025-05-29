import {
  MapPin,
  Mail,
  Phone,
  Calendar,
  Share2,
  MessageSquare,
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
      <div className="bg-yellow-light/10 flex flex-col rounded-lg p-6 sm:flex-row sm:items-center sm:gap-6">
        <div className="mb-4 flex items-center justify-center sm:mb-0">
          <div className="bg-yellow-medium/20 ring-yellow-medium/30 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full ring-4">
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
            <h1 className="font-varela text-green-dark text-3xl font-medium">
              {professional.name}
            </h1>
            <Badge className="text-yellow-dark border-yellow-medium bg-yellow-light/20 text-lg">
              {professional.specialty.Profession}
            </Badge>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {professional.specialty.Approach.map((approach) => (
              <Badge
                key={approach}
                variant="outline"
                className="text-yellow-dark border-yellow-medium/70 bg-yellow-light/20"
              >
                {approach}
              </Badge>
            ))}
          </div>

          <div className="text-grey-dark grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <Mail className="text-blue-dark mt-0.5 size-4" />
              <span>{professional.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="text-blue-dark mt-0.5 size-4" />
              <span>{professional.number}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="text-blue-dark mt-0.5 size-4" />
              <span>{professional.address.office}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="text-blue-dark mt-0.5 size-4" />
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
          <Card className="border-beige-medium/50">
            <CardContent className="p-6">
              <h2 className="font-varela text-green-dark mb-4 text-xl font-medium">Sobre</h2>
              <p className="text-grey-dark">{professional.resume}</p>

              <Separator className="bg-beige-darkborder-beige-medium/50 my-6" />

              <h2 className="font-varela text-green-dark mb-4 text-xl font-medium">Localização</h2>

              <div className="aspect-video w-full overflow-hidden rounded-lg bg-[#A5DCF6]/30">
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-center text-sm text-[#797D89]">
                    Mapa será carregado aqui usando as coordenadas:
                    <br />
                    Latitude: {professional.address.latitude}
                    <br />
                    Longitude: {professional.address.longitude}
                  </p>
                </div>
              </div>

              <div className="text-beige-dark mt-4 text-sm">
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
          <Card className="border-beige-medium/50">
            <CardContent className="p-6">
              <h2 className="font-varela text-green-dark mb-4 text-lg font-medium">
                Agendar Consulta
              </h2>

              <div className="space-y-3">
                <ProfessionalScheduleButton professional={professional} />
                <ProfessionalMessageButton professional={professional} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-beige-medium/50">
            <CardContent className="p-6">
              <h2 className="font-varela text-green-dark mb-4 text-lg font-medium">Compartilhar</h2>

              <Button variant="outline" className="w-full">
                <Share2 className="mr-2 h-4 w-4" />
                Compartilhar Perfil
              </Button>

              <div className="mt-4 flex items-center justify-between">
                <Button variant="ghost" size="sm">
                  <Heart className="mr-2 h-4 w-4" />
                  Salvar
                </Button>

                <div className="text-beige-dark flex items-center text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  Atualizado recentemente
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-beige-medium/50">
            <CardContent className="p-6">
              <h2 className="font-varela text-green-dark mb-4 text-lg font-medium">
                Horários Disponíveis
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-beige-dark">Segunda-feira</span>
                  <span className="text-beige-dark font-medium">09:00 - 17:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-beige-dark">Terça-feira</span>
                  <span className="text-beige-dark font-medium">09:00 - 17:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-beige-dark">Quarta-feira</span>
                  <span className="text-beige-dark font-medium">09:00 - 17:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-beige-dark">Quinta-feira</span>
                  <span className="text-beige-dark font-medium">09:00 - 17:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-beige-dark">Sexta-feira</span>
                  <span className="text-beige-dark font-medium">09:00 - 15:00</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
