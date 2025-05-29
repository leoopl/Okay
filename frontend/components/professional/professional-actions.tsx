'use client';

import { useState } from 'react';
import { Share2, Calendar, MessageSquare } from 'lucide-react';
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
          <Calendar className="mr-2 h-4 w-4" />
          Agendar Consulta
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[#CBCFD7] bg-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-varela text-[#039BE5]">Agendar Consulta</DialogTitle>
          <DialogDescription className="text-[#797D89]">
            Preencha os dados abaixo para agendar uma consulta com {professional.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="date" className="text-[#797D89]">
              Data
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border-[#CBCFD7] bg-white focus-visible:ring-[#78C7EE]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="time" className="text-[#797D89]">
              Horário
            </Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="border-[#CBCFD7] bg-white focus-visible:ring-[#78C7EE]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes" className="text-[#797D89]">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Informe detalhes adicionais sobre sua consulta..."
              className="border-[#CBCFD7] bg-white focus-visible:ring-[#78C7EE]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleScheduleAppointment} className="">
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
          <MessageSquare className="mr-2 h-4 w-4" />
          Enviar Mensagem
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[#CBCFD7] bg-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-varela text-[#039BE5]">Enviar Mensagem</DialogTitle>
          <DialogDescription className="text-[#797D89]">
            Envie uma mensagem para {professional.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="message" className="text-[#797D89]">
              Mensagem
            </Label>
            <Textarea
              id="message"
              placeholder="Digite sua mensagem..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] border-[#CBCFD7] bg-white focus-visible:ring-[#78C7EE]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSendMessage} className="">
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
