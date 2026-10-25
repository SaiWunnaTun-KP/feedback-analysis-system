import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi, plansApi } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Crown, CheckCircle2, CreditCard, Receipt, ChevronDown, ChevronUp, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { PaymentModal } from '../../components/PaymentModal';

export default function Subscriptions() {
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [showAllPlans, setShowAllPlans] = React.useState(false);
  const [invoicePage, setInvoicePage] = React.useState(1);
  const invoiceLimit = 10;
  const invoiceOffset = (invoicePage - 1) * invoiceLimit;

  const queryClient = useQueryClient();

  const { data: mySub, isLoading: loadingSub } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: subscriptionsApi.getMe,
  });

  const { data: plans = [], isLoading: loadingPlans } = useQuery<any[]>({
    queryKey: ['plans'],
    queryFn: () => plansApi.getAll(),
  });

  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', { page: invoicePage, limit: invoiceLimit, offset: invoiceOffset }],
    queryFn: () => subscriptionsApi.getInvoices({ page: invoicePage, limit: invoiceLimit, offset: invoiceOffset }),
  });

  const invoices: any[] = Array.isArray(invoicesData)
    ? invoicesData
    : (invoicesData?.invoices || []);

  const invoicePagination = invoicesData?.pagination || {
    total: invoices.length,
    page: invoicePage,
    limit: invoiceLimit,
    offset: invoiceOffset,
    totalPages: Math.ceil((invoicesData?.pagination?.total ?? invoices.length) / invoiceLimit) || 1,
  };

  const purchaseMutation = useMutation({
    mutationFn: subscriptionsApi.create,
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
      setIsModalOpen(true);
    },
    onError: (error: any) => toast.error(error.message)
  });

  const cancelMutation = useMutation({
    mutationFn: subscriptionsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
      toast.success('Subscription canceled successfully.');
    },
    onError: (error: any) => toast.error(error.message)
  });

  const { subscription, plan: currentPlan, hasUsedFreeTrial } = mySub || {};
  const isFreeTier = !subscription && !hasUsedFreeTrial;

  const sortedPlans = React.useMemo(() => {
    if (!currentPlan) return plans;
    const current = plans.filter((p: any) => p.id === currentPlan.id);
    const others = plans.filter((p: any) => p.id !== currentPlan.id);
    return [...current, ...others];
  }, [plans, currentPlan]);

  const visiblePlans = showAllPlans ? sortedPlans : sortedPlans.slice(0, 3);

  if (loadingSub || loadingPlans) {
    return <div className="p-8 text-center text-slate-500">Loading subscriptions...</div>;
  }

  const handlePaymentSuccess = async () => {
    setIsModalOpen(false);
    toast.info('Syncing subscription status...');
    await subscriptionsApi.sync();
    queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    toast.success('Subscription is now active!');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Subscription & Plans</h1>
        <p className="text-slate-500">Manage your active plan and billing history.</p>
      </div>

      {/* Current Plan Details */}
      <Card className="shadow-sm border-slate-200/50 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-medium text-slate-300">Current Active Plan</h3>
              </div>
              <div className="text-4xl font-bold text-white flex items-center gap-3">
                {currentPlan ? currentPlan.name : (isFreeTier ? 'Free Trial' : 'No Active Plan')}
                {currentPlan && <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/20">Active</Badge>}
              </div>
              {subscription && (
                <p className="text-slate-400 mt-2">
                  Renews automatically on <span className="text-slate-200 font-medium">{new Date(subscription.endDate).toLocaleDateString()}</span>
                </p>
              )}
            </div>
            {subscription && (
              <Button 
                variant="secondary" 
                className="bg-white text-slate-900 hover:bg-slate-100"
                onClick={() => {
                  if (confirm('Are you sure you want to cancel your subscription?')) {
                    cancelMutation.mutate();
                  }
                }}
                disabled={cancelMutation.isPending || subscription.status === 'CANCELED'}
              >
                {cancelMutation.isPending ? 'Canceling...' : 'Cancel Subscription'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Available Plans</h2>
            <p className="text-sm text-slate-500">
              {plans.length > 3 && !showAllPlans 
                ? `Showing top 3 of ${plans.length} available plans` 
                : 'Choose the plan that fits your retail feedback analysis needs'}
            </p>
          </div>
          {plans.length > 3 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowAllPlans(!showAllPlans)}
              className="gap-1.5 text-xs font-medium self-start sm:self-auto"
            >
              {showAllPlans ? (
                <>
                  <span>Show Less</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>View All Plans ({plans.length})</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visiblePlans.map((p: any) => (
            <Card key={p.id} className={`shadow-sm border-slate-200/50 relative overflow-hidden transition-all hover:shadow-md ${currentPlan?.id === p.id ? 'ring-2 ring-blue-600' : ''}`}>
              {currentPlan?.id === p.id && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                  CURRENT
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  {p.name}
                </CardTitle>
                <CardDescription>Best for retail analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-bold text-slate-900">
                  ${p.price} <span className="text-sm font-normal text-slate-500">/ {p.durationDays} days</span>
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    {p.maxStorageMb} MB Storage Quota
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Priority Support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Advanced Export Options
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={currentPlan?.id === p.id ? "outline" : "default"}
                  disabled={currentPlan?.id === p.id || purchaseMutation.isPending}
                  onClick={() => purchaseMutation.mutate(p.id)}
                >
                  {currentPlan?.id === p.id ? 'Active Plan' : 'Purchase / Upgrade'}
                </Button>
              </CardFooter>
            </Card>
          ))}
          {visiblePlans.length === 0 && (
            <p className="text-slate-500 italic">No plans available at the moment.</p>
          )}
        </div>

        {plans.length > 3 && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllPlans(!showAllPlans)}
              className="gap-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
            >
              {showAllPlans ? (
                <>
                  <span>Show Less</span>
                  <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  <span>View all {plans.length} available plans</span>
                  <ChevronDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Billing History */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-slate-500" /> Billing History
        </h2>
        <Card className="shadow-sm border-slate-200/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-16 text-center font-semibold">No.</TableHead>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingInvoices ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-6">Loading billing history...</TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-slate-500 py-6">No billing history found.</TableCell>
                </TableRow>
              ) : (
                invoices.map((inv: any, index: number) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-center font-mono text-xs font-medium text-slate-500">
                      {(invoicePagination.offset || 0) + index + 1}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{inv.number}</TableCell>
                    <TableCell className="text-slate-500">{new Date(inv.created * 1000).toLocaleDateString()}</TableCell>
                    <TableCell className="text-slate-700">{inv.lines?.data[0]?.plan?.nickname || 'Subscription'}</TableCell>
                    <TableCell className="text-slate-900">${(inv.amount_paid / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={inv.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.hosted_invoice_url ? (
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => window.open(inv.hosted_invoice_url, '_blank')}>
                          PDF
                        </Button>
                      ) : (
                        <span className="text-slate-400 text-sm">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Invoice Pagination Bar */}
          {invoicePagination.total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t border-slate-200 gap-4 bg-slate-50/50">
              <div className="text-sm text-slate-500">
                Showing <span className="font-semibold text-slate-900">{invoicePagination.total === 0 ? 0 : (invoicePagination.offset || 0) + 1}</span> to{' '}
                <span className="font-semibold text-slate-900">{Math.min((invoicePagination.offset || 0) + invoicePagination.limit, invoicePagination.total)}</span> of{' '}
                <span className="font-semibold text-slate-900">{invoicePagination.total}</span> invoices
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setInvoicePage(1)}
                  disabled={invoicePage <= 1 || loadingInvoices}
                  className="h-8 w-8 text-slate-600 hover:text-slate-900"
                  title="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                  <span className="sr-only">First page</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setInvoicePage(p => Math.max(1, p - 1))}
                  disabled={invoicePage <= 1 || loadingInvoices}
                  className="h-8 w-8 text-slate-600 hover:text-slate-900"
                  title="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Previous page</span>
                </Button>
                <span className="text-xs font-semibold px-3 py-1.5 bg-white rounded-md text-slate-700 border border-slate-200 shadow-xs select-none">
                  Page {invoicePagination.page} of {invoicePagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setInvoicePage(p => Math.min(invoicePagination.totalPages, p + 1))}
                  disabled={invoicePage >= invoicePagination.totalPages || loadingInvoices}
                  className="h-8 w-8 text-slate-600 hover:text-slate-900"
                  title="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Next page</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setInvoicePage(invoicePagination.totalPages)}
                  disabled={invoicePage >= invoicePagination.totalPages || loadingInvoices}
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
      </div>

      <PaymentModal 
        clientSecret={clientSecret} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handlePaymentSuccess} 
      />
    </div>
  );
}
