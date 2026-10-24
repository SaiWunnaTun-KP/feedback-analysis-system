import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { User, Lock, Moon, Sun, Monitor, Trash2, Key, LogOut } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { profileApi } from '../../services/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from 'react-router';

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Profile Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Preferences State
  const { theme = 'system', setTheme } = useTheme();

  // Modals state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Password Flow State
  const [pwdStep, setPwdStep] = useState(1);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdCode, setPwdCode] = useState('');
  const [pwdToken, setPwdToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Delete flow state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsProfileLoading(true);
    try {
      const data = await profileApi.get();
      setName(data.username || '');
      setEmail(data.email || '');
      setCompanyName(data.companyName || '');
      setCompanyEmail(data.companyEmail || '');
    } catch (err: any) {
      toast.error(err.message || 'Failed to load profile');
    } finally {
      setIsProfileLoading(false);
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      await profileApi.update({ username: name, companyName });
      toast.success('Profile updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    const label = value === 'system' ? 'System default' : value === 'dark' ? 'Dark Mode' : 'Light Mode';
    toast.success(`Theme set to ${label}`);
  };

  // Password Flow
  const handleRequestCode = async () => {
    setPwdLoading(true);
    try {
      await profileApi.requestCode();
      toast.success('Verification code sent to your email.');
      setPwdStep(2);
    } catch (err: any) {
      toast.error(err.message || 'Failed to request code');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdLoading(true);
    try {
      const data = await profileApi.verifyCode(pwdCode);
      setPwdToken(data.resetToken);
      toast.success('Code verified. Set your new password.');
      setPwdStep(3);
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired code');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPwdLoading(true);
    try {
      await profileApi.resetPassword({ resetToken: pwdToken, newPassword, confirmPassword });
      toast.success('Password updated successfully!');
      setIsPasswordModalOpen(false);
      setPwdStep(1);
      setPwdCode('');
      setPwdToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setPwdLoading(false);
    }
  };

  // Delete Flow
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }
    setDeleteLoading(true);
    try {
      await profileApi.deleteAccount({ confirmation: deleteConfirmation, password: deletePassword });
      toast.success('Account deleted successfully');
      setIsDeleteModalOpen(false);
      logout();
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and security.</p>
      </div>

      <div className="space-y-6">
        
        {/* Profile Settings */}
        <Card className="shadow-xs border-border bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Profile Settings
            </CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <form onSubmit={handleProfileSave}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" value={email} disabled className="bg-muted text-muted-foreground border-input" />
                <p className="text-xs text-muted-foreground">Your email address cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="Enter your full name" disabled={isProfileLoading} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">Company Email</Label>
                <Input id="companyEmail" type="email" value={companyEmail} disabled className="bg-muted text-muted-foreground border-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Acme Electronics" disabled={isProfileLoading} />
              </div>
            </CardContent>
            <CardFooter className="border-t border-border mt-4 pt-4 flex justify-end">
              <Button type="submit" disabled={isProfileLoading || isSavingProfile}>
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Preferences */}
        <Card className="shadow-xs border-border bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              Preferences
            </CardTitle>
            <CardDescription>Customize the appearance and theme of your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label className="text-sm font-medium">Appearance Theme</Label>
              <RadioGroup value={theme} onValueChange={handleThemeChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`flex items-center justify-between space-x-2 border rounded-xl p-4 cursor-pointer transition-all duration-150 ${
                    theme === 'light'
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/40'
                  }`}
                  onClick={() => handleThemeChange('light')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                      <Sun className="h-5 w-5" />
                    </div>
                    <div>
                      <Label className="cursor-pointer font-medium text-foreground block">Light Mode</Label>
                      <span className="text-xs text-muted-foreground">Crisp & clear view</span>
                    </div>
                  </div>
                  <RadioGroupItem value="light" id="theme-light" />
                </div>

                <div
                  className={`flex items-center justify-between space-x-2 border rounded-xl p-4 cursor-pointer transition-all duration-150 ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/40'
                  }`}
                  onClick={() => handleThemeChange('dark')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                      <Moon className="h-5 w-5" />
                    </div>
                    <div>
                      <Label className="cursor-pointer font-medium text-foreground block">Dark Mode</Label>
                      <span className="text-xs text-muted-foreground">Easy on the eyes</span>
                    </div>
                  </div>
                  <RadioGroupItem value="dark" id="theme-dark" />
                </div>

                <div
                  className={`flex items-center justify-between space-x-2 border rounded-xl p-4 cursor-pointer transition-all duration-150 ${
                    theme === 'system'
                      ? 'border-primary bg-primary/10 shadow-xs ring-1 ring-primary/20'
                      : 'border-border hover:border-muted-foreground/30 hover:bg-muted/40'
                  }`}
                  onClick={() => handleThemeChange('system')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <Monitor className="h-5 w-5" />
                    </div>
                    <div>
                      <Label className="cursor-pointer font-medium text-foreground block">System</Label>
                      <span className="text-xs text-muted-foreground">Follow OS settings</span>
                    </div>
                  </div>
                  <RadioGroupItem value="system" id="theme-system" />
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-xs border-border bg-card text-card-foreground">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-500" />
              Security
            </CardTitle>
            <CardDescription>Update your password, manage your active session, or permanently delete your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <Key size={16} className="text-muted-foreground"/> Password
                </h4>
                <p className="text-sm text-muted-foreground">Change your password via email verification.</p>
              </div>
              <Button variant="outline" onClick={() => setIsPasswordModalOpen(true)}>Change Password</Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <h4 className="font-medium text-foreground flex items-center gap-2">
                  <LogOut size={16} className="text-muted-foreground"/> Log Out
                </h4>
                <p className="text-sm text-muted-foreground">Log out of your current session on this device.</p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  logout();
                  navigate('/login');
                  toast.success('Logged out successfully');
                }}
                className="gap-2 text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-rose-200 dark:border-rose-900/40"
              >
                <LogOut size={16} /> Log Out
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <div className="space-y-1">
                <h4 className="font-medium text-destructive flex items-center gap-2">
                  <Trash2 size={16} /> Delete Account
                </h4>
                <p className="text-sm text-muted-foreground">Permanently remove your account and all data.</p>
              </div>
              <Button variant="destructive" onClick={() => setIsDeleteModalOpen(true)}>Delete Account</Button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Password Change Modal */}
      <Dialog open={isPasswordModalOpen} onOpenChange={(open) => {
        setIsPasswordModalOpen(open);
        if(!open) { setPwdStep(1); setPwdCode(''); setPwdToken(''); setNewPassword(''); setConfirmPassword(''); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              {pwdStep === 1 && "We will send a verification code to your registered email."}
              {pwdStep === 2 && "Enter the 6-digit verification code sent to your email."}
              {pwdStep === 3 && "Set your new secure password."}
            </DialogDescription>
          </DialogHeader>

          {pwdStep === 1 && (
            <div className="flex justify-end pt-4">
              <Button onClick={handleRequestCode} disabled={pwdLoading}>
                {pwdLoading ? 'Sending...' : 'Send Code'}
              </Button>
            </div>
          )}

          {pwdStep === 2 && (
            <form onSubmit={handleVerifyCode} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="pwdCode">Verification Code</Label>
                <Input id="pwdCode" required maxLength={6} value={pwdCode} onChange={e => setPwdCode(e.target.value)} placeholder="123456" autoFocus />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pwdLoading}>
                  {pwdLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
              </DialogFooter>
            </form>
          )}

          {pwdStep === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" required minLength={8} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={pwdLoading || newPassword !== confirmPassword || newPassword.length < 8}>
                  {pwdLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Account Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={(open) => {
        setIsDeleteModalOpen(open);
        if(!open) { setDeleteConfirmation(''); setDeletePassword(''); }
      }}>
        <DialogContent className="sm:max-w-md border-red-200">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Account?
            </DialogTitle>
            <DialogDescription className="text-red-900/80">
              This action is permanent. All your data will be removed and you will be logged out.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeleteAccount} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="deleteConfirmation" className="text-red-700">Type DELETE to confirm</Label>
              <Input id="deleteConfirmation" required value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} placeholder="DELETE" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Current Password</Label>
              <Input id="deletePassword" type="password" required value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={deleteLoading || deleteConfirmation !== 'DELETE' || !deletePassword}>
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
