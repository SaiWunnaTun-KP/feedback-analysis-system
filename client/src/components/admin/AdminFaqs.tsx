import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { faqsApi } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, Eye, EyeOff, Search } from 'lucide-react';

interface FaqItem {
  faqId: number;
  question: string;
  answer: string;
  isVisible: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminFaqs() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);

  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    sortOrder: 0,
    isVisible: true,
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['adminFaqs'],
    queryFn: faqsApi.getAllAdmin,
  });

  const faqs: FaqItem[] = response?.data || [];

  const filteredFaqs = faqs.filter((faq) => {
    return (
      faq.question.toLowerCase().includes(search.toLowerCase()) ||
      faq.answer.toLowerCase().includes(search.toLowerCase())
    );
  });

  const createMutation = useMutation({
    mutationFn: faqsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqs'] });
      toast.success('FAQ created successfully');
      closeDialog();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to create FAQ'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => faqsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqs'] });
      toast.success('FAQ updated successfully');
      closeDialog();
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update FAQ'),
  });

  const visibilityMutation = useMutation({
    mutationFn: ({ id, isVisible }: { id: number; isVisible: boolean }) =>
      faqsApi.toggleVisibility(id, isVisible),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqs'] });
      toast.success('FAQ visibility updated');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to update visibility'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => faqsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminFaqs'] });
      toast.success('FAQ permanently deleted');
      setDeleteTarget(null);
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete FAQ'),
  });

  const openCreateDialog = () => {
    setEditingFaq(null);
    setFormData({
      question: '',
      answer: '',
      sortOrder: faqs.length > 0 ? Math.max(...faqs.map(f => f.sortOrder)) + 1 : 1,
      isVisible: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (faq: FaqItem) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      sortOrder: faq.sortOrder,
      isVisible: faq.isVisible,
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingFaq(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('Question and answer are required');
      return;
    }

    if (editingFaq) {
      updateMutation.mutate({
        id: editingFaq.faqId,
        data: formData,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Manage FAQs</h2>
          <p className="text-slate-500">Create, edit, hide/show, and reorder user help FAQs.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search FAQs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button onClick={openCreateDialog} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Create FAQ
          </Button>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 w-20">Order</th>
                <th className="px-6 py-4 min-w-[280px]">Question</th>
                <th className="px-6 py-4 min-w-[320px]">Answer</th>
                <th className="px-6 py-4 w-28">Visibility</th>
                <th className="px-6 py-4 text-right min-w-[180px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    Loading FAQs...
                  </td>
                </tr>
              ) : filteredFaqs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    {search ? `No FAQs matching "${search}" found.` : 'No FAQs found. Create your first FAQ!'}
                  </td>
                </tr>
              ) : (
                filteredFaqs.map((faq) => (
                  <tr key={faq.faqId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-slate-500 text-xs">
                      #{faq.sortOrder}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {faq.question}
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs line-clamp-2 max-w-md pt-5">
                      {faq.answer}
                    </td>
                    <td className="px-6 py-4">
                      {faq.isVisible ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">
                          Visible
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500 bg-slate-50">
                          Hidden
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={faq.isVisible ? "text-slate-600 hover:text-slate-900" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}
                          onClick={() => visibilityMutation.mutate({ id: faq.faqId, isVisible: !faq.isVisible })}
                          disabled={visibilityMutation.isPending}
                          title={faq.isVisible ? "Hide FAQ" : "Show FAQ"}
                        >
                          {faq.isVisible ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" />
                              Show
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-950/40"
                          onClick={() => openEditDialog(faq)}
                          title="Edit FAQ"
                        >
                          <Edit3 className="h-4 w-4" />
                          <span className="sr-only">Edit FAQ</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDeleteTarget(faq)}
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
      </Card>

      {/* Create / Edit FAQ Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingFaq ? 'Edit FAQ' : 'Create New FAQ'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {editingFaq
                ? 'Update the FAQ question, answer, and visibility settings.'
                : 'Add a new frequently asked question to display on the user help page.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Question *</label>
              <Input
                placeholder="e.g. How do I upgrade my storage quota?"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Answer *</label>
              <Textarea
                placeholder="Write the detailed answer here..."
                rows={5}
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Display Order</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                />
                <span className="text-[11px] text-slate-400">Lower numbers appear first</span>
              </div>

              <div className="space-y-1.5 pt-6">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700">
                  <Checkbox
                    checked={formData.isVisible}
                    onCheckedChange={(checked) => setFormData({ ...formData, isVisible: Boolean(checked) })}
                  />
                  <span>Visible to users</span>
                </label>
                <p className="text-[11px] text-slate-400 pl-6">Uncheck to draft/hide</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingFaq
                  ? (updateMutation.isPending ? 'Saving...' : 'Save Changes')
                  : (createMutation.isPending ? 'Creating...' : 'Create FAQ')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-600 mb-1">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Delete FAQ</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 pt-2 text-sm leading-relaxed">
              Are you sure you want to permanently delete this FAQ:
              <br />
              <span className="font-semibold text-slate-900 block mt-1">"{deleteTarget?.question}"</span>
              <br />
              This action cannot be undone.
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
                  deleteMutation.mutate(deleteTarget.faqId);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete FAQ'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
