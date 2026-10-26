import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { policiesApi } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Shield,
  Printer,
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface PoliciesViewProps {
  initialTab?: 'terms' | 'privacy';
  isEmbedded?: boolean; // When rendered inside dashboard vs standalone public page
}

export default function PoliciesView({ initialTab = 'terms', isEmbedded = false }: PoliciesViewProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryTab = searchParams.get('tab') as 'terms' | 'privacy' | null;
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(queryTab || initialTab);

  useEffect(() => {
    if (queryTab === 'terms' || queryTab === 'privacy') {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  const handleTabChange = (tab: 'terms' | 'privacy') => {
    setActiveTab(tab);
    setSearchParams({ tab });
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  };

  const { data: response, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: policiesApi.getAll,
  });

  const policies = response?.data;
  const currentPolicy = activeTab === 'terms' ? policies?.terms : policies?.privacy;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className={`space-y-6 ${!isEmbedded ? 'max-w-5xl mx-auto py-10 px-4 sm:px-6' : ''}`}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              {activeTab === 'terms' ? <FileText className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Legal & Compliance
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {activeTab === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Official platform guidelines, data governance standards, and service commitments.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-2 bg-card border-border"
            title="Copy document link"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Copy Link</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2 bg-card border-border"
            title="Print document"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">Print</span>
          </Button>
        </div>
      </div>

      {/* Tabs & Meta Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2 bg-card rounded-2xl border border-border shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange('terms')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <FileText className="h-4 w-4" />
            Terms of Service
          </button>
          <button
            onClick={() => handleTabChange('privacy')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            <Shield className="h-4 w-4" />
            Privacy Policy
          </button>
        </div>

        {/* Status & Version Badges */}
        <div className="flex items-center gap-3 px-3">
          {currentPolicy?.version && (
            <Badge variant="outline" className="border-border text-muted-foreground text-xs font-mono">
              v{currentPolicy.version}
            </Badge>
          )}

          {currentPolicy?.updatedAt && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground/80" />
              Effective: {new Date(currentPolicy.updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Reader Card */}
      <Card className="p-8 sm:p-12 shadow-sm border-border bg-card text-card-foreground rounded-2xl">
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            Loading document...
          </div>
        ) : (
          <article className="prose dark:prose-invert max-w-none text-foreground">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-3xl font-extrabold tracking-tight text-foreground border-b border-border pb-4 mt-2 mb-6" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-2xl font-bold tracking-tight text-foreground mt-8 mb-4 flex items-center gap-2" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-lg font-bold text-foreground mt-6 mb-3" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-4" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-muted-foreground my-4 pl-2" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base text-muted-foreground my-4 pl-2" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="leading-relaxed text-muted-foreground" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-primary pl-4 py-2 italic my-4 text-muted-foreground bg-primary/5 rounded-r" {...props} />
                ),
                hr: ({ node, ...props }) => (
                  <hr className="my-8 border-border" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-semibold text-foreground" {...props} />
                ),
              }}
            >
              {currentPolicy?.content || '# Document Not Found\n\nPlease check back soon or contact support.'}
            </ReactMarkdown>
          </article>
        )}
      </Card>
    </div>
  );
}
