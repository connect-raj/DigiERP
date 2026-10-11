'use client';

import { use } from 'react';
import GalleryItemForm from '../GalleryItemForm';

export default function EditGalleryItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <GalleryItemForm itemId={id} />;
}
