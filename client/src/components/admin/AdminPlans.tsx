import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  Trash2, 
  Users, 
  Edit3, 
  BellRing, 
  Search, 
  ChevronsLeft, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsRight,
  Power,
  PowerOff
} from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const STORAGE_PRESETS = [
  { label: '128 MB', value: 128 },
  { label: '256 MB', value: 256 },
  { label: '512 MB', value: 512 },
  { label: '1 GB', value: 1024 },
  { label: '2 GB', value: 2048 },
  { label: '3 GB', value: 3072 },
  { label: '5 GB', value: 5120 },
];

export default function AdminPlans() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [isCreating, setIsCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', price: '', maxStorageMb: '', durationDays: '30' });
  const [warningPlan, setWarningPlan] = useState<any | null>(null);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<any | null>(null);

  // Edit State
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: '', price: '', maxStorageMb: '', durationDays: '30' });
  const [editWarningOpen, setEditWarningOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['adminPlans', { page: currentPage, limit, search: debouncedSearch }],
    queryFn: () => plansApi.getAll({ page: currentPage, limit, search: debouncedSearch }),
  });

  const plans = Array.isArray(response) ? response : (response?.data || []);
  const pagination = response?.pagination || {
    total: plans.length,
    page: currentPage,
    limit: limit,
    totalPages: Math.ceil(plans.length / limit) || 1,
  };

  const createMutation = useMutation({
    mutationFn: plansApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      toast.success('Plan created successfully & announcements dispatched');
      setIsCreating(false);
      setNewPlan({ name: '', price: '', maxStorageMb: '', durationDays: '30' });
    },
    onError: (error: any) => toast.error(error.message)
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => plansApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      toast.success('Plan updated successfully');
      setEditingPlan(null);
      setEditWarningOpen(false);
    },
    onError: (error: any) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: plansApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      toast.success('Plan permanently deleted & announcements dispatched');
      setDeleteConfirmPlan(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: plansApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      toast.success('Plan deactivated & subscribers notified');
      setWarningPlan(null);
    },
    onError: (error: any) => toast.error(error.message)
  });

  const activateMutation = useMutation({
    mutationFn: plansApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      toast.success('Plan activated & subscribers notified');
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newPlan);
  };

  const handleStartEdit = (plan: any) => {
    setEditingPlan(plan);
    setEditForm({
      name: plan.name,
      price: plan.price.toString(),
      maxStorageMb: plan.maxStorageMb.toString(),
      durationDays: (plan.durationDays || 30).toString(),
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const priceChanged = parseFloat(editForm.price).toFixed(2) !== parseFloat(editingPlan.price).toFixed(2);
    const quotaChanged = parseInt(editForm.maxStorageMb) !== editingPlan.maxStorageMb;
    const durationChanged = parseInt(editForm.durationDays) !== (editingPlan.durationDays || 30);
    const hasSubscribers = editingPlan.activeSubscribers && editingPlan.activeSubscribers > 0;

    // Option B: If changes affect existing subscribers (price, quota, duration), show warning confirmation dialog
    if (hasSubscribers && (priceChanged || quotaChanged || durationChanged)) {
      setEditWarningOpen(true);
    } else {
      executeSaveEdit();
    }
  };

  const executeSaveEdit = () => {
    if (!editingPlan) return;
    updateMutation.mutate({
      id: editingPlan.id,
      data: {
        name: editForm.name,
        price: editForm.price,
        maxStorageMb: parseInt(editForm.maxStorageMb),
        durationDays: parseInt(editForm.durationDays),
      },
    });
  };

  const handleDeleteClick = (plan: any) => {
    if (plan.activeSubscribers && plan.activeSubscribers > 0) {
      setWarningPlan(plan);
    } else {
      setDeleteConfirmPlan(plan);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Manage Plans</h2>
          <p className="text-slate-500">Configure subscription tiers, pricing, and automated subscriber announcements.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search plans by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "outline" : "default"}>
            {isCreating ? 'Cancel' : 'Create New Plan'}
          </Button>
        </div>
      </div>

      {isCreating && (
        <Card className="border-blue-200 shadow-sm bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg">Create Subscription Plan</CardTitle>
            <CardDescription>Configure pricing and storage limits. An announcement will be broadcast to all users.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan Name</label>
                <Input required value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} placeholder="e.g. Pro Tier" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price ($)</label>
                <Input required type="number" step="0.01" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} placeholder="29.99" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Max Storage (MB)</label>
                  {newPlan.maxStorageMb && !isNaN(Number(newPlan.maxStorageMb)) && Number(newPlan.maxStorageMb) > 0 && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-medium">
                      ≈ {Number(newPlan.maxStorageMb) >= 1024 
                          ? (parseFloat(newPlan.maxStorageMb) / 1024).toFixed(1).replace(/\.0$/, '') 
                          : (parseFloat(newPlan.maxStorageMb) / 1024).toFixed(2).replace(/0$/, '')} GB
                    </span>
                  )}
                </div>
                <Input required type="number" value={newPlan.maxStorageMb} onChange={e => setNewPlan({...newPlan, maxStorageMb: e.target.value})} placeholder="e.g. 1024" />
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-xs text-slate-400 select-none">Presets:</span>
                  {STORAGE_PRESETS.map((preset) => {
                    const isSelected = newPlan.maxStorageMb === preset.value.toString();
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setNewPlan({ ...newPlan, maxStorageMb: preset.value.toString() })}
                        className={cn(
                          "px-2.5 py-1 text-xs rounded-md font-medium transition-colors border cursor-pointer",
                          isSelected
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
                        )}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (Days)</label>
                <Input required type="number" value={newPlan.durationDays} onChange={e => setNewPlan({...newPlan, durationDays: e.target.value})} placeholder="30" />
              </div>
              <div className="sm:col-span-2 pt-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving & Broadcasting...' : 'Save & Publish Plan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-16">No.</th>
                <th className="px-6 py-4">Plan Name</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Storage Quota</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Subscribers</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">Loading plans...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-500">{debouncedSearch ? 'No plans found matching your search.' : 'No active plans found.'}</td></tr>
              ) : (
                plans.map((plan: any, index: number) => (
                  <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-500">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{plan.name}</td>
                    <td className="px-6 py-4">${parseFloat(plan.price).toFixed(2)}</td>
                    <td className="px-6 py-4">{plan.maxStorageMb} MB</td>
                    <td className="px-6 py-4">{plan.durationDays} Days</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">{plan.activeSubscribers || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {plan.status === 'ACTIVE' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center justify-start gap-1">
                        {/* Edit Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => handleStartEdit(plan)}
                            >
                              <Edit3 className="h-4 w-4" />
                              <span className="sr-only">Edit Plan</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit Plan</TooltipContent>
                        </Tooltip>

                        {/* Activate / Deactivate Button */}
                        {plan.status === 'ACTIVE' ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => deactivateMutation.mutate(plan.id)}
                                disabled={deactivateMutation.isPending}
                              >
                                <PowerOff className="h-4 w-4" />
                                <span className="sr-only">Deactivate Plan</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Deactivate Plan</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                onClick={() => activateMutation.mutate(plan.id)}
                                disabled={activateMutation.isPending}
                              >
                                <Power className="h-4 w-4" />
                                <span className="sr-only">Activate Plan</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Activate Plan</TooltipContent>
                          </Tooltip>
                        )}

                        {/* Delete Button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => handleDeleteClick(plan)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete Plan</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete Plan</TooltipContent>
                        </Tooltip>
                      </div>
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
              <span className="font-medium text-slate-700">{pagination.total}</span> plans
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
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage >= pagination.totalPages || isLoading}
                className="h-8 w-8 text-slate-600 hover:text-slate-900"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(pagination.totalPages)}
                disabled={currentPage >= pagination.totalPages || isLoading}
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

      {/* =========================================================================
          Edit Plan Dialog
         ========================================================================= */}
      <Dialog open={!!editingPlan && !editWarningOpen} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-blue-600 mb-1">
              <div className="h-9 w-9 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Edit3 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Edit Subscription Plan</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 pt-1 text-sm">
              Update pricing, storage quota, and duration for <strong>{editingPlan?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Plan Name</label>
              <Input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Plan Name"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Price ($)</label>
              <Input
                required
                type="number"
                step="0.01"
                value={editForm.price}
                onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                placeholder="29.99"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Storage Quota (MB)</label>
                {editForm.maxStorageMb && !isNaN(Number(editForm.maxStorageMb)) && Number(editForm.maxStorageMb) > 0 && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-mono font-medium">
                    ≈ {Number(editForm.maxStorageMb) >= 1024 
                        ? (parseFloat(editForm.maxStorageMb) / 1024).toFixed(1).replace(/\.0$/, '') 
                        : (parseFloat(editForm.maxStorageMb) / 1024).toFixed(2).replace(/0$/, '')} GB
                  </span>
                )}
              </div>
              <Input
                required
                type="number"
                value={editForm.maxStorageMb}
                onChange={(e) => setEditForm({ ...editForm, maxStorageMb: e.target.value })}
                placeholder="1024"
              />
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-xs text-slate-400 select-none">Presets:</span>
                {STORAGE_PRESETS.map((preset) => {
                  const isSelected = editForm.maxStorageMb === preset.value.toString();
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, maxStorageMb: preset.value.toString() })}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-md font-medium transition-colors border cursor-pointer",
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-700"
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Duration (Days)</label>
              <Input
                required
                type="number"
                value={editForm.durationDays}
                onChange={(e) => setEditForm({ ...editForm, durationDays: e.target.value })}
                placeholder="30"
              />
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setEditingPlan(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          Edit Confirmation Dialog (Option B)
         ========================================================================= */}
      <Dialog open={editWarningOpen} onOpenChange={(open) => !open && setEditWarningOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-amber-600 mb-1">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <BellRing className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Confirm Plan Changes</DialogTitle>
            </div>
            <DialogDescription className="text-slate-700 pt-3 text-sm leading-relaxed whitespace-pre-line font-medium">
              This change will affect all users currently subscribed to this plan ({editingPlan?.activeSubscribers} active subscriber{editingPlan?.activeSubscribers === 1 ? '' : 's'}).
              {"\n\n"}
              They will be notified by email and in-app modal.
              {"\n\n"}
              Do you want to continue?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-3 mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setEditWarningOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              onClick={executeSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving & Notifying...' : 'Confirm & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          Warning Dialog when deleting plan with active subscribers
         ========================================================================= */}
      <Dialog open={!!warningPlan} onOpenChange={(open) => !open && setWarningPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-amber-600 mb-1">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Subscribers Active on Plan</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 pt-2 text-sm leading-relaxed">
              This plan has <span className="font-semibold text-slate-900">{warningPlan?.activeSubscribers}</span> active subscriber{warningPlan?.activeSubscribers === 1 ? '' : 's'}. You cannot delete it while users are subscribed.
              <br /><br />
              Would you like to <span className="font-semibold text-amber-700">deactivate</span> the plan instead? Existing subscribers will retain access until their current billing period ends, after which they will transition to the Free plan.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setWarningPlan(null)}>
              Cancel
            </Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                if (warningPlan) {
                  deactivateMutation.mutate(warningPlan.id);
                }
              }}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          Delete Confirmation Dialog for plans with 0 subscribers
         ========================================================================= */}
      <Dialog open={!!deleteConfirmPlan} onOpenChange={(open) => !open && setDeleteConfirmPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-600 mb-1">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Delete Plan</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 pt-2 text-sm">
              Are you sure you want to permanently delete <span className="font-semibold text-slate-900">{deleteConfirmPlan?.name}</span>? All users will receive an announcement that this plan was removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setDeleteConfirmPlan(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (deleteConfirmPlan) {
                  deleteMutation.mutate(deleteConfirmPlan.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </TooltipProvider>
  );
}
