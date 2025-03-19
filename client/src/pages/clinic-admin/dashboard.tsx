import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import ServicesManagement from '@/components/clinic-admin-dashboard/ServicesManagement';
import DoctorManagement from '@/components/clinic-admin-dashboard/DoctorManagement';
import SchedulingAndRevenue from '@/components/clinic-admin-dashboard/SchedulingAndRevenue';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Settings, Users, Calendar } from 'lucide-react';

export default function ClinicAdminDashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'CLINIC_ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold mb-6">Clinic Admin Dashboard</h1>
        
        <Tabs defaultValue="scheduling" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scheduling" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Scheduling & Revenue
            </TabsTrigger>
            <TabsTrigger value="doctors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Doctors
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Services
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="scheduling" className="space-y-4">
            <SchedulingAndRevenue />
          </TabsContent>
          
          <TabsContent value="doctors" className="space-y-4">
            <DoctorManagement />
          </TabsContent>
          
          <TabsContent value="services" className="space-y-4">
            <ServicesManagement />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
} 