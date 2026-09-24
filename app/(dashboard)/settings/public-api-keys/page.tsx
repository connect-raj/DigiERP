'use client';

import React, { useState, useEffect } from 'react';
import { showSuccessToast, showErrorToast } from '@/lib/toast';

type ApiKey = {
  id: string;
  label: string;
  active: boolean;
  createdAt: string;
};

export default function PublicApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/public-api-keys');
      const data = await res.json();
      if (data.data) setApiKeys(data.data);
    } catch (error) {
      console.error('Failed to fetch public API keys', error);
      showErrorToast(error, 'Failed to load public API keys');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApiKeys();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/public-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.message ?? 'Failed to create key');
        showErrorToast(data, 'Failed to create key');
        return;
      }
      setNewRawKey(data.data.rawKey);
      setLabel('');
      showSuccessToast('Public API key created');
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to create public API key', error);
      setFormError('An unexpected error occurred.');
      showErrorToast(error, 'Failed to create public API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (apiKey: ApiKey) => {
    try {
      setTogglingId(apiKey.id);
      const res = await fetch(`/api/public-api-keys/${apiKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !apiKey.active }),
      });
      const data = await res.json();
      if (!res.ok) {
        showErrorToast(data, 'Failed to update public API key');
        return;
      }
      showSuccessToast(apiKey.active ? 'Key revoked' : 'Key reactivated');
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to update public API key', error);
      showErrorToast(error, 'Failed to update public API key');
    } finally {
      setTogglingId(null);
    }
  };

  const inputClass =
    'w-full rounded-lg border-[0.5px] border-[#444] bg-[#1c1c1c] px-3 py-2 text-[13px] text-primary outline-none focus:border-[#666]';
  const labelClass = 'mb-1.5 block text-[12px] font-medium text-on-surface-variant';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Public API Keys</h1>
        <p className="text-on-surface-variant mt-1 text-[13px]">
          Keys for the marketing site&apos;s read-only API (gallery, and anything else exposed under
          /api/public/*). Revoke a key here if it&apos;s compromised; the raw key is shown only
          once, at creation.
        </p>
      </div>

      {newRawKey && (
        <div className="mb-6 max-w-2xl rounded-xl border-[0.5px] border-yellow-600/40 bg-yellow-950/20 p-5">
          <p className="text-[13px] font-medium text-yellow-400">
            Copy this key now — it will not be shown again.
          </p>
          <code className="mt-2 block rounded-lg bg-black/40 p-3 text-[13px] break-all text-yellow-200">
            {newRawKey}
          </code>
          <button
            className="mt-3 text-[12px] text-yellow-400 underline"
            onClick={() => setNewRawKey(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-8 max-w-2xl rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c] p-6"
      >
        <div>
          <label className={labelClass}>Label</label>
          <input
            className={inputClass}
            placeholder="e.g. digi-tech.in marketing site"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
        {formError && <p className="mt-4 text-[13px] text-red-400">{formError}</p>}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="text-primary rounded-lg border-[0.5px] border-[#444] bg-[#2a2a2a] px-5 py-2 text-[13px] font-medium transition-all hover:bg-[#333] disabled:opacity-50"
          >
            {isSubmitting ? 'Generating…' : 'Generate Key'}
          </button>
        </div>
      </form>

      <div className="max-w-2xl overflow-hidden rounded-xl border-[0.5px] border-[#333] bg-[#1c1c1c]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b-[0.5px] border-[#333] bg-[#222]">
              <th className="text-on-surface-variant px-5 py-3 text-[11px] font-medium tracking-wider uppercase">
                Label
              </th>
              <th className="text-on-surface-variant px-5 py-3 text-[11px] font-medium tracking-wider uppercase">
                Status
              </th>
              <th className="text-on-surface-variant px-5 py-3 text-right text-[11px] font-medium tracking-wider uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y-[0.5px] divide-[#333]">
            {loading ? (
              <tr>
                <td
                  colSpan={3}
                  className="text-on-surface-variant px-5 py-8 text-center text-[13px]"
                >
                  Loading…
                </td>
              </tr>
            ) : apiKeys.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="text-on-surface-variant px-5 py-8 text-center text-[13px]"
                >
                  No public API keys yet.
                </td>
              </tr>
            ) : (
              apiKeys.map((apiKey) => (
                <tr key={apiKey.id}>
                  <td className="px-5 py-3 text-[13px] font-medium">{apiKey.label}</td>
                  <td className="px-5 py-3 text-[13px]">
                    {apiKey.active ? (
                      <span className="text-green-400">Active</span>
                    ) : (
                      <span className="text-red-400">Revoked</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(apiKey)}
                      disabled={togglingId === apiKey.id}
                      className="text-on-surface-variant hover:text-primary text-[12px] underline disabled:opacity-50"
                    >
                      {togglingId === apiKey.id
                        ? 'Working…'
                        : apiKey.active
                          ? 'Revoke'
                          : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
