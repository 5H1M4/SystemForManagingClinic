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
      </main>
    </div>
  );
}
