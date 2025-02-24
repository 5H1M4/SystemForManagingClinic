import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Users, Calendar, DollarSign } from "lucide-react";
import { Link } from "wouter";

export default function SuperAdminDashboard() {
  const { data: clinics, isLoading } = useQuery({
    queryKey: ["/api/clinics"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">SuperAdmin Dashboard</h2>
        <Link href="/superadmin/clinics/new">
          <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
            <Plus className="mr-2 h-4 w-4" /> Create Clinic
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clinics</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clinics?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Managed Clinics</CardTitle>
          </CardHeader>
          <CardContent>
            {clinics?.length ? (
              <div className="divide-y divide-border rounded-md border">
                {clinics.map((clinic: any) => (
                  <div
                    key={clinic.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="font-medium">{clinic.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {clinic.address}
                      </p>
                    </div>
                    <Link href={`/superadmin/clinics/${clinic.id}`}>
                      <Button variant="outline">View Details</Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-muted-foreground">No clinics found</p>
                <Link href="/superadmin/clinics/new">
                  <Button
                    variant="outline"
                    className="mt-4"
                  >
                    Create Your First Clinic
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
