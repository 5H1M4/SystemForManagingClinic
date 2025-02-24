import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import {
  Calendar,
  Users,
  Building2,
  ClipboardList,
  CreditCard,
  Settings,
} from "lucide-react";

const navigation = {
  SUPER_ADMIN: [
    { name: "Clinics", href: "/clinics", icon: Building2 },
    { name: "Users", href: "/users", icon: Users },
    { name: "Settings", href: "/settings", icon: Settings },
  ],
  CLINIC_ADMIN: [
    { name: "Dashboard", href: "/", icon: ClipboardList },
    { name: "Appointments", href: "/appointments", icon: Calendar },
    { name: "Patients", href: "/patients", icon: Users },
    { name: "Services", href: "/services", icon: ClipboardList },
    { name: "Payments", href: "/payments", icon: CreditCard },
  ],
  DOCTOR: [
    { name: "Dashboard", href: "/", icon: ClipboardList },
    { name: "Appointments", href: "/appointments", icon: Calendar },
    { name: "Patients", href: "/patients", icon: Users },
  ],
  CLIENT: [
    { name: "Appointments", href: "/appointments", icon: Calendar },
    { name: "Profile", href: "/profile", icon: Users },
  ],
};

export function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const items = navigation[user.role as keyof typeof navigation] || [];

  return (
    <div className="w-64 min-h-screen bg-sidebar border-r">
      <nav className="space-y-2 p-4">
        {items.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-sidebar-accent",
                isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
