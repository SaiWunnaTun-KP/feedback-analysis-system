import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { authApi } from '../services/api';
import { 
  LineChart, 
  ArrowLeft, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  UploadCloud, 
  Cpu, 
  FileText, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from 'sonner';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    companyName: '',
    companyEmail: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await authApi.register(formData);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to register');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground transition-colors duration-200">
      {/* Left Section: Register Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 min-h-screen">
        {/* Top Navigation Bar in Form Area */}
        <div className="flex items-center justify-between w-full">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          <ThemeToggle />
        </div>

        {/* Center: Form Container */}
        <div className="my-auto py-8 w-full max-w-md mx-auto">
          <div className="space-y-2 mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Create an account
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign up as a Retail Manager to start analyzing customer sentiment
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="username">Full Name</Label>
              <Input
                id="username"
                type="text"
                required
                autoComplete="name"
                placeholder="John Doe"
                value={formData.username}
                onChange={handleChange}
                className="h-10"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={formData.password}
                  onChange={handleChange}
                  className="h-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  type="text"
                  required
                  placeholder="Acme Retail"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="companyEmail">Company Email</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  required
                  placeholder="info@acme.com"
                  value={formData.companyEmail}
                  onChange={handleChange}
                  className="h-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium shadow-sm transition-all mt-3"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-primary hover:underline transition-all"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom subtle note */}
        <div className="text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} InsightRetail. Customer Intelligence Platform.
        </div>
      </div>

      {/* Right Section: Visual Showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#030712] text-white flex-col justify-between p-12 xl:p-16 border-l border-white/10">
        {/* Ambient Gradient Background Glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
            <LineChart size={22} />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-white block">
              InsightRetail
            </span>
            <span className="text-xs text-white/60 font-medium">
              Sentiment Intelligence
            </span>
          </div>
        </div>

        {/* Center Visual Cards */}
        <div className="relative z-10 space-y-6 my-auto py-8 max-w-lg">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
              <Sparkles size={14} />
              Fast Retail Manager Onboarding
            </div>
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Unlock actionable sentiment insights in 3 simple steps.
            </h2>
            <p className="text-white/70 text-base leading-relaxed">
              Connect your customer feedback streams and let our fine-tuned NLP pipelines deliver instant clarity.
            </p>
          </div>

          {/* Workflow Interactive Step Cards */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 font-bold text-sm border border-blue-500/30">
                <UploadCloud size={18} />
              </div>
              <div className="text-sm">
                <h3 className="font-semibold text-white">1. Upload Datasets</h3>
                <p className="text-xs text-white/60 mt-0.5">Drag-and-drop CSV reviews or stream directly via secure API endpoints.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0 font-bold text-sm border border-indigo-500/30">
                <Cpu size={18} />
              </div>
              <div className="text-sm">
                <h3 className="font-semibold text-white">2. Automated Sentiment Analysis</h3>
                <p className="text-xs text-white/60 mt-0.5">Categorize positive, neutral, and negative sentiment with aspect-based scoring.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 pt-3 border-t border-white/10">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0 font-bold text-sm border border-emerald-500/30">
                <FileText size={18} />
              </div>
              <div className="text-sm">
                <h3 className="font-semibold text-white">3. Executive Intelligence Reports</h3>
                <p className="text-xs text-white/60 mt-0.5">Export presentation-ready PDF summaries and track store performance trends.</p>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-center">
              <span className="text-xl font-bold text-white block">2.4M+</span>
              <span className="text-[11px] text-white/60">Reviews Parsed</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-center">
              <span className="text-xl font-bold text-emerald-400 block">99.4%</span>
              <span className="text-[11px] text-white/60">Model Accuracy</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-center">
              <span className="text-xl font-bold text-blue-400 block">&lt; 3s</span>
              <span className="text-[11px] text-white/60">Response Time</span>
            </div>
          </div>
        </div>

        {/* Visual Footer Badges */}
        <div className="relative z-10 flex items-center gap-6 pt-6 border-t border-white/10 text-xs text-white/60">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>Instant Setup</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-400" />
            <span>GDPR & CCPA Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
