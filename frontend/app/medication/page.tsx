'use client';

import MedicationHistoryReports from '@/components/medication/medication-history-reports';
import MedicationList from '@/components/medication/medication-list';
import MedicationSchedule from '@/components/medication/medication-schedule';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

export default function MedicationPage() {
  const [activeTab, setActiveTab] = useState('medications');
  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-green-dark font-varela mb-8 text-3xl font-bold md:text-4xl">
          Medication Tracker
        </h1>
        <div className="space-y-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-grey-light/30 grid w-full grid-cols-3">
              <TabsTrigger
                value="medications"
                className="data-[state=active]:text-blue-dark data-[state=active]:bg-beige-light/40"
              >
                Medications
              </TabsTrigger>
              <TabsTrigger
                value="schedule"
                className="data-[state=active]:text-blue-dark data-[state=active]:bg-beige-light/40"
              >
                Schedule
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="data-[state=active]:text-blue-dark data-[state=active]:bg-beige-light/40"
              >
                History & Reports
              </TabsTrigger>
            </TabsList>

            <Card className="border-grey-light bg-white/80 p-6">
              <TabsContent value="medications" className="mt-0">
                <MedicationList />
              </TabsContent>
              <TabsContent value="schedule" className="mt-0 space-y-4">
                <MedicationSchedule />
              </TabsContent>
              <TabsContent value="history" className="mt-0">
                <MedicationHistoryReports />
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
