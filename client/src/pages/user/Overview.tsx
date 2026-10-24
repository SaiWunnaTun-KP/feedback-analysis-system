import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionsApi, datasetsApi } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HardDrive, FileSpreadsheet, FileClock, CheckCircle2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router';

export default function Overview() {
  const { user } = useAuth();
  
  const { data: mySub, isLoading: loadingSub } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: subscriptionsApi.getMe,
  });

  const { data: datasetsData, isLoading: loadingDatasets } = useQuery({
    queryKey: ['datasets', { all: true }],
    queryFn: () => datasetsApi.get({ all: true }),
  });

  const datasets: any[] = Array.isArray(datasetsData) 
    ? datasetsData 
    : (datasetsData?.datasets || []);

  if (loadingSub || loadingDatasets) {
    return <div className="p-8 text-center text-slate-500">Loading overview...</div>;
  }

  const { subscription, plan: currentPlan, hasUsedFreeTrial } = mySub || {};
  const isFreeTier = !subscription && !hasUsedFreeTrial;

  let maxStorage = 0;
  let usedStorage = 0;

  if (subscription && currentPlan) {
    maxStorage = currentPlan.maxStorageMb;
    usedStorage = parseFloat(subscription.usedStorageMb);
  } else if (isFreeTier) {
    maxStorage = 75;
    usedStorage = 0;
  }

  const usagePercent = maxStorage > 0 ? Math.min((usedStorage / maxStorage) * 100, 100) : 0;
  const isNearLimit = usagePercent > 85;

  const recentDatasets = datasets.slice(0, 3);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500">A brief summary of your account and recent activities.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Info */}
        <Card className="shadow-sm border-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-blue-600" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Name</p>
              <p className="text-lg font-semibold text-slate-900">{user?.username || 'User'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Email</p>
              <p className="text-md text-slate-700">{user?.email || 'user@example.com'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">Active Plan</p>
              {subscription ? (
                <Badge className="bg-blue-100 text-blue-700">{currentPlan.name} Plan</Badge>
              ) : isFreeTier ? (
                <Badge variant="outline" className="text-slate-600">Free Trial</Badge>
              ) : (
                <Badge variant="destructive">None</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Storage Quota Card */}
        <Card className="shadow-sm border-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-blue-600" />
              Storage Quota
            </CardTitle>
            <CardDescription>Monitor your file upload usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-right">
                <p className="text-3xl font-bold text-slate-900">
                  {usedStorage.toFixed(1)} <span className="text-base font-normal text-slate-500">/ {maxStorage} MB</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${isNearLimit ? 'bg-rose-500' : 'bg-blue-600'}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 text-right">
                {usagePercent.toFixed(1)}% used
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="shadow-sm border-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <p className="text-5xl font-bold text-blue-600">{datasets.length}</p>
            <p className="text-sm text-slate-500 mt-2">Total Uploaded Datasets</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Datasets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Recent Datasets</h2>
          <Link to="/dashboard/datasets" className="text-sm text-blue-600 hover:underline font-medium">
            View All
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recentDatasets.length === 0 ? (
            <div className="col-span-3 text-center py-8 text-slate-500 bg-white rounded-xl border border-slate-200/50">
              No datasets uploaded yet.
            </div>
          ) : (
            recentDatasets.map((d: any) => (
              <Card key={d.id} className="shadow-sm border-slate-200/50">
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{d.filename}</p>
                      <p className="text-xs text-slate-500">{new Date(d.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div>
                    {d.status === 'PENDING' && <Badge variant="secondary" className="w-fit">Pending</Badge>}
                    {d.status === 'ANALYSIS_IN_PROGRESS' && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 w-fit flex items-center gap-1">
                        <FileClock className="h-3 w-3" /> Processing
                      </Badge>
                    )}
                    {d.status === 'COMPLETED' && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 w-fit">Completed</Badge>}
                    {d.status === 'FAILED' && <Badge variant="destructive" className="w-fit">Failed</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
