import React, { useEffect, useState } from 'react';
import { billingApi, BillingStatusInfo } from '../../services/billingApi.ts';

/** Thin strip under the header. Shows nothing until billing is switched on, and nothing when there is plenty of time left. */
export const TrialBanner: React.FC<{ onOpenBilling: () => void }> = ({ onOpenBilling }) => {
  const [s, setS] = useState<BillingStatusInfo | null>(null);

  useEffect(() => {
    billingApi.status().then(setS).catch(() => setS(null));
  }, []);

  if (!s || !s.enforced) return null;
  const expired = s.status === 'expired';
  const ending = s.daysLeft <= 7;
  if (!expired && !ending) return null;

  const text = expired
    ? 'Your free trial has ended. Choose a plan to keep posting requests and sending quotes.'
    : s.status === 'trialing'
    ? `Your free trial ends in ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'}.`
    : `Your plan ends in ${s.daysLeft} day${s.daysLeft === 1 ? '' : 's'}.`;

  return (
    <div className={`${expired ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-900'} border-b`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>{text}</span>
        <button onClick={onOpenBilling} className="font-semibold underline whitespace-nowrap">
          {expired ? 'Choose a plan' : 'Open billing'}
        </button>
      </div>
    </div>
  );
};
