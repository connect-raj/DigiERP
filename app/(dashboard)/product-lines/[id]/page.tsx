'use client';

import { use } from 'react';
import ProductLineForm from '../ProductLineForm';

export default function EditProductLinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProductLineForm lineId={id} />;
}
