'use client';

import { useState } from 'react';
import { Filter, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ProfessionalFiltersProps {
  professions: string[];
  approaches: string[];
  onFilterChange: (filters: {
    profession: string | null;
    approaches: string[];
    useLocation: boolean;
  }) => void;
}

export function ProfessionalFilters({
  professions,
  approaches,
  onFilterChange,
}: ProfessionalFiltersProps) {
  const [selectedProfession, setSelectedProfession] = useState<string | null>(null);
  const [selectedApproaches, setSelectedApproaches] = useState<string[]>([]);
  const [useLocation, setUseLocation] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleProfessionChange = (value: string) => {
    setSelectedProfession(value === 'all' ? null : value);
  };

  const handleApproachToggle = (approach: string) => {
    setSelectedApproaches((prev) =>
      prev.includes(approach) ? prev.filter((a) => a !== approach) : [...prev, approach],
    );
  };

  const handleLocationToggle = (checked: boolean) => {
    setUseLocation(checked);
  };

  const handleApplyFilters = () => {
    onFilterChange({
      profession: selectedProfession,
      approaches: selectedApproaches,
      useLocation,
    });
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedProfession(null);
    setSelectedApproaches([]);
    setUseLocation(false);
    onFilterChange({
      profession: null,
      approaches: [],
      useLocation: false,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-border bg-background text-muted-foreground hover:bg-muted/20"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filtros
            {(selectedProfession || selectedApproaches.length > 0 || useLocation) && (
              <Badge variant="secondary" className="ml-2 bg-primary text-primary-foreground">
                {[
                  selectedProfession ? 1 : 0,
                  selectedApproaches.length,
                  useLocation ? 1 : 0,
                ].reduce((a, b) => a + b, 0)}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[300px] sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="font-varela text-secondary">Filtros</SheetTitle>
            <SheetDescription className="text-muted-foreground">
              Refine sua busca por profissionais
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-6">
            <div className="space-y-2">
              <h3 className="font-varela text-sm font-medium text-muted-foreground">Profissão</h3>
              <Select value={selectedProfession || 'all'} onValueChange={handleProfessionChange}>
                <SelectTrigger className="border-border bg-background">
                  <SelectValue placeholder="Todas as profissões" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as profissões</SelectItem>
                  {professions.map((profession) => (
                    <SelectItem key={profession} value={profession}>
                      {profession}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-border/50" />

            <div className="space-y-3">
              <h3 className="font-varela text-sm font-medium text-muted-foreground">Abordagens</h3>
              <div className="flex flex-wrap gap-2">
                {approaches.map((approach) => (
                  <Badge
                    key={approach}
                    variant={selectedApproaches.includes(approach) ? 'default' : 'outline'}
                    className={`cursor-pointer ${
                      selectedApproaches.includes(approach)
                        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted/20'
                    }`}
                    onClick={() => handleApproachToggle(approach)}
                  >
                    {approach}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator className="bg-border/50" />

            <div className="flex items-center space-x-2">
              <Switch
                id="location"
                checked={useLocation}
                onCheckedChange={handleLocationToggle}
                className="data-[state=checked]:bg-accent-strong"
              />
              <Label
                htmlFor="location"
                className="font-varela flex items-center gap-2 text-muted-foreground"
              >
                <MapPin className="h-4 w-4" />
                Usar minha localização
              </Label>
            </div>
          </div>
          <SheetFooter className="mt-6 flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="flex-1 border-border bg-background text-muted-foreground hover:bg-muted/20"
            >
              Limpar
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              Aplicar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Button
        variant="outline"
        size="sm"
        className={`border-border ${
          useLocation
            ? 'bg-accent-strong/10 text-accent-strong'
            : 'bg-background text-muted-foreground hover:bg-muted/20'
        }`}
        onClick={() => {
          const newValue = !useLocation;
          setUseLocation(newValue);
          onFilterChange({
            profession: selectedProfession,
            approaches: selectedApproaches,
            useLocation: newValue,
          });
        }}
      >
        <MapPin className="mr-2 h-4 w-4" />
        Próximos a mim
      </Button>

      {selectedProfession && (
        <Badge variant="secondary" className="bg-primary text-primary-foreground">
          {selectedProfession}
          <button
            className="ml-1 rounded-full hover:bg-primary/20"
            onClick={() => {
              setSelectedProfession(null);
              onFilterChange({
                profession: null,
                approaches: selectedApproaches,
                useLocation,
              });
            }}
          >
            ✕
          </button>
        </Badge>
      )}

      {selectedApproaches.map((approach) => (
        <Badge key={approach} variant="secondary" className="bg-secondary/30 text-secondary">
          {approach}
          <button
            className="ml-1 rounded-full hover:bg-secondary/20"
            onClick={() => {
              const newApproaches = selectedApproaches.filter((a) => a !== approach);
              setSelectedApproaches(newApproaches);
              onFilterChange({
                profession: selectedProfession,
                approaches: newApproaches,
                useLocation,
              });
            }}
          >
            ✕
          </button>
        </Badge>
      ))}
    </div>
  );
}
