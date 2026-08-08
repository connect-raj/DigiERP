export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface Crumb {
  label: string;
  href?: string;
}

export const DASHBOARD_ITEM: NavItem = { label: 'Dashboard', href: '/', icon: 'dashboard' };

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Catalog',
    items: [{ label: 'Products', href: '/products', icon: 'inventory_2' }],
  },
  {
    label: 'Procurement',
    items: [
      { label: 'Vendors', href: '/vendors', icon: 'factory' },
      { label: 'Purchases', href: '/purchases', icon: 'shopping_cart' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Customers', href: '/customers', icon: 'groups' },
      { label: 'Dispatch Entries', href: '/dispatch-entries', icon: 'local_shipping' },
      { label: 'Invoices', href: '/invoices', icon: 'receipt_long' },
    ],
  },
  {
    label: 'Finance',
    items: [{ label: 'Payments', href: '/payments', icon: 'payments' }],
  },
];

export const SETTINGS_ITEM: NavItem = { label: 'Settings', href: '/settings', icon: 'settings' };

/** Named sub-route segments that get a friendly breadcrumb label. */
const SEGMENT_LABELS: Record<string, string> = {
  new: 'New',
  ledger: 'Ledger',
};

function titleCase(segment: string) {
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

/**
 * Derive a breadcrumb trail from a pathname using the nav model.
 * Group > Module > [sub-route]. Unknown dynamic segments (record ids) render
 * as "Details"; detail pages supply their real record number in later phases.
 */
export function buildBreadcrumbs(pathname: string): Crumb[] {
  if (pathname === '/') return [{ label: 'Dashboard' }];
  if (pathname.startsWith('/settings')) return [{ label: 'Settings' }];

  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        const rest = pathname.slice(item.href.length).split('/').filter(Boolean);
        const crumbs: Crumb[] = [
          { label: group.label },
          { label: item.label, href: rest.length ? item.href : undefined },
        ];
        rest.forEach((seg) => {
          crumbs.push({ label: SEGMENT_LABELS[seg] ?? 'Details' });
        });
        return crumbs;
      }
    }
  }

  // Routes not present in the nav (e.g. /categories, reachable but demoted).
  const first = pathname.split('/').filter(Boolean)[0] ?? '';
  return [{ label: titleCase(first) }];
}
