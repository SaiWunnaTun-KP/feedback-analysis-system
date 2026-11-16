import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminOverviewApi } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  Users,
  FileSpreadsheet,
  Brain,
  MessageSquareText,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Server,
  Database,
  Cpu,
  CreditCard,
  HardDrive,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const PLAN_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

export default function AdminOverview() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['adminOverview'],
    queryFn: adminOverviewApi.getOverview,
    refetchInterval: 30000, // auto-refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading system overview and Stripe financials...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 text-center bg-destructive/10 border border-destructive/20 rounded-xl space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h3 className="text-lg font-semibold text-destructive">Failed to Load System Overview</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {(error as any)?.message || 'Could not retrieve overview data from server.'}
        </p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    );
  }

  const { financials, metrics, systemHealth } = data || {};

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(val || 0);
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  // Pie chart data for subscription plans
  const planData = (financials?.planDistribution || []).map((p: any) => ({
    name: p.name,
    value: p.subscribersCount,
    monthlyTotal: p.monthlyTotal,
  }));

  return (
    <div className="space-y-8">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time telemetry, platform revenue via Stripe, and microservices health status.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs">
              <CreditCard className="h-4 w-4" />
              Stripe Dashboard
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </a>
        </div>
      </div>

      {/* 1. Summary Cards (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Platform Revenue */}
        <Card className="shadow-xs border-border/80 hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Platform Revenue (Stripe)</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(financials?.totalRevenue)}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                MRR: {formatCurrency(financials?.mrr)}
              </span>
              <span>Bal: {formatCurrency(financials?.availableBalance)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Retail Managers */}
        <Card className="shadow-xs border-border/80 hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Retail Managers</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {metrics?.totalUsers ?? 0}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {metrics?.activeUsers ?? 0} active • {metrics?.suspendedUsers ?? 0} suspended
              </span>
              {(metrics?.newUsersThisMonth ?? 0) > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none">
                  +{metrics.newUsersThisMonth} mo
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Datasets & Reviews Analyzed */}
        <Card className="shadow-xs border-border/80 hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Datasets & AI Processing</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Brain className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {metrics?.totalDatasets ?? 0} <span className="text-sm font-normal text-muted-foreground">datasets</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{metrics?.completedDatasets ?? 0} completed</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                {(metrics?.totalReviewsProcessed ?? 0).toLocaleString()} reviews
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Support Inquiries */}
        <Card className="shadow-xs border-border/80 hover:border-primary/40 transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Support & Feedback</CardTitle>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <MessageSquareText className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              {metrics?.pendingFeedbacks ?? 0}
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400">
                pending
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{metrics?.totalFeedbacks ?? 0} total tickets</span>
              <Link to="/admin/feedbacks" className="text-primary hover:underline font-medium">
                Manage &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Microservices Health Status */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">Microservices Health Matrix</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Updated: {new Date(systemHealth?.lastChecked || Date.now()).toLocaleTimeString()}
            </Badge>
          </div>
          <CardDescription>
            Live status of backend API, database, machine learning ABSA worker, and payment gateways.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Express API */}
            <div className="p-4 rounded-lg border border-border bg-card/60 flex items-start gap-3">
              <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Server className="h-5 w-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Express API</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Uptime: {formatUptime(systemHealth?.api?.uptime)} • {systemHealth?.api?.responseTimeMs}ms
                </p>
              </div>
            </div>

            {/* PostgreSQL */}
            <div className="p-4 rounded-lg border border-border bg-card/60 flex items-start gap-3">
              <div className="p-2 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Database className="h-5 w-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">PostgreSQL DB</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    systemHealth?.database?.status === 'healthy' 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${
                      systemHealth?.database?.status === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} />
                    {systemHealth?.database?.status === 'healthy' ? 'Connected' : 'Error'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Latency: {systemHealth?.database?.latencyMs ?? 0}ms • Drizzle ORM
                </p>
              </div>
            </div>

            {/* Python ABSA Worker */}
            <div className="p-4 rounded-lg border border-border bg-card/60 flex items-start gap-3">
              <div className="p-2 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Cpu className="h-5 w-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">ABSA Worker (:8001)</span>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    systemHealth?.worker?.status === 'healthy'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${
                      systemHealth?.worker?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    {systemHealth?.worker?.status === 'healthy' ? 'Active' : 'Offline / Standby'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {systemHealth?.worker?.status === 'healthy'
                    ? `Tasks: ${systemHealth?.worker?.activeTasks ?? 0} active • ${systemHealth?.worker?.latencyMs ?? 0}ms`
                    : 'FastAPI worker offline'}
                </p>
              </div>
            </div>

            {/* Stripe Gateway */}
            <div className="p-4 rounded-lg border border-border bg-card/60 flex items-start gap-3">
              <div className="p-2 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">Stripe Gateway</span>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {financials?.stripeStatus === 'healthy' ? 'Live / Active' : 'Connected'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Webhooks & Subscriptions Active
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Charts Section: Revenue Trend & Subscription Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Growth Trend (2 columns) */}
        <Card className="lg:col-span-2 shadow-xs border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Monthly Revenue Trend</CardTitle>
                <CardDescription>Paid subscription volume and transactions over the past 6 months.</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                MRR: {formatCurrency(financials?.mrr)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={financials?.revenueTrend || []}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(156, 163, 175, 0.2)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Revenue']}
                    labelStyle={{ fontWeight: 'bold' }}
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueColor)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plan Distribution (1 column) */}
        <Card className="shadow-xs border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Plan Distribution</CardTitle>
            <CardDescription>Breakdown of paying retail managers by plan tier.</CardDescription>
          </CardHeader>
          <CardContent>
            {planData.length === 0 ? (
              <div className="h-[280px] flex flex-col items-center justify-center text-center p-4">
                <HardDrive className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No active subscriptions found.</p>
              </div>
            ) : (
              <div className="h-[280px] w-full flex flex-col justify-between">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={planData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {planData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PLAN_COLORS[index % PLAN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any, name: any, item: any) => [
                        `${val} subscribers (${formatCurrency(item.payload.monthlyTotal)}/mo)`,
                        name,
                      ]}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 pt-2 border-t border-border/60">
                  {planData.map((p: any, idx: number) => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: PLAN_COLORS[idx % PLAN_COLORS.length] }}
                        />
                        <span className="font-medium text-foreground">{p.name}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {p.value} users ({formatCurrency(p.monthlyTotal)})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Recent Stripe Invoices & Transactions Table */}
      <Card className="shadow-xs border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">Recent Stripe Transactions & Invoices</CardTitle>
            <CardDescription>
              Direct payment receipts and billing records from your Stripe account.
            </CardDescription>
          </div>
          <Link to="/admin/plans">
            <Button variant="ghost" size="sm" className="text-xs">
              Manage Plans &rarr;
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {(!financials?.recentInvoices || financials.recentInvoices.length === 0) ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No recent Stripe transactions available. New subscription payments will automatically appear here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financials.recentInvoices.map((inv: any) => (
                    <TableRow key={inv.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs font-medium text-foreground">
                        {inv.number || inv.id.slice(-8)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm text-foreground">{inv.customerName}</div>
                        {inv.customerEmail && (
                          <div className="text-xs text-muted-foreground">{inv.customerEmail}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.created).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="font-semibold text-sm text-foreground">
                        {formatCurrency(inv.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`capitalize font-normal text-xs ${
                            inv.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {inv.hostedInvoiceUrl ? (
                          <a
                            href={inv.hostedInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                          >
                            View Receipt
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">Auto-billed</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
