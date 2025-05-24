'use client';

import { NotificationsTab } from '@/components/profile/notifications-tab';
import { ProfileTab } from '@/components/profile/profile-tab';
import { SecurityTab } from '@/components/profile/security-tab';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Book,
  CircleUser,
  ClipboardList,
  LogOut,
  Pill,
  Settings,
  Shield,
  Star,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { formatDate, getUserInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile');
  const { user, isAuth, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // Format member since date
  const memberSince = user?.createdAt
    ? formatDate(user.createdAt, false).split('/')[1] +
      '/' +
      formatDate(user.createdAt, false).split('/')[2]
    : 'Jan 2024';

  return (
    <div className="mx-auto max-w-7xl pb-5">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Profile Card */}
        <Card className="bg-grey-light/30 lg:col-span-3">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage
                  src={`https://ui-avatars.com/api/?name=${user?.name}+${user?.surname || ''}&background=7F9463&color=fff`}
                />
                <AvatarFallback>{user ? getUserInitials(user) : <CircleUser />}</AvatarFallback>
              </Avatar>
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-semibold">
                  {user?.name} {user?.surname}
                </h2>
                {user?.roles?.includes('admin') && (
                  <Badge variant="outline" className="text-yellow-dark">
                    Administrador
                    <Star className="ml-1 h-3 w-3" />
                  </Badge>
                )}
                {user?.roles?.includes('patient') && !user?.roles?.includes('admin') && (
                  <Badge variant="outline" className="text-green-dark">
                    Paciente
                  </Badge>
                )}
              </div>
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-okay-grey-dark">Membro desde</span>
                  <span>{memberSince}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-okay-grey-dark">E-mail</span>
                  <span className="max-w-[150px] truncate">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-okay-grey-dark">Função</span>
                  <span>{user?.roles?.includes('admin') ? 'Admin' : 'Paciente'}</span>
                </div>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive mt-8 w-full"
                  onClick={handleLogout}
                >
                  Sair
                  <LogOut className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs Card */}
        <div className="space-y-6 lg:col-span-9">
          <Tabs
            defaultValue="profile"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <Card className="bg-grey-light/30 p-6 md:col-span-3">
              <TabsList className="bg-grey-light mb-8 grid w-full grid-cols-3">
                <TabsTrigger
                  value="profile"
                  className="data-[state=active]:text-blue-dark data-[state=active]:bg-beige-light/40"
                >
                  <User className="mr-2 h-4 w-4" />
                  Perfil
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="data-[state=active]:text-blue-dark data-[state=active]:bg-beige-light/40"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Segurança
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="data-[state=active]:text-blue-dark data-[state=active]:bg-beige-light/40"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
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
            </Card>
          </Tabs>

          {/* Feature Card */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card className="border-[#ABB899] bg-[#D1DBC3]/30 p-6 transition-shadow hover:shadow-md">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#7F9463]/20">
                  <Book className="h-6 w-6 text-[#7F9463]" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#7F9463]">Diário</h3>
                <p className="mb-4 text-[#91857A]">
                  Registre seus pensamentos e acompanhe seu humor ao longo do tempo.
                </p>
                <Button asChild className="bg-[#7F9463] text-white hover:bg-[#7F9463]/90">
                  <Link href="/journal">Abrir Diário</Link>
                </Button>
              </div>
            </Card>

            <Card className="border-[#C2B2A3] bg-[#F2DECC]/30 p-6 transition-shadow hover:shadow-md">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4B400]/20">
                  <Pill className="h-6 w-6 text-[#F4B400]" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#7F9463]">Medicamentos</h3>
                <p className="mb-4 text-[#91857A]">
                  Gerencie sua agenda de medicamentos e lembretes.
                </p>
                <Button asChild className="bg-[#F4B400] text-white hover:bg-[#F4B400]/90">
                  <Link href="/medication">Configurações de Medicamentos</Link>
                </Button>
              </div>
            </Card>

            <Card className="border-[#78C7EE] bg-[#A5DCF6]/30 p-6 transition-shadow hover:shadow-md">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#039BE5]/20">
                  <ClipboardList className="h-6 w-6 text-[#039BE5]" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#7F9463]">Questionários</h3>
                <p className="mb-4 text-[#91857A]">
                  Complete avaliações para acompanhar seu progresso em saúde mental.
                </p>
                <Button asChild className="bg-[#039BE5] text-white hover:bg-[#039BE5]/90">
                  <Link href="/inventory">Ver Questionários</Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
