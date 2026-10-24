import React from 'react';
import { Outlet, useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { NotificationSystem } from '../components/NotificationSystem';
import { ThemeToggle } from '../components/ThemeToggle';
import { AnnouncementModal } from '../components/AnnouncementModal';
import { LogOut, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollToTopButton } from '../components/ScrollToTopButton';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-8">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-xs">
              <LineChart size={18} />
            </div>
            <span className="font-bold hidden sm:inline-block tracking-tight text-foreground text-base">
              InsightRetail
            </span>
            <span className="hidden sm:inline-block text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Admin
            </span>
          </Link>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationSystem />
            
            <div className="hidden sm:flex flex-col items-end mr-1">
              <span className="text-sm font-medium leading-none text-foreground">{user?.username}</span>
              <span className="text-xs text-muted-foreground mt-1 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-full"
            >
              <LogOut size={18} />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 container max-w-screen-2xl mx-auto">
        <Outlet />
      </main>

      {/* In-app Plan Announcements Modal */}
      <AnnouncementModal />

      {/* Floating Scroll to Top Button */}
      <ScrollToTopButton />
    </div>
  );
}
