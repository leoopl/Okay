import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Mail, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Professional } from '@/data/professional-data';

interface ProfessionalCardProps {
  professional: Professional;
}

export function ProfessionalCard({ professional }: ProfessionalCardProps) {
  return (
    <Card className="border-grey-medium/50 overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-0">
        <Link href={`/professional/${professional.id}`} className="block">
          <div className="flex flex-col sm:flex-row">
            <div className="bg-yellow-light/30 flex h-40 w-full items-center justify-center p-4 sm:h-auto sm:w-1/4">
              <div className="bg-yellow-medium/20 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full">
                <Image
                  src={`/${professional.photo}`}
                  alt={professional.name}
                  width={500}
                  height={500}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-varela text-green-dark text-2xl font-medium">
                  {professional.name}
                </h3>
                <Badge
                  variant="outline"
                  className="text-yellow-dark border-yellow-medium bg-yellow-light/20"
                >
                  {professional.specialty.Profession}
                </Badge>
              </div>

              <p className="text-grey-dark mb-3 line-clamp-2 text-sm">{professional.resume}</p>

              <div className="mb-3 flex flex-wrap gap-1">
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

              <div className="text-beige-dark mt-auto flex flex-wrap gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <MapPin className="mt-0.5 size-3" />
                  <span>
                    {professional.address.city}, {professional.address.state}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="mt-0.5 size-3" />
                  <span>{professional.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="mt-0.5 size-3" />
                  <span>{professional.number}</span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
