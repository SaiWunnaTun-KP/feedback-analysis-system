import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, HardDrive, Database, 
  MessageSquare, User, AlertTriangle, Trash2, ExternalLink, Mail
} from 'lucide-react';

const PREDEFINED_SUSPENSION_REASONS = [
  {
    id: 'terms_violation',
    label: 'Violation of Terms of Service',
    description: 'Violation of the platform Terms of Service and acceptable use policy.',
  },
  {
    id: 'suspicious_activity',
    label: 'Suspicious / Fraudulent Activity',
    description: 'Suspicious or unauthorized account activity detected.',
  },
  {
    id: 'billing_dispute',
    label: 'Billing / Unpaid Balance',
    description: 'Unresolved billing or payment failure for subscription plan.',
  },
  {
    id: 'resource_abuse',
    label: 'System Resource Abuse',
    description: 'Excessive requests or abusive usage impacting platform performance.',
  },
  {
    id: 'inappropriate_content',
    label: 'Spam or Inappropriate Content',
    description: 'Submission of spam, inappropriate, or prohibited feedback datasets.',
  },
  {
    id: 'custom',
    label: 'Other (Custom Reason)',
    description: '',
  },
];

interface AdminUsersProps {
  onNavigateToFeedback?: (feedbackId: number) => void;
}

export default function AdminUsers({ onNavigateToFeedback }: AdminUsersProps = {}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any | null>(null);
  const [suspendConfirmUser, setSuspendConfirmUser] = useState<any | null>(null);
  const [suspendReasonCategory, setSuspendReasonCategory] = useState<string>('terms_violation');
  const [suspendCustomReason, setSuspendCustomReason] = useState<string>(PREDEFINED_SUSPENSION_REASONS[0].description);

  const ITEMS_PER_PAGE = 10;

  const handleOpenSuspend = (user: any) => {
    setSuspendConfirmUser(user);
    setSuspendReasonCategory('terms_violation');
    setSuspendCustomReason(PREDEFINED_SUSPENSION_REASONS[0].description);
  };

  const handleReasonCategoryChange = (val: string) => {
    setSuspendReasonCategory(val);
    const found = PREDEFINED_SUSPENSION_REASONS.find(r => r.id === val);
    if (found && val !== 'custom') {
      setSuspendCustomReason(found.description);
    } else if (val === 'custom') {
      setSuspendCustomReason('');
    }
  };

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const queryParams: Record<string, string> = {
    page: currentPage.toString(),
    limit: ITEMS_PER_PAGE.toString(),
  };
  if (debouncedSearch) queryParams.search = debouncedSearch;
  if (statusFilter !== 'all') queryParams.status = statusFilter;

  const { data: response, isLoading } = useQuery({
    queryKey: ['adminUsers', queryParams],
    queryFn: () => adminUsersApi.getAll(queryParams),
  });

  const { data: detailResponse, isLoading: detailLoading } = useQuery({
    queryKey: ['adminUserDetail', selectedUserId],
    queryFn: () => adminUsersApi.getById(selectedUserId!),
    enabled: !!selectedUserId,
  });

  const users = response?.data || [];
  const pagination = response?.pagination || { total: 0, page: 1, limit: ITEMS_PER_PAGE };
  const totalPages = pagination.totalPages || Math.ceil(pagination.total / pagination.limit) || 1;
  const userDetail = detailResponse?.data;

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: number; status: string; reason?: string }) => 
      adminUsersApi.updateStatus(id, status, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      queryClient.invalidateQueries({ queryKey: ['adminUserDetail', selectedUserId] });
      if (variables.status === 'suspended') {
        toast.success(`User suspended and notice email sent to ${suspendConfirmUser?.email || 'user'}`);
      } else if (variables.status === 'active') {
        toast.success(`User reactivated and confirmation email sent to ${userDetail?.email || 'user'}`);
      } else {
        toast.success('User status updated');
      }
      setDeleteConfirmUser(null);
      setSuspendConfirmUser(null);
    },
    onError: (error: any) => toast.error(error.message)
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Active</Badge>;
      case 'suspended': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Suspended</Badge>;
      case 'deleted': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">Deleted</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    return role === 'ADMIN' ? (
      <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Admin</Badge>
    ) : (
      <Badge variant="outline" className="border-slate-200 text-slate-700 bg-slate-50">User</Badge>
    );
  };

  const getDatasetStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Completed</Badge>;
      case 'ANALYSIS_IN_PROGRESS': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Processing</Badge>;
      case 'FAILED': return <Badge className="bg-red-100 text-red-800 border-red-200">Failed</Badge>;
      default: return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Manage Users</h2>
          <p className="text-slate-500">View and manage user accounts and resource usage.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Active/Suspended</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search name, email, or company..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-16">No.</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Company</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">{debouncedSearch ? 'No users found matching your search.' : 'No users found.'}</td></tr>
              ) : (
                users.map((user: any, index: number) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedUserId(user.id)}>
                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-500">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{user.username}</td>
                    <td className="px-6 py-4 text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 text-slate-600">{user.companyName || '—'}</td>
                    <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/40 font-medium"
                        onClick={(e) => { e.stopPropagation(); setSelectedUserId(user.id); }}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Server-Driven Pagination Bar */}
        {pagination.total > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-medium text-slate-700">{pagination.total}</span> users
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1 || isLoading}
                className="h-8 w-8 text-slate-600 hover:text-slate-900"
                title="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">First page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || isLoading}
                className="h-8 w-8 text-slate-600 hover:text-slate-900"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <span className="text-xs font-semibold px-3 py-1.5 bg-white rounded-md text-slate-700 border border-slate-200 shadow-xs select-none">
                Page {pagination.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || isLoading}
                className="h-8 w-8 text-slate-600 hover:text-slate-900"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages || isLoading}
                className="h-8 w-8 text-slate-600 hover:text-slate-900"
                title="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
                <span className="sr-only">Last page</span>
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* User Full Detail Dialog */}
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          {detailLoading || !userDetail ? (
            <div className="py-12 text-center text-slate-500">Loading user details...</div>
          ) : (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1 pb-3 border-b">
                  <div>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                      {userDetail.username}
                      {getRoleBadge(userDetail.role)}
                    </DialogTitle>
                    <DialogDescription className="text-sm mt-1 text-slate-500">
                      User #{userDetail.id} &bull; Joined {new Date(userDetail.createdAt).toLocaleDateString()}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(userDetail.status)}
                  </div>
                </div>
              </DialogHeader>

              {/* Suspension Reason Banner */}
              {userDetail.status === 'suspended' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-amber-900 text-sm">Account is Currently Suspended</div>
                    <p className="text-amber-800 text-xs leading-relaxed">
                      <span className="font-semibold text-amber-900">Reason: </span>
                      {userDetail.suspensionReason || 'No specific reason recorded.'}
                    </p>
                  </div>
                </div>
              )}

              {/* 1. Basic Info & Subscription / Storage */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Basic Info (Read-Only) */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 pb-2 border-b border-slate-200/50">
                    <User className="h-4 w-4 text-blue-600" />
                    Basic Information (Read-Only)
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-slate-500">Name:</span>
                    <span className="font-medium text-slate-900 truncate">{userDetail.username}</span>
                    
                    <span className="text-slate-500">Email:</span>
                    <span className="font-medium text-slate-900 truncate">{userDetail.email}</span>
                    
                    <span className="text-slate-500">Role:</span>
                    <span className="font-medium text-slate-900">{userDetail.role === 'ADMIN' ? 'Admin' : 'User'}</span>

                    <span className="text-slate-500">Account Status:</span>
                    <span className="font-medium capitalize text-slate-900">{userDetail.status}</span>

                    <span className="text-slate-500">Joined Date:</span>
                    <span className="font-medium text-slate-900">{new Date(userDetail.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Subscription & Usage */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/70 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 pb-2 border-b border-slate-200/50">
                    <HardDrive className="h-4 w-4 text-emerald-600" />
                    Subscription & Storage Usage
                  </div>
                  {userDetail.subscription ? (
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-slate-500">Current Plan:</span>
                      <span className="font-semibold text-blue-600">{userDetail.subscription.planName || 'Custom Plan'}</span>

                      <span className="text-slate-500">Storage Used:</span>
                      <span className="font-medium text-slate-900">
                        {Number(userDetail.subscription.usedStorageMb).toFixed(2)} MB / {userDetail.subscription.maxStorageMb} MB
                      </span>

                      <span className="text-slate-500">Plan Status:</span>
                      <span className="font-medium capitalize text-slate-900">
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">
                          {userDetail.subscription.status}
                        </Badge>
                      </span>

                      <span className="text-slate-500">Billing Period End:</span>
                      <span className="font-medium text-slate-900">
                        {userDetail.subscription.currentPeriodEnd 
                          ? new Date(userDetail.subscription.currentPeriodEnd).toLocaleDateString()
                          : new Date(userDetail.subscription.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <div className="py-3 text-sm text-slate-600 space-y-2">
                      <p className="font-medium text-slate-700">Free Tier (No Active Subscription)</p>
                      <p className="text-xs text-slate-500">Quota: Up to 75 MB (Free trial tier)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Uploaded Datasets (Read-Only) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                    <Database className="h-4 w-4 text-blue-600" />
                    Uploaded Datasets ({userDetail.datasets?.length || 0})
                  </h3>
                </div>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100 text-xs">
                      <tr>
                        <th className="px-4 py-2.5">Dataset Name</th>
                        <th className="px-4 py-2.5">Size</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Uploaded Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {!userDetail.datasets || userDetail.datasets.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No datasets uploaded by this user.</td></tr>
                      ) : (
                        userDetail.datasets.map((ds: any) => (
                          <tr key={ds.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2.5 font-medium text-slate-900">{ds.filename}</td>
                            <td className="px-4 py-2.5 text-slate-600">{Number(ds.fileSizeMb).toFixed(2)} MB</td>
                            <td className="px-4 py-2.5">{getDatasetStatusBadge(ds.status)}</td>
                            <td className="px-4 py-2.5 text-slate-500">{new Date(ds.createdAt).toLocaleDateString()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Support Feedbacks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                    <MessageSquare className="h-4 w-4 text-indigo-600" />
                    Support Feedbacks ({userDetail.feedbacks?.length || 0})
                  </h3>
                  {userDetail.feedbacks?.length > 0 && (
                    <span className="text-[11px] text-slate-400">Click a ticket to reply in Manage Feedbacks</span>
                  )}
                </div>
                <div className="border rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100 text-xs">
                      <tr>
                        <th className="px-4 py-2.5">Subject</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Created Date</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {!userDetail.feedbacks || userDetail.feedbacks.length === 0 ? (
                        <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-500">No feedbacks submitted by this user.</td></tr>
                      ) : (
                        userDetail.feedbacks.map((fb: any) => (
                          <tr 
                            key={fb.feedbackId} 
                            className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                            onClick={() => {
                              setSelectedUserId(null);
                              onNavigateToFeedback?.(fb.feedbackId);
                            }}
                          >
                            <td className="px-4 py-2.5 font-medium text-slate-900 group-hover:text-blue-700 transition-colors">
                              {fb.subject}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                fb.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                                fb.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                'bg-emerald-100 text-emerald-800'
                              }`}>
                                {fb.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-500">{new Date(fb.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100/70 gap-1 font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUserId(null);
                                  onNavigateToFeedback?.(fb.feedbackId);
                                }}
                              >
                                <span>Manage Ticket</span>
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Account Actions (Suspend / Reactivate / Soft Delete) */}
              <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Manage account status. Changes take effect immediately.
                </div>
                <div className="flex items-center gap-2">
                  {userDetail.status === 'active' && (
                    <Button 
                      variant="outline"
                      className="border-amber-200 text-amber-700 hover:bg-amber-50 cursor-pointer"
                      onClick={() => handleOpenSuspend(userDetail)}
                      disabled={statusMutation.isPending}
                    >
                      Suspend User
                    </Button>
                  )}
                  {userDetail.status === 'suspended' && (
                    <Button 
                      variant="outline"
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                      onClick={() => statusMutation.mutate({ id: userDetail.id, status: 'active' })}
                      disabled={statusMutation.isPending}
                    >
                      Reactivate User
                    </Button>
                  )}
                  {userDetail.status !== 'deleted' && (
                    <Button 
                      variant="outline"
                      className="border-rose-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                      onClick={() => setDeleteConfirmUser(userDetail)}
                      disabled={statusMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Soft Delete User
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend Confirmation Dialog with Reason Selection & Email Notice */}
      <Dialog open={!!suspendConfirmUser} onOpenChange={(open) => !open && setSuspendConfirmUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-amber-600 mb-1">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Suspend User Account</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 pt-1 text-sm leading-relaxed">
              Suspend <span className="font-semibold text-slate-900">{suspendConfirmUser?.username}</span> (<span className="text-slate-700">{suspendConfirmUser?.email}</span>). Select or provide a reason below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Reason Category</label>
              <Select 
                value={suspendReasonCategory} 
                onValueChange={handleReasonCategoryChange}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_SUSPENSION_REASONS.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Explanation Notice <span className="text-slate-400 font-normal">(Included in user email)</span>
              </label>
              <Textarea
                value={suspendCustomReason}
                onChange={(e) => setSuspendCustomReason(e.target.value)}
                placeholder="Enter detailed reason for suspension..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>

            <div className="bg-amber-50/80 border border-amber-200/70 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <Mail className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                An official suspension notice email with this explanation will automatically be sent to <span className="font-semibold underline">{suspendConfirmUser?.email}</span>.
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setSuspendConfirmUser(null)} disabled={statusMutation.isPending}>
              Cancel
            </Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white gap-2 cursor-pointer"
              onClick={() => {
                if (suspendConfirmUser) {
                  const finalReason = suspendCustomReason.trim();
                  if (!finalReason) {
                    toast.error('Please provide a reason for suspension');
                    return;
                  }
                  statusMutation.mutate({
                    id: suspendConfirmUser.id,
                    status: 'suspended',
                    reason: finalReason
                  });
                }
              }}
              disabled={statusMutation.isPending || !suspendCustomReason.trim()}
            >
              {statusMutation.isPending ? 'Suspending & Notifying...' : 'Suspend & Notify User'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Soft Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-600 mb-1">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Soft Delete User</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 pt-2 text-sm leading-relaxed">
              Are you sure you want to soft-delete <span className="font-semibold text-slate-900">{deleteConfirmUser?.username}</span>?
              Their status will become "deleted", they cannot log in, and they will be hidden from the default user list.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setDeleteConfirmUser(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (deleteConfirmUser) {
                  statusMutation.mutate({ id: deleteConfirmUser.id, status: 'deleted' });
                }
              }}
              disabled={statusMutation.isPending}
            >
              {statusMutation.isPending ? 'Deleting...' : 'Soft Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
