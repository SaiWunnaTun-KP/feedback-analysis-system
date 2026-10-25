import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedbacksApi } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Trash2 } from 'lucide-react';

interface AdminFeedbacksProps {
  initialFeedbackId?: number | null;
  onClearInitialFeedback?: () => void;
}

export default function AdminFeedbacks({ initialFeedbackId, onClearInitialFeedback }: AdminFeedbacksProps = {}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const ITEMS_PER_PAGE = 10;

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: response, isLoading } = useQuery({
    queryKey: ['adminFeedbacks', { page: currentPage, limit: ITEMS_PER_PAGE, search: debouncedSearch, status: statusFilter, sortOrder }],
    queryFn: () => feedbacksApi.getAll({ page: currentPage, limit: ITEMS_PER_PAGE, search: debouncedSearch, status: statusFilter, sortOrder }),
  });

  const feedbacks = response?.data || [];
  const pagination = response?.pagination || {
    total: feedbacks.length,
    page: currentPage,
    limit: ITEMS_PER_PAGE,
    totalPages: Math.ceil(feedbacks.length / ITEMS_PER_PAGE) || 1,
  };
  const pendingCount = response?.pendingCount ?? feedbacks.filter((f: any) => f.status === 'pending').length;

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: 'pending' | 'sent' | 'replied' }) => feedbacksApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeedbacks'] });
      toast.success('Feedback status updated');
    },
    onError: (error: any) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => feedbacksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeedbacks'] });
      toast.success('Feedback deleted successfully');
      setDeleteTarget(null);
      if (selectedFeedback) setSelectedFeedback(null);
    },
    onError: (error: any) => toast.error(error.message)
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, replyMessage }: { id: number, replyMessage: string }) => feedbacksApi.reply(id, replyMessage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFeedbacks'] });
      setSelectedFeedback(null);
      setReplyMessage('');
      toast.success('Reply sent successfully!');
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    
    replyMutation.mutate({ id: selectedFeedback.feedbackId, replyMessage });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">Pending</Badge>;
      case 'sent': return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">Sent</Badge>;
      case 'replied': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Replied</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Manage User Feedbacks
            {pendingCount > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                {pendingCount} Pending
              </Badge>
            )}
          </h2>
          <p className="text-slate-500">View and reply to support tickets from users.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="replied">Replied</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search subject or message..." 
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
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => { setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc'); setCurrentPage(1); }}>
                  <div className="flex items-center gap-2">
                    Created At
                    <ArrowUpDown className="h-4 w-4 text-slate-400" />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading feedbacks...</td></tr>
              ) : feedbacks.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">{debouncedSearch ? 'No feedbacks found matching your search.' : 'No feedbacks found.'}</td></tr>
              ) : (
                feedbacks.map((feedback: any, index: number) => (
                  <tr key={feedback.feedbackId} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelectedFeedback(feedback)}>
                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-500">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{feedback.subject}</td>
                    <td className="px-6 py-4">{getStatusBadge(feedback.status)}</td>
                    <td className="px-6 py-4 text-slate-500">{new Date(feedback.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/40 font-medium"
                          onClick={(e) => { e.stopPropagation(); setSelectedFeedback(feedback); }}
                        >
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(feedback); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
              <span className="font-medium text-slate-700">{pagination.total}</span> feedbacks
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

      <Dialog open={!!selectedFeedback} onOpenChange={(open) => {
        if (!open) {
          setSelectedFeedback(null);
          onClearInitialFeedback?.();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between mt-2 gap-4">
                  <DialogTitle className="text-xl">{selectedFeedback.subject}</DialogTitle>
                  <div>{getStatusBadge(selectedFeedback.status)}</div>
                </div>
                <DialogDescription className="text-sm mt-1">
                  Submitted on {new Date(selectedFeedback.createdAt).toLocaleString()} by {selectedFeedback.retailerName} (Retailer #{selectedFeedback.retailerId})
                </DialogDescription>
              </DialogHeader>

              <div className="bg-slate-50 p-4 rounded-md border border-slate-100 whitespace-pre-wrap text-slate-700 text-sm leading-relaxed my-4">
                {selectedFeedback.message}
              </div>

              <div className="flex items-center justify-between gap-2 mb-6">
                <div>
                  {selectedFeedback.status === 'pending' && (
                    <Button 
                      variant="outline" 
                      onClick={() => statusMutation.mutate({ id: selectedFeedback.feedbackId, status: 'sent' })}
                      disabled={statusMutation.isPending}
                    >
                      Mark as Sent
                    </Button>
                  )}
                </div>
                <Button 
                  variant="outline"
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={() => setDeleteTarget(selectedFeedback)}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Delete Feedback
                </Button>
              </div>

              {selectedFeedback.status !== 'replied' ? (
                <div className="border-t pt-6">
                  <h3 className="font-medium mb-3">Send Reply</h3>
                  <div className="mb-4 space-y-1">
                    <p className="text-sm text-slate-500">
                      <span className="font-medium text-slate-700">To:</span> {selectedFeedback.retailerEmail || `Retailer #${selectedFeedback.retailerId}`}
                    </p>
                    <p className="text-sm text-slate-500">
                      <span className="font-medium text-slate-700">Subject:</span> Re: {selectedFeedback.subject}
                    </p>
                  </div>
                  <form onSubmit={handleReply} className="space-y-4">
                    <Textarea 
                      placeholder="Type your reply here..."
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="min-h-[120px]"
                      required
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={() => setSelectedFeedback(null)}>Cancel</Button>
                      <Button type="submit" disabled={replyMutation.isPending}>
                        {replyMutation.isPending ? 'Sending Email...' : 'Send Reply'}
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-md text-sm">
                  This feedback has already been replied to. (Replied by Admin ID: {selectedFeedback.repliedBy})
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Feedback Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-600 mb-1">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Delete Feedback</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 pt-2 text-sm leading-relaxed">
              Are you sure you want to delete this feedback ticket <span className="font-semibold text-slate-900">"{deleteTarget?.subject}"</span>?
              It will be removed from the active feedbacks list.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.feedbackId);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Feedback'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
