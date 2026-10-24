import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { 
  LineChart, 
  ArrowLeft, 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  BarChart2, 
  MessageSquareHeart, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data = await authApi.login({ email, password });
      login(data.user, data.token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Failed to login';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-background text-foreground transition-colors duration-200">
      {/* Left Section: Login Form */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 xl:p-16 min-h-screen">
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
          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Retail Manager Sign In
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your store feedback analytics
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="manager@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base font-medium shadow-sm transition-all"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-primary hover:underline transition-all"
              >
                Register here
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
              Next-Gen Customer Analytics
            </div>
            <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Turn unstructured feedback into customer loyalty.
            </h2>
            <p className="text-white/70 text-base leading-relaxed">
              Analyze thousands of product reviews, branch feedback, and surveys in real-time with state-of-the-art aspect sentiment modeling.
            </p>
          </div>

          {/* Interactive Metric Preview Card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-white/60">
                  Satisfaction Index
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-white">94.8%</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <TrendingUp size={12} /> +12.4%
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
                <BarChart2 size={24} />
              </div>
            </div>

            {/* Sentiment Breakdown Bars */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/70 font-medium">
                <span>Sentiment Distribution</span>
                <span>12,840 Reviews</span>
              </div>
              <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500" style={{ width: '74%' }} title="Positive: 74%" />
                <div className="h-full bg-amber-400" style={{ width: '18%' }} title="Neutral: 18%" />
                <div className="h-full bg-rose-500" style={{ width: '8%' }} title="Negative: 8%" />
              </div>
              <div className="flex items-center gap-4 text-xs pt-1 text-white/70">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> 74% Positive
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> 18% Neutral
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" /> 8% Negative
                </span>
              </div>
            </div>

            {/* Recent AI Insight Snippet */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                <MessageSquareHeart size={16} />
              </div>
              <div className="text-xs space-y-1">
                <span className="font-semibold text-white block">
                  AI Trend Detection
                </span>
                <p className="text-white/70 leading-relaxed">
                  In-store customer checkout ratings rose significantly this week across all flagship stores.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Footer Badges */}
        <div className="relative z-10 flex items-center gap-6 pt-6 border-t border-white/10 text-xs text-white/60">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-blue-400" />
            <span>Enterprise Encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-400" />
            <span>99.4% Aspect Accuracy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
