'use client';

interface Props {
  action: () => void | Promise<void>;
  message: string;
  label?: string;
  className?: string;
}

export default function ConfirmDeleteButton({ 
  action, 
  message, 
  label = "삭제", 
  className = "px-2.5 py-1 bg-tertiary text-white text-[11px] font-bold rounded hover:bg-tertiary/90 transition-colors" 
}: Props) {
  return (
    <form action={async () => {
      if (confirm(message)) {
        await action();
      }
    }}>
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
