import React from 'react';

export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'emerald',
  trend,
  onClick,
  isActive = false,
  className = '',
}) {
  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
  };

  const activeRing = isActive
    ? 'ring-2 ring-emerald-500 shadow-md border-emerald-400 bg-emerald-50/20'
    : 'border-slate-200/80 shadow-sm hover:shadow hover:border-slate-300';

  return (
    <div
      onClick={onClick}
      className={`rounded-xl p-5 border transition-all ${activeRing} ${
        onClick ? 'cursor-pointer select-none active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value != null ? value : '--'}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colorMap[color] || colorMap.emerald}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center text-xs text-slate-500">
          <span className="font-medium text-emerald-600 mr-1.5">{trend}</span>
          <span>from baseline</span>
        </div>
      )}
    </div>
  );
}

