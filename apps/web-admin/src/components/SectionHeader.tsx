
import React from 'react';

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, subtitle }) => {
  return (
    <div>
      <div className="flex items-center gap-2">
        {icon && icon}
        <h2 className="text-lg font-bold text-[color:var(--color-text)] tracking-tight font-headline">{title}</h2>
      </div>
      {subtitle && <p className="text-[color:var(--color-muted)] text-sm mt-1">{subtitle}</p>}
    </div>
  );
};

export default SectionHeader;
