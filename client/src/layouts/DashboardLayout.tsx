import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { NotificationSystem } from '../components/NotificationSystem';
import { ThemeToggle } from '../components/ThemeToggle';
import { AnnouncementModal } from '../components/AnnouncementModal';
import {
  LogOut,
  LineChart,
  Package,
  MessageSquareText,
  Users,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollToTopButton } from '../components/ScrollToTopButton';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Manage Plans', path: '/admin', icon: Package },
    { name: 'Manage User Feedbacks', path: '/admin/feedbacks', icon: MessageSquareText },
    { name: 'Manage Users', path: '/admin/users', icon: Users },
    { name: 'Manage FAQs', path: '/admin/faqs', icon: HelpCircle },
    { name: 'Manage Terms & Policies', path: '/admin/terms', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border text-card-foreground flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <NavLink to="/" className="flex items-center gap-2 text-primary hover:opacity-90 transition-opacity">
            <LineChart size={24} />
            <span className="font-bold text-lg tracking-tight text-foreground">
              InsightRetail
            </span>
          </NavLink>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/admin'}
              onClick={() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                if (document.documentElement) document.documentElement.scrollTop = 0;
                if (document.body) document.body.scrollTop = 0;
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${isActive
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300 font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut size={18} className="mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-64 min-h-screen bg-background">
        {/* Top Header */}
        <header className="h-16 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 border-b border-border flex items-center justify-between px-8 sticky top-0 z-40">
          <h2 className="text-lg font-semibold text-foreground">
            Admin
          </h2>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationSystem />

            <div className="flex flex-col items-end">
              <span className="text-sm font-medium leading-none text-foreground">{user?.username}</span>
              <span className="text-xs text-muted-foreground mt-1 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* In-app Plan Announcements Modal */}
      <AnnouncementModal />

      {/* Floating Scroll to Top Button */}
      <ScrollToTopButton />
    </div>
  );
}
