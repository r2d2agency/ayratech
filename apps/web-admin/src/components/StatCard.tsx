import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
  sub?: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, trend, sub, color }) => (
  <div className="bg-[color:var(--surface-container-low)] rounded-2xl border border-[color:var(--color-border)] p-6 shadow-sm hover:shadow-[0_0_20px_rgba(253,0,255,0.1)] transition-all group relative overflow-hidden">
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-4 transition-all group-hover:scale-110 shadow-sm border border-[color:var(--color-border)]`}>
      {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
    </div>
    <p className="text-[10px] font-bold text-[color:var(--color-muted)] uppercase tracking-[0.1em] mb-1 font-headline">{label}</p>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-black text-[color:var(--color-text)] tracking-tight font-headline">{value}</span>
      {trend && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">{trend}</span>}
    </div>
    {sub && <p className="text-[10px] text-[color:var(--color-muted)] font-medium mt-1">{sub}</p>}
  </div>
);

export default StatCard;
