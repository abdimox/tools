import type { ReactNode } from 'react';

export function Section({ title, description, action, children, className = '' }: { title: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`section ${className}`}>
      <header className="section-header">
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
        {action}
      </header>
      {children}
    </section>
  );
}

