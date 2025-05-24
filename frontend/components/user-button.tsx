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
  Package,
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
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  const menuItems = [
    {
      label: 'Journal',
      icon: BookHeart,
      path: '/journal',
      description: 'Personal reflections and thoughts',
    },
    {
      label: 'Inventory',
      icon: NotebookPen,
      path: '/inventory',
      description: 'Psychological assessments',
    },
    {
      label: 'Medications',
      icon: Pill,
      path: '/medication',
      description: 'Medication tracking and reminders',
    },
    {
      label: 'Settings',
      icon: Settings,
      path: '/profile',
      description: 'Account and app preferences',
    },
  ];

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="hover:bg-yellow-light/20 relative h-10 w-auto px-3 py-2">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8 ring-2 ring-[#F8D77C]/30">
              <AvatarImage
                src={`https://ui-avatars.com/api/?name=${user?.name}+${user?.surname || ''}&background=7F9463&color=fff`}
                alt={user?.name}
                className="object-cover"
              />
              <AvatarFallback className="from-yellow-light to-yellow-dark bg-gradient-to-br text-sm font-medium text-white">
                {user ? getUserInitials(user) : <CircleUser />}
              </AvatarFallback>
            </Avatar>
            <span className="text-grey-dark hidden max-w-[120px] truncate text-sm font-medium sm:block">
              {user?.name} {user?.surname}
            </span>
            <ChevronDown
              className={`text-grey-dark h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="border-grey-dark/30 w-64 border bg-white p-2 shadow-lg"
        align="end"
        sideOffset={8}
      >
        {/* User Info Section */}
        <DropdownMenuLabel className="px-3 py-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-[#F8D77C]/30">
              <AvatarImage
                src={`https://ui-avatars.com/api/?name=${user?.name}+${user?.surname || ''}&background=7F9463&color=fff`}
                alt={user?.name}
                className="object-cover"
              />
              <AvatarFallback className="from-yellow-light to-yellow-dark bg-gradient-to-br text-sm font-medium text-white">
                {user ? getUserInitials(user) : <CircleUser />}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-grey-dark text-sm font-medium">{user?.name}</span>
              <span className="text-grey-medium text-xs">{user?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-grey-dark/30" />

        {/* Navigation Items */}
        <div className="py-1">
          {menuItems.map((item) => (
            <DropdownMenuItem
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className="hover:bg-yellow-light/30 focus:bg-yellow-light/30 cursor-pointer rounded-md px-3 py-2 transition-colors duration-150"
            >
              <div className="flex w-full items-center gap-3">
                <div className="flex-shrink-0">
                  <item.icon className="text-green-dark h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-grey-dark text-sm font-medium">{item.label}</span>
                  <span className="text-grey-medium text-xs">{item.description}</span>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </div>

        <DropdownMenuSeparator className="bg-[#CBCFD7]/30" />

        {/* Logout Button */}
        <div className="py-1">
          <DropdownMenuItem
            onClick={handleLogout}
            className="hover:bg-destructive/40 focus:bg-destructive/40 cursor-pointer rounded-md px-3 py-2 text-red-600 transition-colors duration-150"
          >
            <div className="flex w-full items-center gap-3">
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
