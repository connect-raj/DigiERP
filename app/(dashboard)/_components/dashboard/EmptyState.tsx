import { EmptyState as SharedEmptyState } from '@/components/ui/EmptyState';

export default function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <SharedEmptyState
      icon={<span className="material-symbols-outlined text-[32px]">{icon}</span>}
      title={message}
      className="py-8"
    />
  );
}
