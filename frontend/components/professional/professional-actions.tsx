'use client';

import { useState } from 'react';
import { Calendar, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Professional } from '@/data/professional-data';

interface ProfessionalActionsProps {
  professional: Professional;
}

export function ProfessionalScheduleButton({ professional }: ProfessionalActionsProps) {
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const handleScheduleAppointment = () => {
    // schedule an appointment with the professional
    console.log(`Appointment with ${professional.name} on ${date} at ${time}`);
    setDate('');
    setTime('');
    setIsScheduleOpen(false);
  };

  return (
    <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Calendar aria-hidden="true" className="mr-2 h-4 w-4" />
          Agendar Consulta
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-background sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="font-varela text-accent-strong">Agendar Consulta</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Preencha os dados abaixo para agendar uma consulta com {professional.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date" className="text-muted-foreground">
              Data
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-border bg-background focus-visible:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time" className="text-muted-foreground">
              Horário
            </Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="border-border bg-background focus-visible:ring-ring"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-muted-foreground">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Informe detalhes adicionais sobre sua consulta..."
              className="border-border bg-background focus-visible:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleScheduleAppointment}
            disabled={!date || !time}
          >
            Confirmar Agendamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProfessionalMessageButton({ professional }: ProfessionalActionsProps) {
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendMessage = () => {
    // send the message to the professional
    console.log(`Message to ${professional.name}: ${message}`);
    setMessage('');
    setIsMessageOpen(false);
  };

  return (
    <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <MessageSquare aria-hidden="true" className="mr-2 h-4 w-4" />
          Enviar Mensagem
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border bg-background sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle className="font-varela text-accent-strong">Enviar Mensagem</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Envie uma mensagem para {professional.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="message" className="text-muted-foreground">
              Mensagem
            </Label>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border-border bg-background focus-visible:ring-ring min-h-30"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSendMessage} disabled={!message.trim()}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
