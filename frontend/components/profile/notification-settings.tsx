'use client';

import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useState } from 'react';
import { toast } from 'sonner';

interface NotificationPreferences {
  medicationReminders: boolean;
  appointmentReminders: boolean;
  journalReminders: boolean;
  weeklyReports: boolean;
}

export function NotificationSettings() {
  const { permission, isSupported, requestPermission, unsubscribeUser } = usePushNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    medicationReminders: true,
    appointmentReminders: true,
    journalReminders: false,
    weeklyReports: false,
  });
  const [loading, setLoading] = useState(false);

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const granted = await requestPermission();
      if (granted) {
        // Save preferences to backend
        await savePreferences(preferences);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisableNotifications = async () => {
    setLoading(true);
    try {
      await unsubscribeUser();
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    if (permission === 'granted') {
      await savePreferences(newPreferences);
    }
  };

  const savePreferences = async (prefs: NotificationPreferences) => {
    try {
      const response = await fetch('/api/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prefs),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      toast.success('Preferências de notificação atualizadas');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Erro ao salvar preferências');
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>Seu navegador não suporta notificações push.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Notificação</CardTitle>
        <CardDescription>
          Gerencie quando e como você recebe lembretes e atualizações.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Status */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <Bell className="text-accent-strong h-5 w-5" />
            ) : (
              <BellOff className="text-muted-foreground h-5 w-5" />
            )}
            <div>
              <p className="font-medium">
                Notificações {permission === 'granted' ? 'Ativadas' : 'Desativadas'}
              </p>
              <p className="text-muted-foreground text-sm">
                {permission === 'granted'
                  ? 'Você receberá lembretes e atualizações'
                  : 'Ative para receber lembretes importantes'}
              </p>
            </div>
          </div>
          <Button
            variant={permission === 'granted' ? 'outline' : 'default'}
            size="sm"
            onClick={
              permission === 'granted' ? handleDisableNotifications : handleEnableNotifications
            }
            disabled={loading || permission === 'denied'}
          >
            {permission === 'granted' ? 'Desativar' : 'Ativar'}
          </Button>
        </div>

        {/* Notification Preferences */}
        {permission === 'granted' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Tipos de Notificação</h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="medication-reminders" className="flex flex-col gap-1">
                  <span>Lembretes de Medicação</span>
                  <span className="text-muted-foreground text-sm">
                    Receba lembretes nos horários das suas medicações
                  </span>
                </Label>
                <Switch
                  id="medication-reminders"
                  checked={preferences.medicationReminders}
                  onCheckedChange={(checked) =>
                    handlePreferenceChange('medicationReminders', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="appointment-reminders" className="flex flex-col gap-1">
                  <span>Lembretes de Consulta</span>
                  <span className="text-muted-foreground text-sm">
                    Notificações antes das suas consultas agendadas
                  </span>
                </Label>
                <Switch
                  id="appointment-reminders"
                  checked={preferences.appointmentReminders}
                  onCheckedChange={(checked) =>
                    handlePreferenceChange('appointmentReminders', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="journal-reminders" className="flex flex-col gap-1">
                  <span>Lembretes de Diário</span>
                  <span className="text-muted-foreground text-sm">
                    Lembrete diário para escrever no seu diário
                  </span>
                </Label>
                <Switch
                  id="journal-reminders"
                  checked={preferences.journalReminders}
                  onCheckedChange={(checked) => handlePreferenceChange('journalReminders', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="weekly-reports" className="flex flex-col gap-1">
                  <span>Relatórios Semanais</span>
                  <span className="text-muted-foreground text-sm">
                    Resumo semanal do seu progresso
                  </span>
                </Label>
                <Switch
                  id="weekly-reports"
                  checked={preferences.weeklyReports}
                  onCheckedChange={(checked) => handlePreferenceChange('weeklyReports', checked)}
                />
              </div>
            </div>
          </div>
        )}

        {permission === 'denied' && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
            As notificações foram bloqueadas. Para reativá-las, você precisa alterar as
            configurações do navegador para este site.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
