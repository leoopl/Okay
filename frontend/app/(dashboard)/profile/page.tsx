'use client';

import { NotificationsTab } from '@/components/profile/notifications-tab';
import { ProfileTab } from '@/components/profile/profile-tab';
import { SecurityTab } from '@/components/profile/security-tab';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Book, ClipboardList, LogOut, Pill, Settings, Shield, Star, User } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function Profile() {
  const [activeTab, setActiveTab] = useState('profile');
  return (
    <div className="mx-auto max-w-7xl pb-5">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Profile Card */}
        <Card className="bg-grey-light/30 lg:col-span-3">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="space-y-2 text-center">
                <h2 className="text-xl font-semibold">John Doe</h2>
                <Badge variant="outline" className="text-yellow-dark">
                  Pro Member
                  <Star />
                </Badge>
              </div>
              <div className="w-full space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-okay-grey-dark">Member since</span>
                  <span>Jan 2024</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-okay-grey-dark">Last active</span>
                  <span>2 hours ago</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-okay-grey-dark">Role</span>
                  <span>Admin</span>
                </div>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive mt-8 w-full"
                >
                  Log out
                  <LogOut />
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
                  <User />
                  Perfil
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="data-[state=active]:text-blue-dark data-[state=active]:bg-beige-light/40"
                >
                  <Shield />
                  Segurança
                </TabsTrigger>
                <TabsTrigger
                  value="notifications"
                  className="data-[state=active]:text-blue-dark data-[state=active]:bg-beige-light/40"
                >
                  <Settings />
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
                <h3 className="mb-2 text-lg font-bold text-[#7F9463]">Journal</h3>
                <p className="mb-4 text-[#91857A]">
                  Record your thoughts and track your mood over time.
                </p>
                <Button asChild className="bg-[#7F9463] text-white hover:bg-[#7F9463]/90">
                  <Link href="/journal">Open Journal</Link>
                </Button>
              </div>
            </Card>

            <Card className="border-[#C2B2A3] bg-[#F2DECC]/30 p-6 transition-shadow hover:shadow-md">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F4B400]/20">
                  <Pill className="h-6 w-6 text-[#F4B400]" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#7F9463]">Medication</h3>
                <p className="mb-4 text-[#91857A]">
                  Manage your medication schedule and reminders.
                </p>
                <Button asChild className="bg-[#F4B400] text-white hover:bg-[#F4B400]/90">
                  <Link href="/medication">Medication Settings</Link>
                </Button>
              </div>
            </Card>

            <Card className="border-[#78C7EE] bg-[#A5DCF6]/30 p-6 transition-shadow hover:shadow-md">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#039BE5]/20">
                  <ClipboardList className="h-6 w-6 text-[#039BE5]" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#7F9463]">Questionnaires</h3>
                <p className="mb-4 text-[#91857A]">
                  Complete assessments to track your mental health progress.
                </p>
                <Button asChild className="bg-[#039BE5] text-white hover:bg-[#039BE5]/90">
                  <Link href="/questionnaires">View Questionnaires</Link>
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
