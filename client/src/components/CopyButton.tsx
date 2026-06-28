import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

export function CopyButton({ text, label = '复制' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button className="button button-ghost button-small" type="button" onClick={copy}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
      {copied ? '已复制' : label}
    </button>
  );
}

