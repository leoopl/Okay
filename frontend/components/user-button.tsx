'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  BookHeart,
  Pill,
  Settings,
  LogOut,
  ChevronDown,
  CircleUser,
  NotebookPen,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUserInitials } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

export default function UserButton() {
  const { profile, signOut, isLoggingOut } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
  };

  const menuItems = [
    {
      label: 'Diário',
      icon: BookHeart,
      path: '/journal',
      description: 'Reflexões pessoais e pensamentos',
    },
    {
      label: 'Inventário',
      icon: NotebookPen,
      path: '/inventory',
      description: 'Avaliações psicológicas',
    },
    {
      label: 'Medicamentos',
      icon: Pill,
      path: '/medication',
      description: 'Acompanhamento de medicamentos e lembretes',
    },
    {
      label: 'Configurações',
      icon: Settings,
      path: '/profile',
      description: 'Preferências da conta e do aplicativo',
    },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="hover:bg-primary/20 relative h-10 w-auto px-3 py-2">
          <div className="flex items-center gap-2">
            <Avatar className="ring-primary/30 h-8 w-8 ring-2">
              <AvatarImage
                src={profile?.profilePictureUrl ?? undefined}
                alt={profile?.name}
                className="object-cover"
              />
              <AvatarFallback className="from-primary/30 to-primary text-primary-foreground bg-linear-to-br text-sm font-medium">
                {profile ? getUserInitials(profile) : <CircleUser />}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground hidden max-w-30 truncate text-sm font-medium sm:block">
              {profile?.name} {profile?.surname}
            </span>
            <ChevronDown
              className={`text-muted-foreground h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="border-border/30 bg-popover w-64 border p-2 shadow-lg"
        align="end"
        sideOffset={8}
      >
        {/* User Info Section */}
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="ring-border/30 size-10 ring-2">
              <AvatarImage
                src={profile?.profilePictureUrl ?? undefined}
                alt={profile?.name}
                className="object-cover"
              />
              <AvatarFallback className="from-primary/30 to-primary text-primary-foreground bg-linear-to-br text-sm font-medium">
                {profile ? getUserInitials(profile) : <CircleUser />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-foreground text-sm font-medium">{profile?.name}</span>
              <span className="text-muted-foreground text-xs">{profile?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-border/30" />

        {/* Navigation Items */}
        <div className="py-1">
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className="hover:bg-primary/20 focus:bg-primary/20 cursor-pointer rounded-md px-3 py-2 transition-colors duration-150"
            >
              <div className="flex w-full items-center gap-3">
                <div className="shrink-0">
                  <item.icon className="text-accent-strong size-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-foreground text-sm font-medium">{item.label}</span>
                  <span className="text-muted-foreground text-xs">{item.description}</span>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator className="bg-border/30" />

        {/* Logout Button */}
        <div className="py-1">
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="hover:bg-destructive/40 focus:bg-destructive/40 text-destructive cursor-pointer rounded-md px-3 py-2 transition-colors duration-150"
          >
            <div className="flex w-full items-center gap-3">
              <LogOut className="size-4" />
              <span className="text-sm font-medium">{isLoggingOut ? 'Saindo...' : 'Sair'}</span>
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
