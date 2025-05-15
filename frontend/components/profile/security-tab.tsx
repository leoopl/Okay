'use client';

import { useEffect, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useActionState } from 'react';
import { PasswordChangeSchema } from '@/lib/definitions';
import { changePassword, updateConsent } from '@/lib/actions/server-profile';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/providers/auth-provider';
import { toast, Toaster } from 'sonner';

export function SecurityTab() {
  const { user } = useAuth();
  const [passwordState, passwordAction, isPasswordPending] = useActionState(
    changePassword,
    undefined,
  );
  const [consentState, consentAction, isConsentPending] = useActionState(updateConsent, undefined);

  // Form for password change
  const passwordForm = useForm({
    resolver: zodResolver(PasswordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Show toasts based on form responses
  useEffect(() => {
    if (passwordState?.success) {
      toast.success('Senha alterada', { description: 'Sua senha foi alterada com sucesso.' });
      passwordForm.reset();
    } else if (passwordState && !passwordState.success && passwordState.message) {
      toast.error('Erro', { description: passwordState.message });
    }
  }, [passwordState, toast, passwordForm]);

  useEffect(() => {
    if (consentState?.success) {
      toast.success('Preferências atualizadas', {
        description: 'Suas preferências de consentimento foram atualizadas.',
      });
    }
  }, [consentState, toast]);

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
    <div>
      <Toaster />
      <h2 className="mb-6 text-2xl font-bold text-[#7F9463]">Configurações de Segurança</h2>

      <div className="space-y-8">
        <div>
          <h3 className="mb-4 text-lg font-medium text-[#7F9463]">Alterar Senha</h3>

          {/* Success/Error Notification for Password */}
          {passwordState?.success && (
            <div className="mb-4 rounded-md bg-green-50 p-4 text-green-800">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium">Senha alterada com sucesso!</p>
                </div>
              </div>
            </div>
          )}

          {passwordState && !passwordState.success && passwordState.message && (
            <div className="mb-4 rounded-md bg-red-50 p-4 text-red-800">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium">{passwordState.message}</p>
                </div>
              </div>
            </div>
          )}

          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#797D89]">Senha Atual</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Digite sua senha atual"
                        className="border-[#CBCFD7] focus-visible:ring-[#039BE5]"
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
                    <FormLabel className="text-[#797D89]">Nova Senha</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Digite sua nova senha"
                        className="border-[#CBCFD7] focus-visible:ring-[#039BE5]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#797D89]">Confirme a Nova Senha</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder="Confirme sua nova senha"
                        className="border-[#CBCFD7] focus-visible:ring-[#039BE5]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="mt-4 flex justify-end">
                <Button
                  type="submit"
                  className="bg-[#7F9463] text-white hover:bg-[#7F9463]/90"
                  disabled={isPasswordPending}
                >
                  {isPasswordPending ? 'Atualizando...' : 'Atualizar Senha'}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-medium text-[#7F9463]">Preferências de Consentimento</h3>

          {/* Success Notification for Consent */}
          {consentState?.success && (
            <div className="mb-4 rounded-md bg-green-50 p-4 text-green-800">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium">Preferências atualizadas com sucesso!</p>
                </div>
              </div>
            </div>
          )}

          <form action={consentAction} className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="consent-data" className="font-medium">
                  Processamento de Dados
                </Label>
                <p className="text-sm text-[#91857A]">
                  Dou consentimento para o processamento dos meus dados pessoais para fornecer
                  serviços.
                </p>
              </div>
              <Switch
                id="consent-data"
                defaultChecked={user?.consentToDataProcessing}
                name="consentToDataProcessing"
                className="data-[state=checked]:bg-[#039BE5]"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="consent-research" className="font-medium">
                  Uso para Pesquisa
                </Label>
                <p className="text-sm text-[#91857A]">
                  Dou consentimento para o uso dos meus dados em pesquisas sobre saúde mental.
                </p>
              </div>
              <Switch
                id="consent-research"
                defaultChecked={user?.consentToResearch}
                name="consentToResearch"
                className="data-[state=checked]:bg-[#039BE5]"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label htmlFor="consent-marketing" className="font-medium">
                  Marketing
                </Label>
                <p className="text-sm text-[#91857A]">
                  Gostaria de receber comunicações sobre novos serviços e recursos.
                </p>
              </div>
              <Switch
                id="consent-marketing"
                defaultChecked={user?.consentToMarketing}
                name="consentToMarketing"
                className="data-[state=checked]:bg-[#039BE5]"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="submit"
                className="bg-[#7F9463] text-white hover:bg-[#7F9463]/90"
                disabled={isConsentPending}
              >
                {isConsentPending ? 'Atualizando...' : 'Atualizar Preferências'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
