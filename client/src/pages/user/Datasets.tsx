import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { datasetsApi } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  FileClock, 
  CheckCircle2, 
  Download, 
  Trash2, 
  ArrowRight, 
  Loader2, 
  AlertCircle,
  FileCheck2,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight
} from 'lucide-react';
import { Link } from 'react-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Datasets() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const offset = (currentPage - 1) * itemsPerPage;

  const { data: responseData, isLoading: loadingDatasets } = useQuery({
    queryKey: ['datasets', { page: currentPage, limit: itemsPerPage, offset }],
    queryFn: () => datasetsApi.get({ page: currentPage, limit: itemsPerPage, offset }),
  });

  const datasets: any[] = Array.isArray(responseData)
    ? responseData
    : (responseData?.datasets || []);

  const pagination = responseData?.pagination || {
    total: datasets.length,
    page: currentPage,
    limit: itemsPerPage,
    offset: offset,
    totalPages: Math.ceil((responseData?.pagination?.total ?? datasets.length) / itemsPerPage) || 1,
  };

  const uploadMutation = useMutation({
    mutationFn: datasetsApi.upload,
    onSuccess: () => {
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
      setSelectedFile(null);
      setAgreedToTerms(false);
      setAttemptedSubmit(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Dataset uploaded and analysis started!');
    },
    onError: (error: any) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => datasetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
      if (datasets.length === 1 && currentPage > 1) {
        setCurrentPage(p => Math.max(1, p - 1));
      }
      toast.success('Dataset and associated analysis data deleted successfully.');
    },
    onError: (error: any) => toast.error(error.message || 'Failed to delete dataset')
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (uploadMutation.isPending) return;

    if (!selectedFile || !agreedToTerms) {
      setAttemptedSubmit(true);
      if (!selectedFile && !agreedToTerms) {
        toast.error('Please select a CSV file and acknowledge the format requirements before uploading.');
      } else if (!selectedFile) {
        toast.error('Please select a CSV file to upload.');
      } else {
        toast.error('Please confirm the format acknowledgment before uploading.');
      }
      return;
    }

    setAttemptedSubmit(false);
    uploadMutation.mutate(selectedFile);
  };

  const downloadTemplate = () => {
    const csvContent = "Product_Name,Review_Text\nSample Product,This is a great product!";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Feedback_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadingDatasets && !responseData) {
    return <div className="p-8 text-center text-slate-500">Loading datasets...</div>;
  }

  const isFileMissing = attemptedSubmit && !selectedFile;
  const isTermsMissing = attemptedSubmit && !agreedToTerms;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dataset Management</h1>
        <p className="text-slate-500">Upload new CSV files and manage previously uploaded datasets.</p>
      </div>

      {/* File Upload Zone */}
      <Card className="shadow-sm border-slate-200/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-blue-600" />
              Upload New Dataset
            </CardTitle>
            <CardDescription>Drag & drop or browse for a CSV file. Max 75MB depending on your plan.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" />
            Download Template
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          
          {/* Dropzone Container */}
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              uploadMutation.isPending
                ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200'
                : isFileMissing
                ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-200/60 cursor-pointer'
                : selectedFile
                ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/40 cursor-default'
                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 cursor-pointer'
            }`} 
            onClick={() => !uploadMutation.isPending && !selectedFile && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileSelect}
              disabled={uploadMutation.isPending}
            />
            {!selectedFile ? (
              <div className="space-y-3 pointer-events-none">
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  isFileMissing ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {isFileMissing ? <AlertCircle className="h-6 w-6" /> : <FileSpreadsheet className="h-6 w-6" />}
                </div>
                <div>
                  <Button 
                    type="button"
                    variant="secondary" 
                    className="pointer-events-auto" 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    disabled={uploadMutation.isPending}
                  >
                    Browse Files
                  </Button>
                  <p className="mt-2 text-sm text-slate-600">or drag and drop your file here</p>
                </div>
                {isFileMissing && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center justify-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Please select a CSV file before submitting.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 pointer-events-none">
                <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  className="pointer-events-auto text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200" 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedFile(null); 
                    if (fileInputRef.current) fileInputRef.current.value = ''; 
                  }}
                  disabled={uploadMutation.isPending}
                >
                  Remove file
                </Button>
              </div>
            )}
          </div>

          {/* High-Visibility Format Acknowledgment Card */}
          <div 
            onClick={() => !uploadMutation.isPending && setAgreedToTerms(!agreedToTerms)}
            className={`relative rounded-xl border-2 p-4 transition-all cursor-pointer select-none ${
              uploadMutation.isPending
                ? 'opacity-60 pointer-events-none bg-slate-50 border-slate-200'
                : agreedToTerms
                ? 'border-emerald-400 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-400/20'
                : isTermsMissing
                ? 'border-rose-400 bg-rose-50/60 ring-2 ring-rose-300/40'
                : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-blue-50/20'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <Checkbox 
                id="terms" 
                checked={agreedToTerms} 
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)} 
                className={`mt-0.5 h-5 w-5 rounded-md border-2 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600 transition-colors ${
                  isTermsMissing ? 'border-rose-500' : 'border-slate-400'
                }`}
                onClick={(e) => e.stopPropagation()}
                disabled={uploadMutation.isPending}
              />
              <div className="grid gap-1.5 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label htmlFor="terms" className="text-sm font-semibold text-slate-900 cursor-pointer">
                      Format Acknowledgment
                    </label>
                    {agreedToTerms ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-[11px] gap-1 font-medium">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Confirmed
                      </Badge>
                    ) : isTermsMissing ? (
                      <Badge variant="destructive" className="text-[11px] gap-1">
                        <AlertCircle className="h-3 w-3" /> Check required
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] text-blue-700 bg-blue-50 border-blue-200 font-medium">
                        Required before submit
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Click card or checkbox to acknowledge</span>
                </div>
                <p className="text-sm text-slate-600 leading-normal">
                  I confirm that my file is formatted according to the template containing at least <span className="inline-flex px-1.5 py-0.5 rounded font-mono text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">Product_Name</span> and <span className="inline-flex px-1.5 py-0.5 rounded font-mono text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">Review_Text</span> columns.
                </p>
                {isTermsMissing && (
                  <p className="text-xs font-semibold text-rose-600 flex items-center gap-1.5 pt-0.5 animate-in fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Please check this acknowledgment box before uploading.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Upload Progress & Loading Bar Display */}
          {uploadMutation.isPending && (
            <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 p-4.5 space-y-3.5 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Uploading {selectedFile ? `"${selectedFile.name}"` : 'Dataset'}...
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • ` : ''}
                      Transmitting dataset & starting automated sentiment analysis
                    </p>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 animate-pulse text-xs font-medium">
                  Uploading...
                </Badge>
              </div>

              {/* Animated Progress Bar */}
              <div className="space-y-1.5">
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="absolute inset-0 bg-blue-600 rounded-full" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 text-blue-600 font-medium">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
                    Please keep this tab open while upload completes
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">Secure Transfer</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
            <Button 
              className="w-full sm:w-auto font-medium shadow-xs gap-2 min-w-[160px] h-10" 
              disabled={uploadMutation.isPending}
              onClick={handleUpload}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Uploading Dataset...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  <span>Upload Dataset</span>
                </>
              )}
            </Button>

            {/* Checklist Indicator */}
            {!uploadMutation.isPending && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors ${
                  selectedFile 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : isFileMissing
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {selectedFile ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full ${isFileMissing ? 'bg-rose-500' : 'bg-slate-400'}`} />
                  )}
                  1. CSV file {selectedFile ? 'selected' : 'required'}
                </span>

                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-medium transition-colors ${
                  agreedToTerms 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : isTermsMissing
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {agreedToTerms ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full ${isTermsMissing ? 'bg-rose-500' : 'bg-slate-400'}`} />
                  )}
                  2. Format {agreedToTerms ? 'acknowledged' : 'acknowledgment required'}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Datasets Table */}
      <Card className="shadow-sm border-slate-200/50 overflow-hidden">
        <CardHeader>
          <CardTitle>Uploaded Datasets</CardTitle>
          <CardDescription>Manage your previously uploaded files.</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-16 text-center font-semibold">No.</TableHead>
                <TableHead>Filename</TableHead>
                <TableHead>Size (MB)</TableHead>
                <TableHead>Upload Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datasets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    No datasets uploaded yet.
                  </TableCell>
                </TableRow>
              ) : (
                datasets.map((d: any, index: number) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-center font-mono text-xs font-medium text-slate-500">
                      {(pagination.offset || 0) + index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{d.filename}</TableCell>
                    <TableCell className="text-slate-500">{Number(d.fileSizeMb).toFixed(2)} MB</TableCell>
                    <TableCell className="text-slate-500">{new Date(d.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {d.status === 'PENDING' && <Badge variant="secondary">Pending</Badge>}
                      {d.status === 'ANALYSIS_IN_PROGRESS' && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex w-fit items-center gap-1">
                          <FileClock className="h-3 w-3" /> Processing
                        </Badge>
                      )}
                      {d.status === 'COMPLETED' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Completed</Badge>}
                      {d.status === 'FAILED' && <Badge variant="destructive">Failed</Badge>}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {d.status === 'COMPLETED' && (
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" asChild>
                          <Link to={`/dashboard/reports?datasetId=${d.id}`}>
                            View Analysis <ArrowRight className="ml-1 h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-rose-600 hover:bg-rose-50" disabled={deleteMutation.isPending}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the dataset <strong>{d.filename}</strong>, along with all parsed reviews and generated sentiment analysis results from our servers. 
                              The storage quota will be refunded to your account.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700 text-white" onClick={() => deleteMutation.mutate(d.id)}>
                              Yes, delete dataset
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination Bar */}
        {pagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-200 gap-4 bg-slate-50/50">
            <div className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-900">{pagination.total === 0 ? 0 : (pagination.offset || 0) + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">{Math.min((pagination.offset || 0) + pagination.limit, pagination.total)}</span> of{' '}
              <span className="font-semibold text-slate-900">{pagination.total}</span> datasets
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage <= 1 || loadingDatasets}
                className="h-8 w-8 text-slate-600 hover:text-slate-900 border-slate-200 bg-white dark:bg-slate-100"
                title="First page"
              >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">First page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loadingDatasets}
                className="h-8 w-8 text-slate-600 hover:text-slate-900 border-slate-200 bg-white dark:bg-slate-100"
                title="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <span className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-100 rounded-md text-slate-700 border border-slate-200 shadow-xs select-none">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={currentPage >= pagination.totalPages || loadingDatasets}
                className="h-8 w-8 text-slate-600 hover:text-slate-900 border-slate-200 bg-white dark:bg-slate-100"
                title="Next page"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(pagination.totalPages)}
                disabled={currentPage >= pagination.totalPages || loadingDatasets}
                className="h-8 w-8 text-slate-600 hover:text-slate-900 border-slate-200 bg-white dark:bg-slate-100"
                title="Last page"
              >
                <ChevronsRight className="h-4 w-4" />
                <span className="sr-only">Last page</span>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
