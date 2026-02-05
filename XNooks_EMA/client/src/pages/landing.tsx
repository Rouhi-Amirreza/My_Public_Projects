import { Button } from "@/components/ui/button";
import { Plane, Search, Bell, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <Plane className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold font-serif">XNooks Travel Expense Optimizer</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/api/login">Log In</a>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold font-serif mb-6">
            Find Your Perfect Flight
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Search and compare flights across airlines. Save searches, track prices, and get the best deals.
          </p>
          <Button size="lg" asChild data-testid="button-get-started">
            <a href="/api/login">
              Get Started
            </a>
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-card p-6 rounded-lg border">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Smart Search</h3>
            <p className="text-muted-foreground">
              Search for round-trip and one-way flights with advanced filters and sorting options.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Price Alerts</h3>
            <p className="text-muted-foreground">
              Set price alerts for your favorite routes and get notified when prices drop.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <div className="bg-primary/10 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Save & Compare</h3>
            <p className="text-muted-foreground">
              Save your searches and compare multiple flight options to make the best decision.
            </p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto bg-card p-8 rounded-lg border text-center">
          <h3 className="text-2xl font-bold mb-4">Ready to find your next flight?</h3>
          <p className="text-muted-foreground mb-6">
            Log in to access saved searches, price alerts, and trip comparisons.
          </p>
          <Button size="lg" asChild data-testid="button-login-bottom">
            <a href="/api/login">
              Log In to Continue
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
