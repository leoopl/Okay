'use client';

import { useEffect, startTransition, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useActionState } from 'react';
import { PasswordChangeSchema } from '@/lib/definitions';
import { changePassword, updateConsent } from '@/lib/actions/server-profile';
import { AlertCircle, CheckCircle, Shield, Lock, Eye, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/providers/auth-provider';
import { toast, Toaster } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

// Password strength indicator
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  if (!password) return { score: 0, label: 'Sem senha', color: 'text-muted-foreground' };

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { score, label: 'Fraca', color: 'text-destructive' };
  if (score <= 3) return { score, label: 'Média', color: 'text-yellow-600' };
  if (score <= 4) return { score, label: 'Forte', color: 'text-green-600' };
  return { score, label: 'Muito Forte', color: 'text-green-700' };
};

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const { score, label, color } = getPasswordStrength(password);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">Força da senha:</span>
        <span className={`text-xs font-medium ${color}`}>{label}</span>
      </div>
      <div className="flex space-x-1">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full ${i < score ? 'bg-current' : 'bg-muted'} ${color}`}
          />
        ))}
      </div>
    </div>
  );
};

// Form section wrapper
const SecuritySection = ({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <Card className="transition-all duration-200 hover:shadow-md">
    <CardHeader>
      <CardTitle className="font-varela flex items-center gap-2 text-lg">
        <Icon className="text-blue-dark size-5" />
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);

// Consent switch component
const ConsentSwitch = ({
  id,
  title,
  description,
  defaultChecked,
  name,
}: {
  id: string;
  title: string;
  description: string;
  defaultChecked?: boolean;
  name: string;
}) => (
  <div className="hover:bg-yellow-light/30 flex items-start justify-between rounded-lg border p-4 transition-colors">
    <div className="flex-1 space-y-1 pr-4">
      <Label htmlFor={id} className="cursor-pointer text-sm font-medium">
        {title}
      </Label>
      <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
    </div>
    <Switch id={id} defaultChecked={defaultChecked} name={name} className="shrink-0" />
  </div>
);

export function SecurityTab() {
  const { user } = useAuth();
  const [passwordState, passwordAction, isPasswordPending] = useActionState(
    changePassword,
    undefined,
  );
  const [consentState, consentAction, isConsentPending] = useActionState(updateConsent, undefined);
  const [watchPassword, setWatchPassword] = useState('');

  // Form for password change
  const passwordForm = useForm({
    resolver: zodResolver(PasswordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Watch new password for strength indicator
  const newPassword = passwordForm.watch('newPassword');

  useEffect(() => {
    setWatchPassword(newPassword || '');
  }, [newPassword]);

  // Show toasts based on form responses
  useEffect(() => {
    if (passwordState?.success) {
      toast.success('Senha alterada', {
        description: 'Sua senha foi alterada com sucesso.',
      });
      passwordForm.reset();
    } else if (passwordState && !passwordState.success && passwordState.message) {
      toast.error('Erro', { description: passwordState.message });
    }
  }, [passwordState, passwordForm]);

  useEffect(() => {
    if (consentState?.success) {
      toast.success('Preferências atualizadas', {
        description: 'Suas preferências de consentimento foram atualizadas.',
      });
    } else if (consentState && !consentState.success && consentState.message) {
      toast.error('Erro', { description: consentState.message });
    }
  }, [consentState]);

  // Submit handler that creates FormData from form values
  const onSubmit = (data: any) => {
    const formData = new FormData();
    formData.append('currentPassword', data.currentPassword);
    formData.append('newPassword', data.newPassword);
    formData.append('confirmPassword', data.confirmPassword);

    // Submit the form within a transition
    startTransition(() => {
      passwordAction(formData);
    });
  };

  return (
    <div className="space-y-8">
      <Toaster richColors position="top-center" />

      {/* Header */}
      <div>
        <h2 className="text-green-dark font-varela mb-2 text-2xl font-bold">
          Configurações de Segurança
        </h2>
      </div>

      {/* Password Change Section */}
      <SecuritySection
        icon={Lock}
        title="Alterar Senha"
        description="Mantenha sua conta segura atualizando sua senha regularmente"
      >
        {/* Status indicators */}
        {passwordState?.success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="size-4" />
            <AlertDescription>Senha alterada com sucesso!</AlertDescription>
          </Alert>
        )}

        {passwordState && !passwordState.success && passwordState.message && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{passwordState.message}</AlertDescription>
          </Alert>
        )}

        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={passwordForm.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Senha Atual</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Digite sua senha atual"
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nova Senha</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Digite sua nova senha"
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  {watchPassword && (
                    <div className="mt-2">
                      <PasswordStrengthIndicator password={watchPassword} />
                    </div>
                  )}
                  <FormDescription>
                    Use pelo menos 8 caracteres com letras maiúsculas, minúsculas, números e
                    símbolos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirme a Nova Senha</FormLabel>
                  <FormControl>
                    <PasswordInput
                      placeholder="Confirme sua nova senha"
                      className="transition-all duration-200 focus:scale-[1.02]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isPasswordPending}
                className="transition-all duration-200 hover:scale-105"
              >
                {isPasswordPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar Senha'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </SecuritySection>

      {/* Privacy Preferences Section */}
      <SecuritySection
        icon={Shield}
        title="Preferências de Privacidade"
        description="Controle como suas informações são usadas e compartilhadas"
      >
        {consentState?.success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="size-4" />
            <AlertDescription>Preferências atualizadas com sucesso!</AlertDescription>
          </Alert>
        )}

        {consentState && !consentState.success && consentState.message && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{consentState.message}</AlertDescription>
          </Alert>
        )}

        <form action={consentAction} className="space-y-4">
          <ConsentSwitch
            id="consent-data"
            title="Processamento de Dados"
            description="Permitir o processamento dos meus dados pessoais para fornecer os serviços da plataforma. Esta opção é necessária para o funcionamento básico do aplicativo."
            defaultChecked={user?.consentToDataProcessing}
            name="consentToDataProcessing"
          />

          <ConsentSwitch
            id="consent-research"
            title="Participar de Pesquisas"
            description="Autorizar o uso dos meus dados anonimizados em pesquisas sobre saúde mental para melhorar os serviços oferecidos."
            defaultChecked={user?.consentToResearch}
            name="consentToResearch"
          />

          <ConsentSwitch
            id="consent-marketing"
            title="Comunicações de Marketing"
            description="Receber informações sobre novos recursos, atualizações e conteúdos relacionados ao bem-estar mental."
            defaultChecked={user?.consentToMarketing}
            name="consentToMarketing"
          />

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isConsentPending}
              className="transition-all duration-200 hover:scale-105"
            >
              {isConsentPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Salvar Preferências'
              )}
            </Button>
          </div>
        </form>
      </SecuritySection>

      {/* Security Tips Section */}
      <SecuritySection
        icon={Eye}
        title="Dicas de Segurança"
        description="Mantenha sua conta segura seguindo estas recomendações"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Senha Segura</h4>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• Use pelo menos 8 caracteres</li>
              <li>• Combine letras, números e símbolos</li>
              <li>• Evite informações pessoais</li>
              <li>• Não reutilize senhas</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Proteção da Conta</h4>
            <ul className="text-muted-foreground space-y-1 text-xs">
              <li>• Sempre faça logout em dispositivos compartilhados</li>
              <li>• Não compartilhe suas credenciais</li>
              <li>• Mantenha seu email atualizado</li>
              <li>• Revise suas configurações regularmente</li>
            </ul>
          </div>
        </div>
      </SecuritySection>
    </div>
  );
}
