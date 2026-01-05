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
  <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center mb-6 transition-all group-hover:scale-110 shadow-sm`}>
      {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { size: 28 })}
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2">{label}</p>
    <div className="flex items-baseline gap-3">
      <span className="text-3xl font-black text-slate-900 tracking-tighter">{value}</span>
      {trend && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">{trend}</span>}
    </div>
    {sub && <p className="text-[11px] text-slate-400 font-bold mt-2 uppercase tracking-tight">{sub}</p>}
  </div>
);

export default StatCard;
