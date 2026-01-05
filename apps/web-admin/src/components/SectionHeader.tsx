
import React from 'react';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title }) => {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
    </div>
  );
};

export default SectionHeader;
