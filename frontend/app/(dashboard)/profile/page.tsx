'use client';

import { NotificationsTab } from '@/components/profile/notifications-tab';
import { ProfileTab } from '@/components/profile/profile-tab';
import { SecurityTab } from '@/components/profile/security-tab';
import { ProfilePictureUpload } from '@/components/profile/profile-picture-upload';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Book,
  ClipboardList,
  LogOut,
  Pill,
  Settings,
  Shield,
  Star,
  User,
  Activity,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';

// Feature card component for better reusability
interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  bgColor: string;
  iconColor: string;
  buttonColor: string;
}

interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
  bgColor: string;
  iconColor: string;
  buttonColor: string;
}

const FeatureCard = ({
  icon: Icon,
  title,
  description,
  href,
  bgColor,
  iconColor,
  buttonColor,
}: FeatureCardProps) => (
  <Card
    className={`${bgColor} group relative h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
  >
    <CardContent className="flex h-full flex-col p-6">
      <div className="flex flex-1 flex-col items-center text-center">
        <div
          className={`mb-4 flex size-12 items-center justify-center rounded-full ${iconColor}/20 transition-transform duration-300 group-hover:scale-110`}
        >
          <Icon className={`size-6 ${iconColor}`} />
        </div>
        <h3 className="text-foreground font-varela mb-2 text-lg font-bold">{title}</h3>
        <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">{description}</p>
        <Button
          asChild
          className={`${buttonColor} mt-auto w-full text-black transition-all duration-200 hover:scale-105 focus-visible:scale-105`}
        >
          <Link href={href}>Acessar {title}</Link>
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Stats component for user engagement
const UserStats = ({ user }: { user: any }) => (
  <div className="mt-4 grid grid-cols-2 gap-4">
    <div className="bg-grey-light/40 rounded-lg p-3 text-center">
      <Activity className="text-blue-dark mx-auto mb-1 size-4" />
      <p className="text-muted-foreground text-xs">Atividade</p>
      <p className="text-sm font-semibold">7 dias</p>
    </div>
    <div className="bg-grey-light/40 rounded-lg p-3 text-center">
      <Clock className="text-blue-dark mx-auto mb-1 size-4" />
      <p className="text-muted-foreground text-xs">Última sessão</p>
      <p className="text-sm font-semibold">Hoje</p>
    </div>
  </div>
);

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, isAuth, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Format member since date with better error handling
  const memberSince = user?.createdAt
    ? (() => {
        try {
          const formatted = formatDate(user.createdAt, false);
          const parts = formatted.split('/');
          return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : 'Jan 2024';
        } catch {
          return 'Jan 2024';
        }
      })()
    : 'Jan 2024';

  // Feature cards data
  const featureCards = [
    {
      icon: Book,
      title: 'Diário',
      description: 'Registre seus pensamentos e acompanhe seu humor ao longo do tempo.',
      href: '/journal',
      bgColor: 'border-accent/50 bg-accent/10',
      iconColor: 'text-green-dark',
      buttonColor: 'bg-green-dark hover:bg-green-dark/90',
    },
    {
      icon: Pill,
      title: 'Medicamentos',
      description: 'Gerencie sua agenda de medicamentos e lembretes.',
      href: '/medication',
      bgColor: 'border-primary/50 bg-primary/10',
      iconColor: 'text-primary',
      buttonColor: 'bg-primary hover:bg-primary/90',
    },
    {
      icon: ClipboardList,
      title: 'Questionários',
      description: 'Complete avaliações para acompanhar seu progresso em saúde mental.',
      href: '/inventory',
      bgColor: 'border-blue-medium/50 bg-blue-light/20',
      iconColor: 'text-blue-dark',
      buttonColor: 'bg-blue-dark hover:bg-blue-dark/90',
    },
  ];

  return (
    <>
      <div className="mx-auto max-w-7xl pb-5">
        <Toaster richColors position="top-center" />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Enhanced Profile Card */}
          <Card className="overflow-hidden lg:col-span-3">
            <CardHeader className="pb-2">
              <div className="text-center">
                <ProfilePictureUpload size="xl" className="transition-transform hover:scale-105" />
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <div className="space-y-4">
                {/* User Info */}
                <div className="space-y-2 text-center">
                  <h2 className="text-foreground text-xl font-semibold">
                    {user?.name} {user?.surname}
                  </h2>

                  {/* Role Badges */}
                  <div className="flex flex-wrap justify-center gap-2">
                    {user?.roles?.includes('admin') && (
                      <Badge variant="outline" className="text-primary border-primary/50">
                        <Star className="mr-1 size-3" />
                        Administrador
                      </Badge>
                    )}
                    {user?.roles?.includes('patient') && !user?.roles?.includes('admin') && (
                      <Badge variant="outline" className="text-accent-foreground border-accent">
                        Paciente
                      </Badge>
                    )}
                  </div>
                </div>

                {/* User Details */}
                <div className="space-y-3 text-sm">
                  <div className="border-border/50 flex items-center justify-between border-b py-2">
                    <span className="text-muted-foreground">Membro desde</span>
                    <span className="font-medium">{memberSince}</span>
                  </div>
                  <div className="border-border/50 flex items-center justify-between border-b py-2">
                    <span className="text-muted-foreground">E-mail</span>
                    <span className="max-w-[150px] truncate font-medium" title={user?.email}>
                      {user?.email}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">Função</span>
                    <span className="font-medium">
                      {user?.roles?.includes('admin') ? 'Admin' : 'Paciente'}
                    </span>
                  </div>
                </div>

                {/* User Stats */}
                <UserStats user={user} />

                {/* Logout Button */}
                <Button
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive mt-6 w-full transition-all duration-200 hover:text-black"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 size-4" />
                  Sair
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Tabs Section */}
          <div className="space-y-6 lg:col-span-9">
            <Tabs
              defaultValue="profile"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <Card className="overflow-hidden">
                <CardContent className="p-6">
                  <TabsList className="bg-grey-light/40 mb-8 grid w-full grid-cols-3">
                    <TabsTrigger
                      value="profile"
                      className="data-[state=active]:bg-background data-[state=active]:text-blue-dark"
                    >
                      <User className="mr-2 size-4" />
                      <span className="hidden sm:inline">Perfil</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="security"
                      className="data-[state=active]:bg-background data-[state=active]:text-blue-dark"
                    >
                      <Shield className="mr-2 size-4" />
                      <span className="hidden sm:inline">Segurança</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="notifications"
                      className="data-[state=active]:bg-background data-[state=active]:text-blue-dark"
                    >
                      <Settings className="mr-2 size-4" />
                      <span className="hidden sm:inline">Configurações</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="profile" className="mt-0">
                    <ProfileTab />
                  </TabsContent>
                  <TabsContent value="security" className="mt-0">
                    <SecurityTab />
                  </TabsContent>
                  <TabsContent value="notifications" className="mt-0">
                    <NotificationsTab />
                  </TabsContent>
                </CardContent>
              </Card>
            </Tabs>

            {/* Enhanced Feature Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {featureCards.map((card, index) => (
                <FeatureCard key={index} {...card} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
