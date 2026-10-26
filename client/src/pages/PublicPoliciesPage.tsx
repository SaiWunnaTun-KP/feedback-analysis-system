import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { LineChart, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import PoliciesView from '@/components/policies/PoliciesView';
import { ScrollToTopButton } from '@/components/ScrollToTopButton';

interface PublicPoliciesPageProps {
  defaultTab?: 'terms' | 'privacy';
}

export default function PublicPoliciesPage({ defaultTab = 'terms' }: PublicPoliciesPageProps) {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, search]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-primary hover:opacity-90 transition-opacity">
            <LineChart className="h-6 w-6" />
            <span className="font-bold text-lg tracking-tight text-foreground">
              InsightRetail
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Home</span>
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <PoliciesView isEmbedded={false} initialTab={defaultTab} />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 py-8 text-center text-xs text-muted-foreground bg-card mt-12">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} InsightRetail Feedback Analysis System. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link to="/terms?tab=terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <Link to="/terms?tab=privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>

      <ScrollToTopButton />
    </div>
  );
}
