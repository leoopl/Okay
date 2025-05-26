'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Volume2,
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Pill,
  BookOpen,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';

// Types for better type safety
interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  frequency: string;
  types: {
    medication: boolean;
    appointments: boolean;
    journal: boolean;
    tips: boolean;
    updates: boolean;
  };
}

// Default settings
const defaultSettings: NotificationSettings = {
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
  frequency: 'daily',
  types: {
    medication: true,
    appointments: true,
    journal: true,
    tips: true,
    updates: true,
  },
};

// Notification channel component
const NotificationChannel = ({
  icon: Icon,
  title,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="hover:bg-yellow-light/30 flex items-start justify-between rounded-lg border p-4 transition-colors">
    <div className="flex flex-1 gap-3">
      <div className="mt-1 flex-shrink-0">
        <Icon className="text-blue-dark size-5" />
      </div>
      <div className="flex-1 space-y-1">
        <Label className="cursor-pointer text-sm font-medium">{title}</Label>
        <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
      </div>
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="shrink-0"
    />
  </div>
);

// Notification type component
const NotificationType = ({
  icon: Icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <div className="hover:bg-yellow-light/30 flex items-start space-x-3 rounded-lg border p-3 transition-colors">
    <Checkbox
      id={`type-${label}`}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="mt-1"
    />
    <div className="flex-1 space-y-1">
      <div className="flex items-center gap-2">
        <Icon className="text-blue-dark size-4" />
        <Label htmlFor={`type-${label}`} className="cursor-pointer text-sm font-medium">
          {label}
        </Label>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
    </div>
  </div>
);

// Section wrapper component
const NotificationSection = ({
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
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="text-blue-dark size-5" />
        {title}
      </CardTitle>
      {description && <CardDescription>{description}</CardDescription>}
    </CardHeader>
    <CardContent className="space-y-4">{children}</CardContent>
  </Card>
);

export function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<NotificationSettings>(defaultSettings);

  // Track changes
  useEffect(() => {
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(settingsChanged);
  }, [settings, originalSettings]);

  // Simulate loading user settings
  useEffect(() => {
    // In a real app, you would fetch user settings here
    setOriginalSettings(defaultSettings);
  }, []);

  const handleSave = async () => {
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setOriginalSettings(settings);
      setHasChanges(false);

      toast.success('Preferências salvas', {
        description: 'Suas configurações de notificação foram atualizadas.',
      });
    } catch (error) {
      toast.error('Erro', {
        description: 'Não foi possível salvar as configurações. Tente novamente.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setHasChanges(false);
  };

  // Update specific setting
  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Update notification type
  const updateNotificationType = (type: keyof NotificationSettings['types'], value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      types: { ...prev.types, [type]: value },
    }));
  };

  // Notification types data
  const notificationTypes = [
    {
      key: 'medication' as const,
      icon: Pill,
      label: 'Lembretes de Medicamentos',
      description: 'Receba notificações para tomar seus medicamentos no horário certo',
    },
    {
      key: 'appointments' as const,
      icon: Calendar,
      label: 'Consultas e Compromissos',
      description: 'Lembretes sobre suas consultas e compromissos agendados',
    },
    {
      key: 'journal' as const,
      icon: BookOpen,
      label: 'Prompts do Diário',
      description: 'Sugestões diárias para reflexão e escrita no seu diário',
    },
    {
      key: 'tips' as const,
      icon: Lightbulb,
      label: 'Dicas de Bem-estar',
      description: 'Conselhos e estratégias para melhorar seu bem-estar mental',
    },
    {
      key: 'updates' as const,
      icon: Zap,
      label: 'Atualizações do App',
      description: 'Informações sobre novos recursos e melhorias na plataforma',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-foreground mb-2 text-2xl font-bold">Configurações de Notificação</h2>
        <p className="text-muted-foreground">
          Personalize como e quando você deseja receber notificações para manter-se engajado com seu
          bem-estar.
        </p>
      </div>

      {/* Status Alert */}
      {hasChanges && (
        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
          <AlertCircle className="size-4" />
          <AlertDescription>
            Você tem alterações não salvas. Lembre-se de salvar suas preferências.
          </AlertDescription>
        </Alert>
      )}

      {/* Notification Channels */}
      <NotificationSection
        icon={Bell}
        title="Canais de Notificação"
        description="Escolha como você deseja receber suas notificações"
      >
        <div className="space-y-4">
          <NotificationChannel
            icon={Mail}
            title="Notificações por E-mail"
            description="Receba atualizações, lembretes e relatórios em seu e-mail"
            checked={settings.emailNotifications}
            onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
          />

          <NotificationChannel
            icon={Smartphone}
            title="Notificações Push"
            description="Receba notificações instantâneas no seu dispositivo"
            checked={settings.pushNotifications}
            onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
          />

          <NotificationChannel
            icon={MessageSquare}
            title="Notificações por SMS"
            description="Receba mensagens de texto para alertas importantes"
            checked={settings.smsNotifications}
            onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
          />
        </div>
      </NotificationSection>

      {/* Notification Types */}
      <NotificationSection
        icon={CheckCircle}
        title="Tipos de Notificação"
        description="Selecione quais tipos de notificações você deseja receber"
      >
        <div className="space-y-3">
          {notificationTypes.map((type) => (
            <NotificationType
              key={type.key}
              icon={type.icon}
              label={type.label}
              description={type.description}
              checked={settings.types[type.key]}
              onCheckedChange={(checked) => updateNotificationType(type.key, checked)}
            />
          ))}
        </div>
      </NotificationSection>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isLoading || !hasChanges}
          className="transition-all duration-200 hover:scale-105"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={isLoading || !hasChanges}
          className="transition-all duration-200 hover:scale-105"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Preferências'
          )}
        </Button>
      </div>
    </div>
  );
}
