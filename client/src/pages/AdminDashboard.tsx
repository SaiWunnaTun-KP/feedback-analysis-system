import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import AdminPlans from '@/components/admin/AdminPlans';
import AdminFeedbacks from '@/components/admin/AdminFeedbacks';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminFaqs from '@/components/admin/AdminFaqs';
import AdminPolicies from '@/components/admin/AdminPolicies';

interface AdminDashboardProps {
  tab?: 'plans' | 'feedbacks' | 'users' | 'faqs' | 'policies';
}

export default function AdminDashboard({ tab = 'plans' }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [targetFeedbackId, setTargetFeedbackId] = useState<number | null>(() => {
    const param = searchParams.get('feedbackId');
    return param ? parseInt(param, 10) : null;
  });

  useEffect(() => {
    const param = searchParams.get('feedbackId');
    if (param) {
      setTargetFeedbackId(parseInt(param, 10));
    }
  }, [searchParams]);

  const handleNavigateToFeedback = (feedbackId: number) => {
    setTargetFeedbackId(feedbackId);
    navigate(`/admin/feedbacks?feedbackId=${feedbackId}`);
  };

  return (
    <div className="bg-card text-card-foreground p-6 rounded-xl shadow-xs border border-border">
      {tab === 'plans' && <AdminPlans />}
      {tab === 'feedbacks' && (
        <AdminFeedbacks
          initialFeedbackId={targetFeedbackId}
          onClearInitialFeedback={() => setTargetFeedbackId(null)}
        />
      )}
      {tab === 'users' && (
        <AdminUsers onNavigateToFeedback={handleNavigateToFeedback} />
      )}
      {tab === 'faqs' && <AdminFaqs />}
      {tab === 'policies' && <AdminPolicies />}
    </div>
  );
}

