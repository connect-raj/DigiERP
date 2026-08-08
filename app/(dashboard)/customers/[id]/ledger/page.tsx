'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LedgerView } from '../../../_components/LedgerView';

export default function CustomerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [customerName, setCustomerName] = useState('');

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) setCustomerName(res.data.firmName);
      })
      .catch((err) => console.error('Failed to load customer', err));
  }, [id]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push(`/customers/${id}`)}>
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Button>
        <div>
          <h1 className="font-display text-on-surface text-xl font-semibold tracking-tight">
            Statement of Account
          </h1>
          <p className="text-on-surface-variant mt-0.5 text-sm">{customerName}</p>
        </div>
      </div>

      <LedgerView customerId={id} />
    </div>
  );
}
