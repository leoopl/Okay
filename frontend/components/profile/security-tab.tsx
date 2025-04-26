'use client';

import type React from 'react';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function SecurityTab() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would update the password here
  };

  const handleTwoFactorToggle = (checked: boolean) => {
    setTwoFactorEnabled(checked);
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-[#7F9463]">Security Settings</h2>

      <div className="space-y-8">
        <div>
          <h3 className="mb-4 text-lg font-medium text-[#7F9463]">Change Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-[#797D89]">
                Current Password
              </Label>
              <Input
                id="currentPassword"
                type="password"
                className="border-[#CBCFD7] focus-visible:ring-[#039BE5]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-[#797D89]">
                New Password
              </Label>
              <Input
                id="newPassword"
                type="password"
                className="border-[#CBCFD7] focus-visible:ring-[#039BE5]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[#797D89]">
                Confirm New Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                className="border-[#CBCFD7] focus-visible:ring-[#039BE5]"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit">Update Password</Button>
            </div>
          </form>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-medium text-[#7F9463]">Two-Factor Authentication</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#91857A]">
                Add an extra layer of security to your account by enabling two-factor
                authentication.
              </p>
            </div>
            <Switch
              checked={twoFactorEnabled}
              onCheckedChange={handleTwoFactorToggle}
              className="data-[state=checked]:bg-[#039BE5]"
            />
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-lg font-medium text-[#7F9463]">Sessions</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-md bg-[#CBCFD7]/20 p-4">
              <div>
                <p className="font-medium text-[#797D89]">Current Session</p>
                <p className="text-sm text-[#91857A]">Web Browser • Los Angeles, CA • Active now</p>
              </div>
              <div className="rounded bg-[#7F9463]/20 px-2 py-1 text-xs font-medium text-[#7F9463]">
                Current
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md bg-[#CBCFD7]/20 p-4">
              <div>
                <p className="font-medium text-[#797D89]">Mobile App</p>
                <p className="text-sm text-[#91857A]">iPhone • Los Angeles, CA • 1 hour ago</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-[#ABB899] text-[#7F9463] hover:bg-[#D1DBC3]/20"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
