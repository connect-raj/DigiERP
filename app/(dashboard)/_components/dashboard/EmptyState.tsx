export default function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      <span className="material-symbols-outlined text-on-surface-variant text-[32px]">{icon}</span>
      <p className="text-body-md text-on-surface-variant">{message}</p>
    </div>
  );
}
