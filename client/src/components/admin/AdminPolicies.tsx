import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { policiesApi } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  FileText,
  Shield,
  Upload,
  Save,
  Eye,
  Edit3,
  Columns,
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Minus,
  RotateCcw,
  Clock,
  Sparkles
} from 'lucide-react';

type PolicyType = 'terms' | 'privacy';

export default function AdminPolicies() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<PolicyType>('terms');
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Form states per tab
  const [termsContent, setTermsContent] = useState('');
  const [termsVersion, setTermsVersion] = useState('1.0');
  const [privacyContent, setPrivacyContent] = useState('');
  const [privacyVersion, setPrivacyVersion] = useState('1.0');

  const { data: response, isLoading } = useQuery({
    queryKey: ['policies'],
    queryFn: policiesApi.getAll,
  });

  const policiesData = response?.data;

  // Sync state when data loads
  useEffect(() => {
    if (policiesData) {
      if (policiesData.terms) {
        setTermsContent(policiesData.terms.content || '');
        setTermsVersion(policiesData.terms.version || '1.0');
      }
      if (policiesData.privacy) {
        setPrivacyContent(policiesData.privacy.content || '');
        setPrivacyVersion(policiesData.privacy.version || '1.0');
      }
    }
  }, [policiesData]);

  const currentContent = activeTab === 'terms' ? termsContent : privacyContent;
  const currentVersion = activeTab === 'terms' ? termsVersion : privacyVersion;
  const currentPolicyData = activeTab === 'terms' ? policiesData?.terms : policiesData?.privacy;

  const setCurrentContent = (val: string) => {
    if (activeTab === 'terms') {
      setTermsContent(val);
    } else {
      setPrivacyContent(val);
    }
  };

  const setCurrentVersion = (val: string) => {
    if (activeTab === 'terms') {
      setTermsVersion(val);
    } else {
      setPrivacyVersion(val);
    }
  };

  // Mutation to save
  const updateMutation = useMutation({
    mutationFn: ({ type, content, version }: { type: PolicyType; content: string; version: string }) =>
      policiesApi.update(type, {
        title: type === 'terms' ? 'Terms of Service' : 'Privacy Policy',
        content,
        version,
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success(res.message || 'Policy published successfully!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update policy');
    },
  });

  const handleSave = () => {
    if (!currentContent.trim()) {
      toast.error('Policy content cannot be empty');
      return;
    }
    updateMutation.mutate({
      type: activeTab,
      content: currentContent,
      version: currentVersion || '1.0',
    });
  };

  // File import (.md or .txt)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      toast.error('Only Markdown (.md) or Text (.txt) files can be imported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        setCurrentContent(text);
        toast.success(`Imported "${file.name}" into editor! Remember to click Publish.`);
      }
    };
    reader.onerror = () => {
      toast.error('Error reading the uploaded file.');
    };
    reader.readAsText(file);

    // Reset input so same file can be re-imported if needed
    e.target.value = '';
  };

  // Helper to insert markdown syntax at cursor
  const insertMarkdown = (prefix: string, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = currentContent.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;

    const newContent =
      currentContent.substring(0, start) + replacement + currentContent.substring(end);
    setCurrentContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  const handleResetToSaved = () => {
    if (activeTab === 'terms' && policiesData?.terms) {
      setTermsContent(policiesData.terms.content || '');
      setTermsVersion(policiesData.terms.version || '1.0');
      toast.info('Reset to last saved version.');
    } else if (activeTab === 'privacy' && policiesData?.privacy) {
      setPrivacyContent(policiesData.privacy.content || '');
      setPrivacyVersion(policiesData.privacy.version || '1.0');
      toast.info('Reset to last saved version.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Manage Terms & Policies</h2>
          <p className="text-muted-foreground">Edit, import, and publish legal documents for retail managers.</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".md,.txt"
            className="hidden"
          />

          <Button
            variant="outline"
            className="gap-2 bg-card border-border hover:bg-accent text-foreground"
            onClick={() => fileInputRef.current?.click()}
            title="Import an existing .md or .txt file into the editor"
          >
            <Upload className="h-4 w-4" />
            Import File
          </Button>

          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Publishing...' : 'Publish Changes'}
          </Button>
        </div>
      </div>

      {/* Tabs and Meta Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-muted/40 p-2 rounded-xl border border-border">
        {/* Document Switcher Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'terms'
                ? 'bg-background text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <FileText className="h-4 w-4" />
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-background text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            }`}
          >
            <Shield className="h-4 w-4" />
            Privacy Policy
          </button>
        </div>

        {/* Version & View Mode Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Updated:{' '}
              {currentPolicyData?.updatedAt
                ? new Date(currentPolicyData.updatedAt).toLocaleDateString()
                : 'Never'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground">Version:</span>
            <Input
              value={currentVersion}
              onChange={(e) => setCurrentVersion(e.target.value)}
              className="h-8 w-16 text-xs font-mono text-center px-1 bg-background border-border text-foreground"
              placeholder="1.0"
            />
          </div>

          <div className="h-5 w-px bg-border hidden sm:block" />

          {/* View Mode Toggle */}
          <div className="flex items-center bg-card rounded-lg border border-border p-0.5">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'edit'
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Editor only"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer hidden md:block ${
                viewMode === 'split'
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Split View"
            >
              <Columns className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
              title="Preview only"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Editor & Preview Area */}
      <Card className="shadow-sm border-border overflow-hidden bg-card">
        {/* Formatting Toolbar (shown when editing) */}
        {viewMode !== 'preview' && (
          <div className="px-4 py-2 border-b border-border bg-muted/40 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => insertMarkdown('# ', '', 'Heading 1')}
                className="flex items-center justify-center h-8 w-8 rounded-md bg-background/80 hover:bg-accent text-foreground border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-2xs font-semibold"
                title="Heading 1"
              >
                <Heading1 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('## ', '', 'Heading 2')}
                className="flex items-center justify-center h-8 w-8 rounded-md bg-background/80 hover:bg-accent text-foreground border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-2xs font-semibold"
                title="Heading 2"
              >
                <Heading2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('### ', '', 'Heading 3')}
                className="flex items-center justify-center h-8 w-8 rounded-md bg-background/80 hover:bg-accent text-foreground border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-2xs font-semibold"
                title="Heading 3"
              >
                <Heading3 className="h-4 w-4" />
              </button>

              <div className="h-5 w-px bg-border mx-1" />

              <button
                type="button"
                onClick={() => insertMarkdown('**', '**', 'bold text')}
                className="flex items-center justify-center h-8 w-8 rounded-md bg-background/80 hover:bg-accent text-foreground border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
                title="Bold"
              >
                <Bold className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('*', '*', 'italic text')}
                className="flex items-center justify-center h-8 w-8 rounded-md bg-background/80 hover:bg-accent text-foreground border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
                title="Italic"
              >
                <Italic className="h-4 w-4" />
              </button>

              <div className="h-5 w-px bg-border mx-1" />

              <button
                type="button"
                onClick={() => insertMarkdown('- ', '', 'List item')}
                className="flex items-center justify-center h-8 w-8 rounded-md bg-background/80 hover:bg-accent text-foreground border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
                title="Bullet List"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('1. ', '', 'First item')}
                className="flex items-center justify-center h-8 w-8 rounded-md bg-background/80 hover:bg-accent text-foreground border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
                title="Numbered List"
              >
                <ListOrdered className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('> ', '', 'Important note or quote')}
                className="flex items-center justify-center h-8 w-8 rounded-md bg-background/80 hover:bg-accent text-foreground border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
                title="Blockquote"
              >
                <Quote className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => insertMarkdown('\n---\n\n')}
                className="flex items-center justify-center h-8 w-8 rounded-md bg-background/80 hover:bg-accent text-foreground border border-border/80 hover:border-primary/50 transition-all cursor-pointer shadow-2xs"
                title="Horizontal Divider"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
              <span className="font-mono bg-background/60 px-2 py-1 rounded border border-border/60 text-foreground font-medium">
                {currentContent.length} chars
              </span>
              <button
                type="button"
                onClick={handleResetToSaved}
                className="flex items-center gap-1 font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer px-2 py-1 rounded hover:bg-destructive/10"
                title="Discard unsaved edits and reset"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>
          </div>
        )}

        {/* Content Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border min-h-[550px]">
          {/* Editor Column */}
          {viewMode !== 'preview' && (
            <div className={`p-4 flex flex-col ${viewMode === 'edit' ? 'md:col-span-2' : ''}`}>
              <textarea
                ref={textareaRef}
                value={currentContent}
                onChange={(e) => setCurrentContent(e.target.value)}
                placeholder="Type your policy content in Markdown here or use the Import File button..."
                className="flex-1 w-full h-[520px] p-3 text-sm font-mono bg-transparent outline-none resize-none leading-relaxed text-foreground"
                spellCheck={false}
              />
            </div>
          )}

          {/* Preview Column */}
          {viewMode !== 'edit' && (
            <div
              className={`p-6 overflow-y-auto max-h-[580px] bg-card text-card-foreground ${
                viewMode === 'preview' ? 'md:col-span-2' : ''
              }`}
            >
              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed space-y-4">
                <ReactMarkdown
                  components={{
                    h1: ({ node, ...props }) => (
                      <h1 className="text-2xl font-bold tracking-tight text-foreground border-b border-border pb-2 mt-2 mb-4" {...props} />
                    ),
                    h2: ({ node, ...props }) => (
                      <h2 className="text-xl font-bold tracking-tight text-foreground mt-6 mb-3" {...props} />
                    ),
                    h3: ({ node, ...props }) => (
                      <h3 className="text-base font-semibold text-foreground mt-4 mb-2" {...props} />
                    ),
                    p: ({ node, ...props }) => (
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground my-3" {...props} />
                    ),
                    ol: ({ node, ...props }) => (
                      <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground my-3" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li className="text-sm text-muted-foreground" {...props} />
                    ),
                    blockquote: ({ node, ...props }) => (
                      <blockquote className="border-l-4 border-primary/50 pl-4 py-1 italic my-3 text-sm text-muted-foreground bg-primary/5 rounded-r" {...props} />
                    ),
                    hr: ({ node, ...props }) => (
                      <hr className="my-6 border-border" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold text-foreground" {...props} />
                    ),
                  }}
                >
                  {currentContent || '*No content to preview. Type above or import a file.*'}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
