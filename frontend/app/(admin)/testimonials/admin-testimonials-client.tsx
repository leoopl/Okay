'use client';

import { useEffect, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  approveTestimonial,
  deleteTestimonial,
  listTestimonialsByStatus,
  rejectTestimonial,
} from '@/lib/actions/supabase-admin-testimonials';
import type { Tables } from '@/lib/supabase/database.types';

type Testimonial = Tables<'testimonials'>;

interface Props {
  initialTestimonials: Testimonial[];
  initialError?: string;
}

export default function AdminTestimonialsClient({ initialTestimonials, initialError }: Props) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);
  const [activeTab, setActiveTab] = useState('pending');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (initialError) toast.error('Erro', { description: initialError });
  }, [initialError]);

  async function refresh() {
    const { data, error } = await listTestimonialsByStatus('all');
    if (error) toast.error('Erro', { description: error });
    else setTestimonials(data);
  }

  function handleApprove(id: string) {
    startTransition(async () => {
      const result = await approveTestimonial(id);
      if (result.success) {
        toast.success('Sucesso', { description: result.message });
        await refresh();
      } else {
        toast.error('Erro', { description: result.message });
      }
    });
  }

  function handleReject(id: string) {
    startTransition(async () => {
      const result = await rejectTestimonial(id);
      if (result.success) {
        toast.success('Sucesso', { description: result.message });
        await refresh();
      } else {
        toast.error('Erro', { description: result.message });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este depoimento?')) return;
    startTransition(async () => {
      const result = await deleteTestimonial(id);
      if (result.success) {
        toast.success('Sucesso', { description: result.message });
        await refresh();
      } else {
        toast.error('Erro', { description: result.message });
      }
    });
  }

  const filteredTestimonials = testimonials.filter((t) => {
    if (activeTab === 'all') return true;
    return t.status === activeTab;
  });

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Gerenciar depoimentos</h1>

      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="approved">Aprovados</TabsTrigger>
          <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {filteredTestimonials.length === 0 ? (
            <div className="bg-muted/50 rounded-lg p-10 text-center">
              <p className="text-lg font-medium">Nenhum depoimento {activeTab} encontrado</p>
            </div>
          ) : (
            filteredTestimonials.map((testimonial) => (
              <Card key={testimonial.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30 flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-lg">
                      {testimonial.email}
                      {testimonial.newsletter && (
                        <Badge className="bg-secondary/20 text-secondary ml-2">Newsletter</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      {testimonial.location || 'Sem localização'} •{' '}
                      {formatDistanceToNow(new Date(testimonial.created_at), {
                        addSuffix: true,
                        locale: pt,
                      })}
                    </CardDescription>
                  </div>
                  <Badge
                    className={
                      testimonial.status === 'pending'
                        ? 'bg-primary/20 text-accent-strong'
                        : testimonial.status === 'approved'
                          ? 'bg-success-bg text-success'
                          : 'bg-destructive/20 text-destructive'
                    }
                  >
                    {testimonial.status}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4">
                  <p className="whitespace-pre-wrap text-foreground">{testimonial.message}</p>
                </CardContent>
                <CardFooter className="bg-muted/20 flex justify-end gap-2 pt-2">
                  {testimonial.status === 'pending' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => handleReject(testimonial.id)}
                      >
                        Rejeitar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        className="border-accent-strong text-accent-strong hover:bg-accent-strong/10"
                        onClick={() => handleApprove(testimonial.id)}
                      >
                        Aprovar
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(testimonial.id)}
                  >
                    Excluir
                  </Button>
                </CardFooter>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
