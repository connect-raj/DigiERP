'use client';

import React, { useState, useEffect } from 'react';

const SOURCES = ['WEBSITE', 'EXPO', 'INDIAMART', 'TRADEINDIA', 'MANUAL'] as const;

type ApiKey = {
  id: string;
  label: string;
  source: (typeof SOURCES)[number];
  active: boolean;
  createdAt: string;
};

export default function IngestionKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState('');
  const [source, setSource] = useState<(typeof SOURCES)[number]>('WEBSITE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ingestion-api-keys');
      const data = await res.json();
      if (data.data) setApiKeys(data.data);
    } catch (error) {
      console.error('Failed to fetch ingestion API keys', error);
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
      const res = await fetch('/api/ingestion-api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.message ?? 'Failed to create key');
        return;
      }
      setNewRawKey(data.data.rawKey);
      setLabel('');
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to create ingestion API key', error);
      setFormError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (apiKey: ApiKey) => {
    try {
      const res = await fetch(`/api/ingestion-api-keys/${apiKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !apiKey.active }),
      });
      if (res.ok) fetchApiKeys();
    } catch (error) {
      console.error('Failed to update ingestion API key', error);
    }
  };

  const inputClass =
    'w-full rounded-lg border-[0.5px] border-[#444] bg-[#1c1c1c] px-3 py-2 text-[13px] text-primary outline-none focus:border-[#666]';
  const labelClass = 'mb-1.5 block text-[12px] font-medium text-on-surface-variant';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Inquiry Ingestion Keys
        </h1>
        <p className="text-on-surface-variant mt-1 text-[13px]">
          Each key is scoped to one source. The source is derived from the key on every submission —
          it is never trusted from the request body. Revoke a key here if it&apos;s compromised; the
          raw key is shown only once, at creation.
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
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Label</label>
            <input
              className={inputClass}
              placeholder="e.g. digi-tech.in contact form"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelClass}>Source</label>
            <select
              className={inputClass}
              value={source}
              onChange={(e) => setSource(e.target.value as typeof source)}
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
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
                Source
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
                  colSpan={4}
                  className="text-on-surface-variant px-5 py-8 text-center text-[13px]"
                >
                  Loading…
                </td>
              </tr>
            ) : apiKeys.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="text-on-surface-variant px-5 py-8 text-center text-[13px]"
                >
                  No ingestion keys yet.
                </td>
              </tr>
            ) : (
              apiKeys.map((apiKey) => (
                <tr key={apiKey.id}>
                  <td className="px-5 py-3 text-[13px] font-medium">{apiKey.label}</td>
                  <td className="text-on-surface-variant px-5 py-3 text-[13px]">{apiKey.source}</td>
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
                      className="text-on-surface-variant hover:text-primary text-[12px] underline"
                    >
                      {apiKey.active ? 'Revoke' : 'Reactivate'}
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
