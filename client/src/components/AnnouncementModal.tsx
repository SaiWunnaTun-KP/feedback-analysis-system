import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { announcementsApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Bell,
  ArrowRight,
  Clock,
  ArrowRightCircle,
  Sliders,
} from 'lucide-react';

interface Announcement {
  announcementId: number;
  planId?: number | null;
  action: 'created' | 'edited' | 'activated' | 'deactivated' | 'deleted';
  title: string;
  message: string;
  createdAt: string;
}

interface ParsedContent {
  sectionTitle: string;
  badgeLabel: string;
  leadDescription: string;
  changesList: { label: string; oldVal?: string; newVal?: string; raw: string }[];
  scheduleDate?: string;
  transitionInfo?: string;
  warningText?: string;
  remainingText: string;
}

function parseAnnouncementContent(action: string, rawMessage: string): ParsedContent {
  let message = rawMessage || '';
  let warningText = '';

  // Extract warning if present
  const warningMatch = message.match(/Warning:\s*([\s\S]*?)(?:\n\n|$)/i);
  if (warningMatch) {
    warningText = warningMatch[0].trim();
    message = message.replace(warningMatch[0], '').trim();
  }

  // 1. First: Title / Status badge
  let sectionTitle = 'Subscription Update';
  let badgeLabel = 'Notice';
  if (action === 'edited') {
    sectionTitle = 'Plan Changes Summary';
    badgeLabel = 'Changes';
  } else if (action === 'deactivated') {
    sectionTitle = 'Plan Deactivation Notice';
    badgeLabel = 'Deactivated';
  } else if (action === 'activated') {
    sectionTitle = 'Plan Reactivation';
    badgeLabel = 'Reactivated';
  } else if (action === 'created') {
    sectionTitle = 'New Plan Available';
    badgeLabel = 'New Release';
  } else if (action === 'deleted') {
    sectionTitle = 'Plan Discontinued';
    badgeLabel = 'Removed';
  }

  // 2. Second: Full Description & Structured Details
  let leadDescription = '';
  const changesList: { label: string; oldVal?: string; newVal?: string; raw: string }[] = [];
  let scheduleDate = '';
  let transitionInfo = '';
  let remainingText = '';

  const lines = message.split('\n').map((l) => l.trim()).filter(Boolean);

  if (action === 'edited') {
    // Line 1: e.g. "Your current plan “...” has been updated."
    leadDescription = lines[0] || 'Your current subscription plan has been modified.';

    // Look for Changes: line
    const changesLine = lines.find((l) => l.startsWith('Changes:'));
    if (changesLine) {
      const changesContent = changesLine.replace(/^Changes:\s*/, '');
      // Match changes e.g. Name (from "Silver Tier" to "Super Silver Tier"), Price (from $29.99 to $34.99)
      const regex = /([^,(]+(?:\([^)]*\))?)/g;
      const matches = changesContent.match(regex) || [changesContent];

      for (const m of matches) {
        const item = m.trim().replace(/^,\s*/, '');
        if (!item) continue;
        const changeMatch = item.match(/^(.*?)\s*\(from\s+(.*?)\s+to\s+(.*?)\)$/i);
        if (changeMatch) {
          changesList.push({
            label: changeMatch[1].trim(),
            oldVal: changeMatch[2].trim(),
            newVal: changeMatch[3].trim(),
            raw: item,
          });
        } else {
          changesList.push({
            label: item,
            raw: item,
          });
        }
      }
    }

    // Remaining text: e.g. "Please review your subscription."
    const otherLines = lines.filter((l, idx) => idx > 0 && !l.startsWith('Changes:'));
    remainingText =
      otherLines.join(' ') ||
      'Please review your active subscription settings to verify your updated quota and billing.';
  } else if (action === 'deactivated') {
    leadDescription = lines[0] || 'Your subscription plan has been deactivated.';

    // Extract access date
    const accessLine = lines.find((l) => l.toLowerCase().includes('until'));
    if (accessLine) {
      const dateMatch = accessLine.match(/until\s+([^.]+)/i);
      if (dateMatch) {
        scheduleDate = dateMatch[1].trim();
      }
    }

    // Extract transition info
    const transLine = lines.find(
      (l) => l.toLowerCase().includes('free plan') || l.toLowerCase().includes('after that date')
    );
    if (transLine) {
      transitionInfo = transLine;
    }

    remainingText =
      'You will keep full uninterrupted access to your datasets, reports, and quota until your access period ends. You can switch to any other active plan at any time.';
  } else {
    leadDescription = lines[0] || message;
    remainingText =
      lines.slice(1).join(' ') ||
      'Visit the subscriptions page to see all currently active options and storage capacities.';
  }

  return {
    sectionTitle,
    badgeLabel,
    leadDescription,
    changesList,
    scheduleDate,
    transitionInfo,
    warningText,
    remainingText,
  };
}

export function AnnouncementModal() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch oldest unseen announcement for current user (Retail Managers only)
  const { data } = useQuery({
    queryKey: ['unseenAnnouncement'],
    queryFn: announcementsApi.getUnseen,
    enabled: !!isAuthenticated && user?.role === 'RETAIL_MANAGER',
    staleTime: 1000 * 60, // 1 minute
  });

  const announcement: Announcement | null = data?.announcement || null;

  useEffect(() => {
    if (announcement && user?.role === 'RETAIL_MANAGER') {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [announcement, user?.role]);

  const markSeenMutation = useMutation({
    mutationFn: (id: number) => announcementsApi.markSeen(id),
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['unseenAnnouncement'] });
    },
  });

  if (!isAuthenticated || user?.role !== 'RETAIL_MANAGER' || !announcement) {
    return null;
  }

  const handleGotIt = () => {
    markSeenMutation.mutate(announcement.announcementId);
  };

  const handleViewPlans = () => {
    markSeenMutation.mutate(announcement.announcementId);
    if (user?.role === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate('/dashboard/subscriptions');
    }
  };

  // Icon and badge styling based on announcement action
  const getActionBadge = () => {
    switch (announcement.action) {
      case 'created':
        return {
          icon: Sparkles,
          color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400',
        };
      case 'edited':
        return {
          icon: Sliders,
          color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-400',
        };
      case 'activated':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400',
        };
      case 'deactivated':
        return {
          icon: AlertTriangle,
          color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400',
        };
      case 'deleted':
        return {
          icon: Trash2,
          color: 'text-rose-600 bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400',
        };
      default:
        return {
          icon: Bell,
          color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-400',
        };
    }
  };

  const badgeInfo = getActionBadge();
  const IconComponent = badgeInfo.icon;
  const parsed = parseAnnouncementContent(announcement.action, announcement.message);

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleGotIt();
        }
      }}
    >
      <DialogContent className="max-w-md sm:max-w-lg p-6 rounded-2xl shadow-2xl border-border bg-card">
        <DialogHeader className="space-y-4">
          {/* Header Title Area */}
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${badgeInfo.color}`}>
              <IconComponent size={22} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                {announcement.title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Subscription Plan Announcement
              </p>
            </div>
          </div>

          {/* =========================================================================
              MODAL BODY DIVIDED INTO 3 CLEAR SECTIONS (Absorbable at a glance)
             ========================================================================= */}
          <div className="space-y-3.5 pt-1 text-left">
            {/* FIRST: Title / Action Category Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-muted/60 border border-border/80">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-semibold text-xs px-2.5 py-0.5 border-primary/30 text-primary bg-primary/5 uppercase tracking-wide"
                >
                  {parsed.badgeLabel}
                </Badge>
                <span className="text-xs font-semibold text-foreground">
                  {parsed.sectionTitle}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">Action Required: Review</span>
            </div>

            {/* SECOND: Full Description & Highlighted Breakdown */}
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs space-y-3">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {parsed.leadDescription}
              </p>

              {/* If Plan was Edited: Individual visual cards for each changed field */}
              {parsed.changesList.length > 0 && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Changes Applied:
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {parsed.changesList.map((ch, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border/80 text-xs gap-2"
                      >
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {ch.label}
                        </span>
                        {ch.oldVal && ch.newVal ? (
                          <div className="flex items-center gap-2 font-mono">
                            <span className="line-through text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-[11px]">
                              {ch.oldVal}
                            </span>
                            <span className="text-primary font-bold">➔</span>
                            <span className="font-bold text-foreground bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 text-[11px]">
                              {ch.newVal}
                            </span>
                          </div>
                        ) : (
                          <span className="font-medium text-foreground">{ch.raw}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* If Plan was Deactivated: Timeline & Transition Schedule Cards */}
              {(parsed.scheduleDate || parsed.transitionInfo) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {parsed.scheduleDate && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                        <Clock size={14} />
                        <span>Full Access Until</span>
                      </div>
                      <p className="text-sm font-extrabold text-foreground tracking-tight">
                        {parsed.scheduleDate}
                      </p>
                    </div>
                  )}

                  {parsed.transitionInfo && (
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-400">
                        <ArrowRightCircle size={14} />
                        <span>Next Status</span>
                      </div>
                      <p className="text-xs font-semibold text-foreground">
                        Moved to Free Plan
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Quota Reduced Warning (if present) */}
              {parsed.warningText && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs space-y-1 text-rose-900 dark:text-rose-200">
                  <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400">
                    <AlertTriangle size={15} />
                    <span>Storage Exceeded Notice</span>
                  </div>
                  <p className="leading-relaxed">
                    {parsed.warningText.replace(/^Warning:\s*/i, '')}
                  </p>
                </div>
              )}
            </div>

            {/* THIRD: Remaining Text / Guidance (Easy to read note) */}
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-start gap-2.5">
              <Info size={16} className="text-muted-foreground shrink-0 mt-0.5" />
              <div className="space-y-0.5 text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground block">
                  Important Guidance
                </span>
                <p>{parsed.remainingText}</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-border/70 mt-2">
          {user?.role === 'RETAIL_MANAGER' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewPlans}
              className="text-primary hover:text-primary hover:bg-primary/10 rounded-xl"
            >
              View Plans
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}

          <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
            <Button
              onClick={handleGotIt}
              disabled={markSeenMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 rounded-xl w-full sm:w-auto"
            >
              {markSeenMutation.isPending ? 'Marking...' : 'Got it'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
