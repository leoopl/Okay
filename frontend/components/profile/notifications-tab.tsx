'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

export function NotificationsTab() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [frequency, setFrequency] = useState('daily');

  const handleSave = () => {
    // In a real app, you would save the notification preferences to the server here
  };

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-[#7F9463]">Notification Preferences</h2>

      <div className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#7F9463]">Notification Channels</h3>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[#797D89]">Email Notifications</Label>
              <p className="text-sm text-[#91857A]">
                Receive updates, reminders, and reports via email
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
              className="data-[state=checked]:bg-[#039BE5]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[#797D89]">Push Notifications</Label>
              <p className="text-sm text-[#91857A]">Receive notifications on your device</p>
            </div>
            <Switch
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
              className="data-[state=checked]:bg-[#039BE5]"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-[#797D89]">SMS Notifications</Label>
              <p className="text-sm text-[#91857A]">Receive text messages for important alerts</p>
            </div>
            <Switch
              checked={smsNotifications}
              onCheckedChange={setSmsNotifications}
              className="data-[state=checked]:bg-[#039BE5]"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#7F9463]">Summary Frequency</h3>
          <RadioGroup value={frequency} onValueChange={setFrequency}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="daily" id="daily" className="text-[#039BE5]" />
              <Label htmlFor="daily" className="text-[#797D89]">
                Daily summary
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="weekly" id="weekly" className="text-[#039BE5]" />
              <Label htmlFor="weekly" className="text-[#797D89]">
                Weekly summary
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monthly" id="monthly" className="text-[#039BE5]" />
              <Label htmlFor="monthly" className="text-[#797D89]">
                Monthly summary
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[#7F9463]">Types of Notifications</h3>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="reminders"
                className="rounded text-[#039BE5]"
                defaultChecked
              />
              <Label htmlFor="reminders" className="text-[#797D89]">
                Medication reminders
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="appointments"
                className="rounded text-[#039BE5]"
                defaultChecked
              />
              <Label htmlFor="appointments" className="text-[#797D89]">
                Appointment reminders
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="journal"
                className="rounded text-[#039BE5]"
                defaultChecked
              />
              <Label htmlFor="journal" className="text-[#797D89]">
                Journal prompts
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="tips" className="rounded text-[#039BE5]" defaultChecked />
              <Label htmlFor="tips" className="text-[#797D89]">
                Wellness tips
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="updates"
                className="rounded text-[#039BE5]"
                defaultChecked
              />
              <Label htmlFor="updates" className="text-[#797D89]">
                App updates
              </Label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-[#7F9463] text-white hover:bg-[#7F9463]/90">
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}
