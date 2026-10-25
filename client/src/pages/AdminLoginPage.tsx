import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  LineChart, 
  AlertCircle, 
  ArrowLeft,
  Clock,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const LOCKOUT_STORAGE_KEY = 'admin_lockout_until';
const TOTAL_LOCKOUT_SECONDS = 15 * 60; // 15 minutes default

function formatSeconds(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Lockout state
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const stored = localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (parsed > Date.now()) {
        return parsed;
      }
      localStorage.removeItem(LOCKOUT_STORAGE_KEY);
    }
    return null;
  });

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (lockoutUntil && lockoutUntil > Date.now()) {
      return Math.ceil((lockoutUntil - Date.now()) / 1000);
    }
    return 0;
  });

  const isLockedOut = remainingSeconds > 0;
  const navigate = useNavigate();
  const { login } = useAuth();

  // 1. Initial lockout status check from server (synchronizes if server IP is already locked)
  useEffect(() => {
    let isMounted = true;
    const checkServerStatus = async () => {
      try {
        const status = await authApi.getAdminLockoutStatus(email);
        if (!isMounted) return;

        if (status.isLocked && status.remainingSeconds > 0) {
          const until = Date.now() + status.remainingSeconds * 1000;
          setLockoutUntil(until);
          setRemainingSeconds(status.remainingSeconds);
          localStorage.setItem(LOCKOUT_STORAGE_KEY, until.toString());
        } else if (status.remainingAttempts !== undefined) {
          setRemainingAttempts(status.remainingAttempts);
        }
      } catch (e) {
        // Silent catch for background check
      }
    };

    checkServerStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-time countdown timer effect
  useEffect(() => {
    if (!lockoutUntil) {
      setRemainingSeconds(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      if (lockoutUntil > now) {
        const secs = Math.ceil((lockoutUntil - now) / 1000);
        setRemainingSeconds(secs);
      } else {
        // Lockout expired!
        setLockoutUntil(null);
        setRemainingSeconds(0);
        setRemainingAttempts(null);
        setErrorMessage(null);
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
        toast.success('Lockout period has expired. You may now attempt to sign in again.');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: Prevent request dispatch if locked out
    if (isLockedOut) {
      toast.error(`Sign in disabled. Please wait ${formatSeconds(remainingSeconds)} for the lockout to lift.`);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await authApi.adminLogin({ email, password });
      
      // Clear lockout state on success
      localStorage.removeItem(LOCKOUT_STORAGE_KEY);
      setLockoutUntil(null);
      setRemainingSeconds(0);
      setRemainingAttempts(null);

      login(data.user, data.token);
      toast.success('Admin authentication successful. Welcome back!');
      navigate('/admin');
    } catch (err: any) {
      const msg = err.message || 'Administrator authentication failed';
      setErrorMessage(msg);

      // Check if server indicated lockout
      if (err.code === 'ACCOUNT_LOCKED' || err.status === 429 || err.details?.code === 'ACCOUNT_LOCKED') {
        const secs = err.details?.remainingSeconds || TOTAL_LOCKOUT_SECONDS;
        const until = Date.now() + secs * 1000;
        setLockoutUntil(until);
        setRemainingSeconds(secs);
        setRemainingAttempts(0);
        localStorage.setItem(LOCKOUT_STORAGE_KEY, until.toString());
        toast.error(`Admin portal locked due to failed attempts. Retry disabled for ${formatSeconds(secs)}.`);
      } else if (err.details?.remainingAttempts !== undefined) {
        setRemainingAttempts(err.details.remainingAttempts);
        toast.error(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate elapsed progress for lockout progress bar
  const progressPercent = isLockedOut
    ? Math.max(0, Math.min(100, Math.round(((TOTAL_LOCKOUT_SECONDS - remainingSeconds) / TOTAL_LOCKOUT_SECONDS) * 100)))
    : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#030712] text-white px-4 py-8 relative overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-indigo-600/15 blur-[130px] rounded-full pointer-events-none" />

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-6 z-10">
        <Link to="/" className="flex items-center gap-2 group mb-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <LineChart size={18} />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-white">
            InsightRetail
          </span>
        </Link>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          <ShieldAlert size={12} className="text-indigo-400" />
          <span>System Administration Portal</span>
        </div>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md shadow-2xl border border-white/10 bg-[#0d1527]/95 backdrop-blur-xl z-10 text-white">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="flex justify-center">
            <div className={`p-3.5 rounded-2xl border shadow-inner transition-colors ${
              isLockedOut
                ? 'bg-red-950/80 text-red-400 border-red-700/50'
                : 'bg-indigo-950/80 text-indigo-400 border-indigo-500/30'
            }`}>
              {isLockedOut ? <Lock size={26} className="animate-pulse" /> : <Lock size={26} />}
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight text-white">Admin Sign In</CardTitle>
            <CardDescription className="text-white/60 text-sm">
              Authorized personnel only. Enter administrator credentials.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Active Lockout Banner with Real-time Countdown */}
          {isLockedOut ? (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-sm space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-red-100">
                  <ShieldAlert size={18} className="text-red-400 shrink-0" />
                  <span>Security Lockout Active</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-900/80 border border-red-700 text-red-100 font-mono text-xs font-bold tracking-wider">
                  <Clock size={12} className="animate-spin text-red-300" />
                  <span>{formatSeconds(remainingSeconds)}</span>
                </div>
              </div>

              <p className="text-xs text-red-300/90 leading-relaxed">
                5 consecutive failed login attempts detected. To safeguard system governance and prevent automated traffic attacks, form submission and server requests are temporarily blocked.
              </p>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="w-full bg-red-950 rounded-full h-1.5 overflow-hidden border border-red-800/50">
                  <div
                    className="bg-red-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-red-400/80 font-mono">
                  <span>Lockout in progress</span>
                  <span>Unlocks in {formatSeconds(remainingSeconds)}</span>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Pre-lockout Warning: Inform admin of remaining attempts before lockout */}
              {remainingAttempts !== null && remainingAttempts > 0 && remainingAttempts <= 3 && (
                <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs flex items-center gap-2.5">
                  <AlertTriangle size={16} className="text-amber-400 shrink-0" />
                  <div className="leading-snug">
                    <span className="font-semibold text-amber-100">Security Warning: </span>
                    {remainingAttempts} attempt{remainingAttempts > 1 ? 's' : ''} remaining before a 15-minute account lockout is enforced.
                  </div>
                </div>
              )}

              {/* Standard Error Message */}
              {errorMessage && (
                <div className="p-3.5 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-sm flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="leading-snug">{errorMessage}</div>
                </div>
              )}
            </>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/70" htmlFor="admin-email">
                Admin Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <Input
                  id="admin-email"
                  type="email"
                  required
                  disabled={isLockedOut || isLoading}
                  placeholder="admin@insightretail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-9 bg-black/40 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-indigo-500 focus-visible:border-indigo-500/60 transition-opacity ${
                    isLockedOut ? 'opacity-50 cursor-not-allowed bg-black/60 border-white/10' : ''
                  }`}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-white/70" htmlFor="admin-password">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                <Input
                  id="admin-password"
                  type="password"
                  required
                  disabled={isLockedOut || isLoading}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-9 bg-black/40 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-indigo-500 focus-visible:border-indigo-500/60 transition-opacity ${
                    isLockedOut ? 'opacity-50 cursor-not-allowed bg-black/60 border-white/10' : ''
                  }`}
                />
              </div>
            </div>

            {/* Submit Button with Disabled State and Live Countdown */}
            <Button
              type="submit"
              disabled={isLockedOut || isLoading}
              className={`w-full font-semibold transition-all duration-150 h-10 mt-2 ${
                isLockedOut
                  ? 'bg-white/5 border border-red-900/50 text-red-300 cursor-not-allowed hover:bg-white/5'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
              }`}
            >
              {isLockedOut ? (
                <span className="flex items-center justify-center gap-2 font-mono text-xs text-red-300">
                  <Lock size={14} className="text-red-400" />
                  <span>SIGN IN LOCKED ({formatSeconds(remainingSeconds)})</span>
                </span>
              ) : isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying Credentials...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  Sign In to Admin Console
                  <ArrowRight size={16} />
                </span>
              )}
            </Button>
          </form>

          {/* Security Notice Box */}
          <div className="mt-4 p-3.5 rounded-xl bg-black/40 border border-white/10 text-white/60 text-xs leading-relaxed space-y-1">
            <div className="flex items-center gap-1.5 text-white/80 font-semibold">
              <ShieldCheck size={13} className="text-indigo-400" />
              <span>Access & Security Policy</span>
            </div>
            <p>
              This portal is restricted to system administrators. Failed attempts trigger account lockout and security telemetry.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-0 pb-6 border-t border-white/10 mt-2 pt-4">
          <Link
            to="/login"
            className="text-xs text-white/60 hover:text-indigo-300 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft size={13} />
            <span>Not an admin? Return to Retail Manager Login</span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
