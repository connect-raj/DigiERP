'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FilterSelect } from '@/components/ui/ListToolbar';
import { LedgerView } from '../_components/LedgerView';

type Customer = { id: string; firmName: string };

export default function LedgerPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    fetch('/api/customers?limit=1000')
      .then((r) => r.json())
      .then((data) => {
        if (data.data) setCustomers(data.data);
      })
      .catch((err) => console.error('Failed to fetch customers', err));
  }, []);

  const selected = customers.find((c) => c.id === customerId);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="min-w-[240px]"
        >
          <option value="">Select a customer…</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firmName}
            </option>
          ))}
        </FilterSelect>
        {selected && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/customers/${selected.id}`}>View customer</Link>
          </Button>
        )}
      </div>

      {customerId ? (
        <LedgerView key={customerId} customerId={customerId} />
      ) : (
        <EmptyState
          icon={<span className="material-symbols-outlined text-[40px]">menu_book</span>}
          title="Select a customer"
          description="Pick a customer above to view their statement of account with running balance."
        />
      )}
    </div>
  );
}
