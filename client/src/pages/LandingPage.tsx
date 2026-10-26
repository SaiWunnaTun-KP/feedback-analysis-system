import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { faqsApi, plansApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  LineChart,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Upload,
  Brain,
  BarChart3,
  TrendingUp,
  LayoutDashboard,
  PieChart,
  Layers,
  Grid,
  Cloud,
  Search,
  Filter,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Users,
  Target,
  ChevronRight,
  HelpCircle,
  ExternalLink,
  MessageSquare,
  Award,
  HardDrive,
  Calendar,
  LogOut,
  Menu,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface FaqItem {
  id: number;
  faqId?: number;
  question: string;
  answer: string;
  sortOrder?: number;
}

interface PlanItem {
  id: number;
  name: string;
  price: string;
  maxStorageMb: number;
  durationDays: number;
  status: string;
}

// Sample interactive reviews to demonstrate PyABSA triplet extraction
const DEMO_REVIEWS = [
  {
    id: 1,
    title: 'Smart Wireless Noise-Cancelling Headphones',
    category: 'Audio & Acoustics',
    rating: 4,
    text: 'The acoustic clarity is breathtaking and noise cancellation works like magic on flights, however the headband padding feels uncomfortable during long listening sessions.',
    triplets: [
      { aspect: 'acoustic clarity', opinion: 'breathtaking', sentiment: 'POSITIVE', confidence: 0.98 },
      { aspect: 'noise cancellation', opinion: 'works like magic', sentiment: 'POSITIVE', confidence: 0.96 },
      { aspect: 'headband padding', opinion: 'uncomfortable', sentiment: 'NEGATIVE', confidence: 0.93 },
    ],
  },
  {
    id: 2,
    title: 'Pro Ultra HD Smart Television (55")',
    category: 'Home Entertainment',
    rating: 3,
    text: 'Stunning 4K OLED display with vibrant colors, but the built-in speaker sound is hollow and the remote control response is frustratingly slow.',
    triplets: [
      { aspect: '4K OLED display', opinion: 'stunning', sentiment: 'POSITIVE', confidence: 0.99 },
      { aspect: 'colors', opinion: 'vibrant', sentiment: 'POSITIVE', confidence: 0.95 },
      { aspect: 'speaker sound', opinion: 'hollow', sentiment: 'NEGATIVE', confidence: 0.91 },
      { aspect: 'remote control response', opinion: 'frustratingly slow', sentiment: 'NEGATIVE', confidence: 0.94 },
    ],
  },
  {
    id: 3,
    title: 'Ergonomic Mechanical Office Keyboard',
    category: 'Computer Peripherals',
    rating: 5,
    text: 'The mechanical tactile switches offer supreme typing satisfaction, battery longevity easily lasts weeks, and the aluminum build quality is exceptionally solid.',
    triplets: [
      { aspect: 'tactile switches', opinion: 'supreme satisfaction', sentiment: 'POSITIVE', confidence: 0.97 },
      { aspect: 'battery longevity', opinion: 'lasts weeks', sentiment: 'POSITIVE', confidence: 0.95 },
      { aspect: 'aluminum build quality', opinion: 'exceptionally solid', sentiment: 'POSITIVE', confidence: 0.99 },
    ],
  },
];

// Navigation link items
const NAV_LINKS = [
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'features', label: 'Features' },
  { id: 'solutions', label: 'Solutions' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
];

export default function LandingPage() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Active section tracking for navigation underline
  const [activeSection, setActiveSection] = useState<string>('');

  // Enable smooth scrolling on the document while on LandingPage
  useEffect(() => {
    document.documentElement.classList.add('scroll-smooth');
    return () => {
      document.documentElement.classList.remove('scroll-smooth');
    };
  }, []);

  // Track active section as user scrolls
  useEffect(() => {
    const sectionIds = ['how-it-works', 'features', 'solutions', 'pricing', 'faq'];

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const headerOffset = 140;

      // Check if user is near the very bottom of the page
      if (window.innerHeight + scrollY >= document.documentElement.scrollHeight - 60) {
        setActiveSection('faq');
        return;
      }

      let current = '';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop - headerOffset;
          const height = el.offsetHeight;
          if (scrollY >= top && scrollY < top + height) {
            current = id;
            break;
          }
        }
      }

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const navOffset = 70;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
      setActiveSection(id);
    }
  };

  // Interactive Demo State
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);

  // FAQ search state
  const [faqSearch, setFaqSearch] = useState('');

  // Fetch Public FAQs
  const { data: faqsResponse, isLoading: faqsLoading } = useQuery({
    queryKey: ['publicFaqs'],
    queryFn: faqsApi.getPublic,
  });
  const faqs: FaqItem[] = faqsResponse?.data || [];

  // Filter FAQs based on search
  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  // Fetch Active Plans
  const { data: plansResponse, isLoading: plansLoading } = useQuery({
    queryKey: ['publicPlans'],
    queryFn: () => plansApi.getAll(),
  });
  const plans: PlanItem[] = Array.isArray(plansResponse) ? plansResponse : [];

  const activeReview = DEMO_REVIEWS[activeReviewIdx];

  const dashboardTarget = user?.role === 'ADMIN' ? '/admin' : '/dashboard';

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* =========================================================================
          1. HEADER / NAVIGATION BAR
         ========================================================================= */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/85 backdrop-blur-md transition-all">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo / Home Link */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg p-1"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <LineChart size={20} className="stroke-[2.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-slate-950 via-slate-800 to-blue-600 dark:from-white dark:via-slate-200 dark:to-blue-400 bg-clip-text text-transparent">
                InsightRetail
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links with Progressive Smooth Underline */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            {NAV_LINKS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToSection(e, item.id)}
                  className={`relative py-1.5 transition-colors duration-200 group text-sm font-medium ${
                    isActive
                      ? 'text-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                  {/* Progressively animated smooth underline */}
                  <span
                    className={`absolute bottom-0 left-0 h-[2.5px] bg-primary rounded-full transition-all duration-300 ease-out ${
                      isActive
                        ? 'w-full opacity-100'
                        : 'w-0 opacity-0 group-hover:w-1/2 group-hover:opacity-40'
                    }`}
                  />
                </a>
              );
            })}
          </nav>

          {/* Right Header Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <ThemeToggle />

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => navigate(dashboardTarget)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-lg font-medium"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const isAdm = user?.role === 'ADMIN';
                    logout();
                    navigate(isAdm ? '/admin/login' : '/login');
                  }}
                  title="Log out"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  className="font-medium text-muted-foreground hover:text-foreground"
                >
                  Log In
                </Button>
                <Button
                  onClick={() => navigate('/register')}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md shadow-primary/20 rounded-lg"
                >
                  Get Started
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-b border-border bg-card/95 backdrop-blur-md px-4 py-4 space-y-1">
            {NAV_LINKS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    scrollToSection(e, item.id);
                  }}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </a>
              );
            })}
            <div className="pt-3 border-t border-border flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(dashboardTarget);
                    }}
                    className="w-full justify-center"
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Open Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const isAdm = user?.role === 'ADMIN';
                      setMobileMenuOpen(false);
                      logout();
                      navigate(isAdm ? '/admin/login' : '/login');
                    }}
                    className="w-full text-destructive justify-center"
                  >
                    Log Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login');
                    }}
                    className="w-full justify-center"
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/register');
                    }}
                    className="w-full justify-center bg-primary text-primary-foreground font-semibold"
                  >
                    Get Started Free
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. HERO SECTION
         ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-blue-500/10 via-indigo-500/15 to-purple-500/5 blur-3xl pointer-events-none -z-10" />
        <div className="absolute -top-24 right-0 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-semibold tracking-wide shadow-xs animate-fade-in">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span>Next-Gen PyABSA Aspect-Sentiment Triplet Extraction</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
              Turn Messy Customer Feedback Into{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 dark:from-blue-400 dark:via-indigo-300 dark:to-sky-400 bg-clip-text text-transparent">
                Actionable Retail Growth
              </span>
            </h1>

            {/* Supporting Description */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl font-normal leading-relaxed">
              Star ratings only tell you <em>that</em> a customer was unhappy. InsightRetail's deep learning AI pinpoints
              <em> exactly which aspect</em> failed — extracting fine-grained (Aspect, Opinion, Sentiment) triplets
              from thousands of reviews in seconds.
            </p>

            {/* Call To Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              {isAuthenticated ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate(dashboardTarget)}
                    className="w-full sm:w-auto h-12 px-8 text-base font-semibold shadow-lg shadow-blue-500/25 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl"
                  >
                    <LayoutDashboard className="mr-2 h-5 w-5" />
                    Open Your Dashboard
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/dashboard/datasets')}
                    className="w-full sm:w-auto h-12 px-6 text-base font-medium border-border hover:bg-muted rounded-xl"
                  >
                    View Uploaded Datasets
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate('/register')}
                    className="w-full sm:w-auto h-12 px-8 text-base font-semibold shadow-lg shadow-blue-500/25 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl transition-transform hover:-translate-y-0.5"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/login')}
                    className="w-full sm:w-auto h-12 px-6 text-base font-medium border-border hover:bg-muted rounded-xl"
                  >
                    Log In to Account
                  </Button>
                </>
              )}
            </div>

            {/* Quick Metrics / Social Proof */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 border-t border-border/60 w-full max-w-3xl text-center">
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">99.4%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Aspect Precision</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">10x</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Faster Analysis</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">100K+</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">Reviews Processed</p>
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-extrabold text-foreground">Zero</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mt-1">ML Setup Needed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. HOW IT WORKS SECTION
         ========================================================================= */}
      <section id="how-it-works" className="py-20 bg-muted/30 border-y border-border/60 relative scroll-mt-16">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              Simplified 4-Step Pipeline
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              From Raw Customer CSV to High-Impact Decisions
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              No complex machine learning training or code required. Upload your review data and let the pipeline
              deliver executive-ready intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="relative p-6 rounded-2xl bg-card border border-border shadow-xs hover:shadow-md transition-shadow group flex flex-col justify-between h-full">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-lg mb-5 group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Step 01</span>
                <h3 className="text-xl font-bold text-foreground mt-1 mb-2">Upload Review CSV</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Drag and drop your raw customer review CSV containing comments, ratings, and product IDs. Instant schema validation ensures zero errors.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
                <FileSpreadsheet size={15} className="text-blue-500" />
                <span>Supports up to 2,048MB files</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative p-6 rounded-2xl bg-card border border-border shadow-xs hover:shadow-md transition-shadow group flex flex-col justify-between h-full">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg mb-5 group-hover:scale-110 transition-transform">
                  <Brain size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Step 02</span>
                <h3 className="text-xl font-bold text-foreground mt-1 mb-2">PyABSA Triplet AI</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Our PyABSA worker isolates subtle nuances, extracting aspect targets, descriptor opinions, and exact sentiment polarity scores.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
                <Zap size={15} className="text-indigo-500" />
                <span>Deep neural triplet parsing</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative p-6 rounded-2xl bg-card border border-border shadow-xs hover:shadow-md transition-shadow group flex flex-col justify-between h-full">
              <div>
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-lg mb-5 group-hover:scale-110 transition-transform">
                  <BarChart3 size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Step 03</span>
                <h3 className="text-xl font-bold text-foreground mt-1 mb-2">Interactive Reports</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Explore dynamic KPI scorecards, stacked aspect performance charts, word clouds, and sentiment breakdowns across your catalog.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
                <PieChart size={15} className="text-sky-500" />
                <span>Real-time charts & filters</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative p-6 rounded-2xl bg-card border border-border shadow-xs hover:shadow-md transition-shadow group flex flex-col justify-between h-full">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg mb-5 group-hover:scale-110 transition-transform">
                  <TrendingUp size={24} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Step 04</span>
                <h3 className="text-xl font-bold text-foreground mt-1 mb-2">Take Strategic Action</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Leverage the Product Action Matrix to prioritize urgent defect fixes, benchmark top performers, and export executive PDF summaries.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
                <Award size={15} className="text-emerald-500" />
                <span>Export PDF & CSV reports</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. KEY FEATURES SECTION
         ========================================================================= */}
      <section id="features" className="py-24 relative overflow-hidden scroll-mt-16">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              Platform Capabilities
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Engineered for Complete Customer Sentiment Mastery
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Explore the 7 foundational capabilities that make InsightRetail the premier choice for modern e-commerce and retail product intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Aspect Sentiment Triplet Extraction (PyABSA) */}
            <div className="p-7 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Brain size={24} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Aspect Sentiment Triplet Extraction
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Powered by PyABSA. Deconstructs complex sentences into structured (Aspect, Opinion, Sentiment) triplets. Understand that "great display but fragile hinge" represents two opposite sentiments.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Sub-sentence Granularity</span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Feature 2: Executive Overview (KPI scorecards) */}
            <div className="p-7 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <LayoutDashboard size={24} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Executive Overview KPI Scorecards
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Real-time high-level metric cards: Total review volume, net aspect sentiment index, positive/neutral/negative balance, and automated critical defect alarms.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span>C-Suite Ready Metrics</span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Feature 3: Sentiment Breakdown Chart */}
            <div className="p-7 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <PieChart size={24} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Multi-Dimensional Sentiment Breakdown
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Interactive donut and distribution visualizations showing aggregated sentiment proportions across datasets, with instant slice drilldowns.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Proportional Polarity Views</span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Feature 4: Aspect Performance (Stacked Bar) */}
            <div className="p-7 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Layers size={24} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Aspect Performance Stacked Bars
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Compare aspect sentiment side-by-side. Isolate whether "Battery Life", "Customer Support", "Software", or "Price" drives customer complaints.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                <span>Facet-Level Benchmarking</span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Feature 5: Product Action Matrix */}
            <div className="p-7 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Grid size={24} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Product Action Matrix (2x2)
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Prioritize products at a glance: Quadrant mapping instantly classifies SKUs into "Star Products", "Fix Urgently", "High Potential", and "Deprecate".
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
                <span>Operational Prioritization</span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Feature 6: Interactive Word Cloud */}
            <div className="p-7 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all group flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Cloud size={24} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">
                  Interactive Keyword Word Cloud
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Discover the authentic voice of your customers. High-frequency positive praises and urgent negative friction terms rendered dynamically with D3.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                <span>Dynamic Frequency Rendering</span>
                <ChevronRight size={16} />
              </div>
            </div>

            {/* Feature 7: Deep-Dive Filters & Triplet Table (Spans full width on large screens or 3rd column) */}
            <div className="p-7 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/50 transition-all group flex flex-col justify-between md:col-span-2 lg:col-span-3">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                    <Filter size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Deep-Dive Filters & Triplet Inspection Table
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Filter by exact aspect keyword, sentiment polarity, product identifier, or star rating range. Inspect raw customer excerpts alongside model confidence, and export complete reports to PDF and CSV formats.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="px-3 py-1 bg-muted text-xs">
                    Rating Slicing (1★ - 5★)
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1 bg-muted text-xs">
                    Aspect Keyword Search
                  </Badge>
                  <Badge variant="outline" className="px-3 py-1 bg-muted text-xs">
                    Export to PDF / CSV
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. BENEFITS / TARGET AUDIENCE SECTION
         ========================================================================= */}
      <section id="solutions" className="py-20 bg-muted/30 border-y border-border/60 scroll-mt-16">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              Built For Modern Retail
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Who Benefits from InsightRetail?
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Tailored tools and analytics designed to empower every tier of your retail and e-commerce operation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <ShoppingBag size={20} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Retail & Category Managers</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Identify which products cause high return rates, spot declining sentiment before revenue drops, and optimize merchandise selection.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                <Target size={20} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Product & Quality Teams</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Catch hardware malfunctions, recurring firmware bugs, or packaging flaws immediately by tracking aspect sentiment across production batches.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <Users size={20} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Customer Experience Leads</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Understand the emotional drivers behind support tickets. Train care teams to address the specific friction points customers complain about.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                <TrendingUp size={20} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Marketing & Brand Strategists</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Leverage top-rated aspects in promotional campaigns. Use authentic customer terminology in high-converting ad copy and product descriptions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. PRICING OVERVIEW SECTION
         ========================================================================= */}
      <section id="pricing" className="py-24 relative overflow-hidden scroll-mt-16">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              Flexible Subscriptions
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Transparent Plans for Teams of All Sizes
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Start with generous dataset quotas and upgrade as your customer review volume scales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plansLoading ? (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                Loading available subscription tiers...
              </div>
            ) : plans.length > 0 ? (
              plans.map((plan, idx) => {
                const isPopular = idx === 1 || plan.name.toLowerCase().includes('gold');
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border p-7 flex flex-col justify-between transition-all relative bg-card ${
                      isPopular
                        ? 'border-primary ring-2 ring-primary/20 shadow-xl'
                        : 'border-border shadow-xs hover:shadow-md'
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-sm">
                        Most Popular
                      </span>
                    )}

                    <div>
                      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Full access to PyABSA analysis pipeline
                      </p>

                      <div className="mt-5 flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold tracking-tight text-foreground">
                          ${parseFloat(plan.price).toFixed(2)}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">
                          / {plan.durationDays || 30} days
                        </span>
                      </div>

                      <div className="mt-6 pt-6 border-t border-border space-y-3">
                        <div className="flex items-center gap-2.5 text-sm text-foreground">
                          <HardDrive className="h-4 w-4 text-primary shrink-0" />
                          <span>
                            <strong>{plan.maxStorageMb} MB</strong> Review Storage Quota
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm text-foreground">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>Full PyABSA Triplet Extraction</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm text-foreground">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>Interactive Charts & Matrix</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm text-foreground">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>Executive PDF & CSV Exports</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm text-foreground">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>Priority Analysis Queue</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-4">
                      {isAuthenticated ? (
                        <Button
                          onClick={() => navigate('/dashboard/subscriptions')}
                          className={`w-full font-semibold rounded-xl h-11 ${
                            isPopular ? 'bg-primary text-primary-foreground' : ''
                          }`}
                          variant={isPopular ? 'default' : 'outline'}
                        >
                          Manage Subscription
                        </Button>
                      ) : (
                        <Button
                          onClick={() => navigate('/register')}
                          className={`w-full font-semibold rounded-xl h-11 ${
                            isPopular ? 'bg-primary text-primary-foreground' : ''
                          }`}
                          variant={isPopular ? 'default' : 'outline'}
                        >
                          Select Plan
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              // Fallback plan cards if server returns empty
              <>
                <div className="rounded-2xl border border-border p-7 flex flex-col justify-between bg-card shadow-xs">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Starter Tier</h3>
                    <p className="text-xs text-muted-foreground mt-1">For single-store managers</p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">$19.99</span>
                      <span className="text-sm font-medium text-muted-foreground">/ month</span>
                    </div>
                    <div className="mt-6 pt-6 border-t border-border space-y-3 text-sm">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>512 MB Storage Quota</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>PyABSA Triplet Parsing</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Executive Reports</span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/register')} className="mt-8 w-full" variant="outline">
                    Get Started
                  </Button>
                </div>

                <div className="rounded-2xl border-primary ring-2 ring-primary/20 p-7 flex flex-col justify-between bg-card shadow-xl relative">
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider">
                    Recommended
                  </span>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Silver Tier</h3>
                    <p className="text-xs text-muted-foreground mt-1">For growing retail brands</p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">$29.99</span>
                      <span className="text-sm font-medium text-muted-foreground">/ month</span>
                    </div>
                    <div className="mt-6 pt-6 border-t border-border space-y-3 text-sm">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>1,024 MB Storage Quota</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Full Triplet Extraction</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Product Action Matrix</span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/register')} className="mt-8 w-full bg-primary text-primary-foreground">
                    Get Started
                  </Button>
                </div>

                <div className="rounded-2xl border border-border p-7 flex flex-col justify-between bg-card shadow-xs">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">Gold Tier</h3>
                    <p className="text-xs text-muted-foreground mt-1">For enterprise catalogs</p>
                    <div className="mt-5 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-foreground">$39.99</span>
                      <span className="text-sm font-medium text-muted-foreground">/ month</span>
                    </div>
                    <div className="mt-6 pt-6 border-t border-border space-y-3 text-sm">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>2,048 MB Storage Quota</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Priority Queue Processing</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span>Unlimited PDF Export</span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => navigate('/register')} className="mt-8 w-full" variant="outline">
                    Get Started
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. FAQ SECTION
         ========================================================================= */}
      <section id="faq" className="py-20 bg-muted/30 border-y border-border/60 scroll-mt-16">
        <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-12">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              Frequently Asked Questions
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Got Questions? We Have Answers.
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Explore common questions regarding dataset formats, PyABSA analysis speed, and quotas.
            </p>

            {/* Real-time search filter */}
            <div className="pt-4 max-w-md mx-auto relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search questions or keywords..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="pl-10 h-11 bg-card rounded-xl border-border"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 sm:p-8 shadow-xs">
            {faqsLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Loading questions from support database...</p>
              </div>
            ) : filteredFaqs.length > 0 ? (
              <Accordion type="single" collapsible className="w-full">
                {filteredFaqs.map((faq) => (
                  <AccordionItem
                    key={faq.id || faq.faqId}
                    value={`faq-${faq.id || faq.faqId}`}
                    className="border-b border-border/70 last:border-0 px-2"
                  >
                    <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary transition-colors text-base sm:text-lg py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed text-sm sm:text-base pb-6 pr-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-12 text-muted-foreground space-y-3">
                <HelpCircle className="h-10 w-10 text-muted-foreground/50 mx-auto" />
                <p className="text-base font-medium">No questions matched "{faqSearch}"</p>
                <Button variant="link" onClick={() => setFaqSearch('')} className="text-primary">
                  Clear search query
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. CALL TO ACTION STRIP
         ========================================================================= */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
            Ready to Uncover What Your Customers Truly Think?
          </h2>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            Join forward-thinking retail managers and product teams. Upload your first customer review dataset today.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isAuthenticated ? (
              <Button
                size="lg"
                onClick={() => navigate(dashboardTarget)}
                className="h-12 px-8 bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl shadow-lg"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => navigate('/register')}
                className="h-12 px-8 bg-white text-blue-600 hover:bg-blue-50 font-bold rounded-xl shadow-lg"
              >
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. FOOTER
         ========================================================================= */}
      <footer className="border-t border-border bg-card/60 pt-16 pb-12">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-border">
            {/* Col 1: Brand */}
            <div className="space-y-4 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 text-primary font-bold text-lg">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
                  <LineChart size={18} />
                </div>
                <span className="font-extrabold tracking-tight text-foreground">InsightRetail</span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Aspect Sentiment Triplet Extraction platform transforming unstructured customer reviews into strategic retail growth.
              </p>
            </div>

            {/* Col 2: Navigation */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">Navigation</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {NAV_LINKS.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      onClick={(e) => scrollToSection(e, item.id)}
                      className="hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Account & Access */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">Access</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {isAuthenticated ? (
                  <>
                    <li>
                      <Link to={dashboardTarget} className="hover:text-foreground transition-colors">
                        Dashboard Overview
                      </Link>
                    </li>
                    <li>
                      <button
                        onClick={() => {
                          const isAdm = user?.role === 'ADMIN';
                          logout();
                          navigate(isAdm ? '/admin/login' : '/login');
                        }}
                        className="hover:text-destructive transition-colors text-left"
                      >
                        Sign Out
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link to="/login" className="hover:text-foreground transition-colors">
                        Sign In (Retail Manager)
                      </Link>
                    </li>
                    <li>
                      <Link to="/register" className="hover:text-foreground transition-colors">
                        Create Account
                      </Link>
                    </li>
                    <li className="pt-1.5 border-t border-border/40">
                      <Link to="/admin/login" className="text-xs text-muted-foreground/80 hover:text-foreground transition-colors flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-muted-foreground" />
                        Admin Portal
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Col 4: Contact & Support */}
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground">Contact & Support</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Have questions or need enterprise dataset capacity? Reach out to our technical team:
              </p>
              <p className="text-xs font-medium text-foreground">support@insightretail.ai</p>
              <div className="pt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <Link
                  to="/terms?tab=terms"
                  onClick={() => window.scrollTo(0, 0)}
                  className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  Terms of Service
                </Link>
                <span>•</span>
                <Link
                  to="/terms?tab=privacy"
                  onClick={() => window.scrollTo(0, 0)}
                  className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
            <p>© {new Date().getFullYear()} InsightRetail Feedback Analysis System. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              <span>Aspect-Opinion-Sentiment Deep Learning</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
