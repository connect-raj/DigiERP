'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LowStockProduct } from '../../_lib/dashboard-types';
import EmptyState from './EmptyState';

interface LowStockAlertsProps {
  data: LowStockProduct[];
}

type ViewMode = 'list' | 'category';

const VIEW_LABEL: Record<ViewMode, string> = {
  list: 'List',
  category: 'By Category',
};

function groupByCategory(data: LowStockProduct[]) {
  const groups = new Map<string, { categoryName: string; items: LowStockProduct[] }>();

  for (const product of data) {
    const existing = groups.get(product.categoryId);
    if (existing) {
      existing.items.push(product);
    } else {
      groups.set(product.categoryId, {
        categoryName: product.categoryName,
        items: [product],
      });
    }
  }

  return [...groups.entries()]
    .map(([categoryId, group]) => ({ categoryId, ...group }))
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

function LowStockRow({ product, onClick }: { product: LowStockProduct; onClick: () => void }) {
  return (
    <li className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <button
        onClick={onClick}
        className="text-on-surface hover:text-primary text-body-md text-left transition-colors"
      >
        {product.productName}
      </button>
      <span className="text-error text-data-tabular font-semibold">
        {product.currentStock} / {product.lowerStockLimit}
      </span>
    </li>
  );
}

export default function LowStockAlerts({ data }: LowStockAlertsProps) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('list');
  const goToProducts = () => router.push('/products');

  if (data.length === 0) {
    return <EmptyState icon="task_alt" message="All products are above their stock limit." />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="border-outline-variant flex w-fit overflow-hidden rounded border-[0.5px]">
        {(['list', 'category'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setView(mode)}
            className={`text-label-caps border-outline-variant border-r-[0.5px] px-3 py-1 uppercase transition-colors last:border-r-0 ${
              view === mode
                ? 'bg-primary/10 text-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-variant'
            }`}
          >
            {VIEW_LABEL[mode]}
          </button>
        ))}
      </div>

      {view === 'list' ? (
        <ul className="divide-outline-variant divide-y-[0.5px]">
          {data.map((product) => (
            <LowStockRow key={product.productId} product={product} onClick={goToProducts} />
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-4">
          {groupByCategory(data).map((group) => (
            <div key={group.categoryId}>
              <p className="text-label-caps text-on-surface-variant mb-1 uppercase">
                {group.categoryName}
              </p>
              <ul className="divide-outline-variant divide-y-[0.5px]">
                {group.items.map((product) => (
                  <LowStockRow key={product.productId} product={product} onClick={goToProducts} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
