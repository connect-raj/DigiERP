import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  default: {
    publicApiKey: { findUnique: vi.fn() },
    galleryItem: { findMany: vi.fn(), count: vi.fn() },
  },
}));

import prisma from '@/lib/prisma';
import { hashApiKey } from '@/lib/api-key';
import { GET } from './route';

function buildRequest(url: string, apiKey?: string) {
  return new NextRequest(url, {
    headers: apiKey ? { 'x-api-key': apiKey } : {},
  });
}

const activeKey = {
  id: 'key-1',
  label: 'Marketing site',
  keyHash: hashApiKey('good-key'),
  active: true,
  createdAt: new Date(),
};

const mockItem = {
  id: 'item-1',
  title: 'Storefront signage install',
  displayOrder: 0,
  applicationType: { id: 'type-1', name: 'Signage' },
  image: {
    url: 'https://res.cloudinary.com/demo/image/upload/abc.jpg',
    mimeType: 'image/jpeg',
    width: 1200,
    height: 800,
    altText: 'A storefront sign',
  },
  relatedProductLine: { id: 'line-1', name: 'Eco-Solvent Ink' },
};

describe('GET /api/public/gallery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('returns 401 with no API key', async () => {
    const response = await GET(buildRequest('http://localhost/api/public/gallery'));
    expect(response.status).toBe(401);
  });

  it('returns 401 with an invalid API key', async () => {
    vi.mocked(prisma.publicApiKey.findUnique).mockResolvedValue(null);
    const response = await GET(buildRequest('http://localhost/api/public/gallery', 'bad-key'));
    expect(response.status).toBe(401);
  });

  it('returns 401 with a revoked API key', async () => {
    vi.mocked(prisma.publicApiKey.findUnique).mockResolvedValue({
      ...activeKey,
      active: false,
    } as never);
    const response = await GET(buildRequest('http://localhost/api/public/gallery', 'good-key'));
    expect(response.status).toBe(401);
  });

  it('returns published items in the public shape, scoped to isPublished: true', async () => {
    vi.mocked(prisma.publicApiKey.findUnique).mockResolvedValue(activeKey as never);
    vi.mocked(prisma.galleryItem.findMany).mockResolvedValue([mockItem] as never);
    vi.mocked(prisma.galleryItem.count).mockResolvedValue(1);

    const response = await GET(buildRequest('http://localhost/api/public/gallery', 'good-key'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.galleryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isPublished: true }) })
    );
    expect(body.data).toEqual([
      {
        id: 'item-1',
        title: 'Storefront signage install',
        displayOrder: 0,
        applicationType: 'Signage',
        image: {
          url: 'https://res.cloudinary.com/demo/image/upload/abc.jpg',
          mimeType: 'image/jpeg',
          width: 1200,
          height: 800,
          altText: 'A storefront sign',
        },
        productLine: { id: 'line-1', name: 'Eco-Solvent Ink' },
      },
    ]);
    // No internal ids (publicId) or unpublished-state fields leak into the
    // public shape.
    expect(JSON.stringify(body.data)).not.toContain('publicId');
  });

  it('sets permissive CORS headers so the marketing site can call it from browser JS', async () => {
    vi.mocked(prisma.publicApiKey.findUnique).mockResolvedValue(activeKey as never);
    vi.mocked(prisma.galleryItem.findMany).mockResolvedValue([]);
    vi.mocked(prisma.galleryItem.count).mockResolvedValue(0);

    const response = await GET(buildRequest('http://localhost/api/public/gallery', 'good-key'));

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
