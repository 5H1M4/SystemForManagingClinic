import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Clock, User, Heart } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <h2 className="text-lg font-semibold">ClinicFlow</h2>
          <Link href="/auth">
            <Button variant="secondary">Sign In</Button>
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="py-20 text-center">
          <div className="container">
            <h1 className="text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Modern Healthcare Management
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Experience seamless healthcare scheduling and management with our comprehensive clinic system.
            </p>
            <Link href="/auth?action=register">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
                Book Your Appointment
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-muted/50">
          <div className="container">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                  <Calendar className="h-6 w-6 mb-2 text-primary" />
                  <CardTitle>Easy Scheduling</CardTitle>
                  <CardDescription>
                    Book appointments online at your convenience
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                  <Clock className="h-6 w-6 mb-2 text-primary" />
                  <CardTitle>Real-time Updates</CardTitle>
                  <CardDescription>
                    Get instant notifications about your appointments
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                  <User className="h-6 w-6 mb-2 text-primary" />
                  <CardTitle>Expert Doctors</CardTitle>
                  <CardDescription>
                    Connect with qualified healthcare professionals
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                  <Heart className="h-6 w-6 mb-2 text-primary" />
                  <CardTitle>Quality Care</CardTitle>
                  <CardDescription>
                    Receive personalized attention and care
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-20">
          <div className="container">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  Your Health, Our Priority
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p>
                    At ClinicFlow, we understand that your time is valuable. Our modern healthcare management system is designed to make your medical appointments and follow-ups as seamless as possible.
                  </p>
                  <p>
                    With features like online booking, appointment reminders, and secure medical records, we ensure that you receive the best possible care without the usual hassles of traditional clinic visits.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <img 
                    src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80"
                    alt="Modern Clinic Reception"
                    className="h-32 w-full object-cover rounded-lg"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80"
                    alt="Treatment Room"
                    className="h-64 w-full object-cover rounded-lg"
                  />
                </div>
                <div className="space-y-4 pt-8">
                  <img 
                    src="https://images.unsplash.com/photo-1631217868264-e5b90bb4fbd3?auto=format&fit=crop&q=80"
                    alt="Medical Equipment"
                    className="h-64 w-full object-cover rounded-lg"
                  />
                  <img 
                    src="https://images.unsplash.com/photo-1666214280557-f1b5022eb634?auto=format&fit=crop&q=80"
                    alt="Consultation Room"
                    className="h-32 w-full object-cover rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-20 bg-muted/50">
          <div className="container">
            <h2 className="text-3xl font-bold text-center mb-12">
              Our Services
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>General Consultation</CardTitle>
                  <CardDescription>
                    Regular checkups and health monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Comprehensive health assessment</li>
                    <li>Preventive care</li>
                    <li>Health advice and counseling</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Specialist Consultation</CardTitle>
                  <CardDescription>
                    Expert care for specific conditions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Specialized treatment plans</li>
                    <li>Advanced diagnostics</li>
                    <li>Follow-up care</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle>Medical Procedures</CardTitle>
                  <CardDescription>
                    Various medical services and treatments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Minor surgical procedures</li>
                    <li>Vaccinations</li>
                    <li>Health screenings</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t">
          <div className="container py-12">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <h3 className="font-semibold mb-4">ClinicFlow</h3>
                <p className="text-sm text-muted-foreground">
                  Modern healthcare management for a better patient experience.
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Quick Links</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>
                    <Link href="/auth">Book Appointment</Link>
                  </li>
                  <li>
                    <Link href="/auth">Patient Portal</Link>
                  </li>
                  <li>
                    <button onClick={() => window.location.href = "/auth/staff"} className="text-muted-foreground hover:text-primary">
                      Staff Login
                    </button>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Contact</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>123 Healthcare Ave</li>
                  <li>contact@clinicflow.com</li>
                  <li>+1 234 567 890</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Hours</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Mon-Fri: 9:00 AM - 6:00 PM</li>
                  <li>Sat: 9:00 AM - 2:00 PM</li>
                  <li>Sun: Closed</li>
                </ul>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
              © {new Date().getFullYear()} ClinicFlow. All rights reserved.
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}