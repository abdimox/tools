import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';

export function LoadingState({ text }: { text: string }) {
  return <div className="loading-state"><LoaderCircle className="spin" size={20} /><span>{text}</span></div>;
}

export function ErrorState({ message }: { message: string }) {
  return <div className="status-box status-error"><AlertCircle size={19} /><span>{message}</span></div>;
}

export function SuccessState({ message }: { message: string }) {
  return <div className="status-box status-success"><CheckCircle2 size={19} /><span>{message}</span></div>;
}
