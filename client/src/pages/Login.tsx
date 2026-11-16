import React, { useState, useEffect } from 'react';
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
  EyeOff,
  KeyRound,
  Mail,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '../components/ThemeToggle';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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

  // Forgot Password modal states
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotShowConfirmPassword, setForgotShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isForgotOpen && forgotStep === 2 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isForgotOpen, forgotStep, countdown]);

  const openForgotPassword = () => {
    setForgotEmail(email.trim());
    setForgotCode('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotStep(1);
    setCountdown(0);
    setIsForgotOpen(true);
  };

  const handleRequestCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setForgotLoading(true);
    try {
      await authApi.forgotPasswordRequestCode(forgotEmail.trim());
      toast.success('If an account exists, a 6-digit verification code has been sent');
      setForgotStep(2);
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0 || resendLoading) return;
    setResendLoading(true);
    try {
      await authApi.forgotPasswordRequestCode(forgotEmail.trim());
      toast.success('A new verification code has been sent');
      setCountdown(60);
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend code');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = forgotCode.trim();
    if (cleanCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await authApi.forgotPasswordVerifyCode(forgotEmail.trim(), cleanCode);
      setResetToken(res.resetToken);
      toast.success('Code confirmed! Set your new password.');
      setForgotStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotNewPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setForgotLoading(true);
    try {
      await authApi.forgotPasswordReset({
        resetToken,
        newPassword: forgotNewPassword,
        confirmPassword: forgotConfirmPassword,
      });
      toast.success('Password has been reset successfully! You can now sign in.');
      setEmail(forgotEmail);
      setPassword('');
      setIsForgotOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setForgotLoading(false);
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
                <button
                  type="button"
                  onClick={openForgotPassword}
                  className="text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
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

      {/* Forgot Password Multi-Step Dialog */}
      <Dialog open={isForgotOpen} onOpenChange={setIsForgotOpen}>
        <DialogContent className="sm:max-w-[440px] p-6">
          <DialogHeader className="space-y-2">
            {/* Step progress pills */}
            <div className="flex items-center justify-center gap-2 pb-2">
              <span
                className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${
                  forgotStep === 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-primary/20 text-primary'
                }`}
              >
                1
              </span>
              <span className={`h-0.5 w-8 rounded-full ${forgotStep > 1 ? 'bg-primary' : 'bg-muted'}`} />
              <span
                className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${
                  forgotStep === 2
                    ? 'bg-primary text-primary-foreground'
                    : forgotStep > 2
                    ? 'bg-primary/20 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                2
              </span>
              <span className={`h-0.5 w-8 rounded-full ${forgotStep > 2 ? 'bg-primary' : 'bg-muted'}`} />
              <span
                className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-semibold ${
                  forgotStep === 3
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                3
              </span>
            </div>

            {forgotStep === 1 && (
              <>
                <div className="mx-auto h-12 w-12 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
                  <Mail className="h-6 w-6" />
                </div>
                <DialogTitle className="text-center text-xl font-bold">Forgot Password</DialogTitle>
                <DialogDescription className="text-center text-sm text-muted-foreground">
                  Enter your registered retail manager email. We'll send a 6-digit verification code.
                </DialogDescription>
              </>
            )}

            {forgotStep === 2 && (
              <>
                <div className="mx-auto h-12 w-12 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-1">
                  <KeyRound className="h-6 w-6" />
                </div>
                <DialogTitle className="text-center text-xl font-bold">Enter Verification Code</DialogTitle>
                <DialogDescription className="text-center text-sm text-muted-foreground">
                  We sent a 6-digit code to <strong className="text-foreground">{forgotEmail}</strong>. Enter it below to proceed.
                </DialogDescription>
              </>
            )}

            {forgotStep === 3 && (
              <>
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-1">
                  <Lock className="h-6 w-6" />
                </div>
                <DialogTitle className="text-center text-xl font-bold">Reset Password</DialogTitle>
                <DialogDescription className="text-center text-sm text-muted-foreground">
                  Create a new secure password with at least 8 characters.
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          {/* Step 1: Email Form */}
          {forgotStep === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Account Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  placeholder="manager@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  autoFocus
                  className="h-10"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsForgotOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={forgotLoading} className="flex-1">
                  {forgotLoading ? 'Sending...' : 'Send Code'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 2: 6-Digit Code Form */}
          {forgotStep === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="forgot-code">6-Digit Verification Code</Label>
                <Input
                  id="forgot-code"
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={forgotCode}
                  onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  className="h-12 text-center text-2xl tracking-[0.4em] font-mono font-bold"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Code expires in 15 mins</span>
                  {countdown > 0 ? (
                    <span>Resend in {countdown}s</span>
                  ) : (
                    <button
                      type="button"
                      disabled={resendLoading}
                      onClick={handleResendCode}
                      className="text-primary hover:underline font-medium cursor-pointer"
                    >
                      {resendLoading ? 'Sending...' : 'Resend code'}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setForgotStep(1)}
                  className="flex-1"
                >
                  Change Email
                </Button>
                <Button
                  type="submit"
                  disabled={forgotLoading || forgotCode.trim().length !== 6}
                  className="flex-1"
                >
                  {forgotLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: New Password Form */}
          {forgotStep === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="forgot-new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="forgot-new-password"
                    type={forgotShowPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    autoFocus
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setForgotShowPassword(!forgotShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={forgotShowPassword ? 'Hide password' : 'Show password'}
                  >
                    {forgotShowPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="forgot-confirm-password"
                    type={forgotShowConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Re-enter new password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="h-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setForgotShowConfirmPassword(!forgotShowConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={forgotShowConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {forgotShowConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Password criteria checklist */}
              <div className="text-xs space-y-1 bg-muted/50 p-2.5 rounded-lg border border-border/50">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={14}
                    className={
                      forgotNewPassword.length >= 8
                        ? 'text-emerald-500'
                        : 'text-muted-foreground/50'
                    }
                  />
                  <span className={forgotNewPassword.length >= 8 ? 'text-foreground' : 'text-muted-foreground'}>
                    Minimum 8 characters
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2
                    size={14}
                    className={
                      forgotNewPassword && forgotNewPassword === forgotConfirmPassword
                        ? 'text-emerald-500'
                        : 'text-muted-foreground/50'
                    }
                  />
                  <span
                    className={
                      forgotNewPassword && forgotNewPassword === forgotConfirmPassword
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    }
                  >
                    Passwords match
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsForgotOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    forgotLoading ||
                    forgotNewPassword.length < 8 ||
                    forgotNewPassword !== forgotConfirmPassword
                  }
                  className="flex-1"
                >
                  {forgotLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
