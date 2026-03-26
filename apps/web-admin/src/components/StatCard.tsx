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
  <div className="bg-[color:var(--surface-container-low)] rounded-3xl border border-white/5 p-8 shadow-sm hover:shadow-[0_0_20px_rgba(204,151,255,0.1)] transition-all group relative overflow-hidden">
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-6 transition-all group-hover:scale-110 shadow-sm border border-white/5`}>
      {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
    </div>
    <p className="text-[10px] font-bold text-[color:var(--color-muted)] uppercase tracking-[0.15em] mb-2 font-headline">{label}</p>
    <div className="flex items-baseline gap-3">
      <span className="text-3xl font-black text-[color:var(--color-text)] tracking-tighter font-headline">{value}</span>
      {trend && <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-xl border border-emerald-400/20">{trend}</span>}
    </div>
    {sub && <p className="text-[11px] text-[color:var(--color-muted)] font-bold mt-2 uppercase tracking-tight">{sub}</p>}
  </div>
);

export default StatCard;
