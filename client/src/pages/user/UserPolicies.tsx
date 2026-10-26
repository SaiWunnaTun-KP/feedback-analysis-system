import React from 'react';
import PoliciesView from '@/components/policies/PoliciesView';

export default function UserPolicies() {
  return (
    <div className="pb-10">
      <PoliciesView isEmbedded={true} initialTab="terms" />
    </div>
  );
}
