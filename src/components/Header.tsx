import React, { useState, useEffect } from 'react';
import { ElectionSession, Operator, SessionStatus } from '../types/election';
import { toPersianDigits, formatJalali } from '../utils/persian';
import { 
  Building2, 
  UserCheck, 
  Clock, 
  Lock, 
  Tv, 
  FileSpreadsheet, 
  ShieldCheck, 
  AlertCircle,
  Grid3X3,
  HelpCircle,
  HardDriveDownload,
  Archive
} from 'lucide-react';
import { PanelDropdownActions } from './PanelDropdownActions';

interface HeaderProps {
  session: ElectionSession;
  currentOperator: Operator;
  operators: Operator[];
  onSelectOperator: (op: Operator) => void;
  onOpenProjector: () => void;
  onExportExcel: () => void;
  totalVotes: number;
  onOpenSecurity?: () => void;
  onOpenManualTallySheet?: () => void;
  onOpenGuide?: () => void;
  onOpenBackup?: () => void;
  onNavigateToArchive?: () => void;
  onOpenNetworkHub?: () => void;
  operatingMode?: 'STANDALONE' | 'NETWORK_MULTI';
  archivedCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  currentOperator,
  operators,
  onSelectOperator,
  onOpenProjector,
  onExportExcel,
  totalVotes,
  onOpenSecurity,
  onOpenManualTallySheet,
  onOpenGuide,
  onOpenBackup,
  onNavigateToArchive,
  onOpenNetworkHub,
  operatingMode,
  archivedCount,
}) => {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setTimeString(formatJalali(new Date(), true));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case 'PREPARATION':
        return {
          label: 'آماده‌سازی و بازرسی صندوق',
          color: 'bg-amber-500/10 border-amber-500/40 text-amber-300',
          dot: 'bg-amber-400',
        };
      case 'ACTIVE_VOTING':
        return {
          label: 'شمارش زنده حضوری فعال است',
          color: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300',
          dot: 'bg-emerald-400 animate-pulse',
        };
      case 'DISPUTE_REVIEW':
        return {
          label: 'توقف موقت (بررسی شکایات)',
          color: 'bg-orange-500/10 border-orange-500/40 text-orange-300',
          dot: 'bg-orange-400',
        };
      case 'AWAITING_SIGNATURES':
        return {
          label: 'پایان شمارش - در انتظار امضای ناظران',
          color: 'bg-blue-500/10 border-blue-500/40 text-blue-300',
          dot: 'bg-blue-400',
        };
      case 'LOCKED_FINAL':
        return {
          label: 'قفل نهایی و تایید شده (قطعی)',
          color: 'bg-purple-500/20 border-purple-500/50 text-purple-200',
          dot: 'bg-purple-400',
        };
    }
  };

  const statusInfo = getStatusBadge(session.status);

  return (
    <header className="no-print print:hidden bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 backdrop-blur-md bg-slate-900/95">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          
          {/* Right side: Title and station meta */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-2xl flex-shrink-0">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {session.title}
                </h1>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${statusInfo.color}`}>
                  <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                  <span>{statusInfo.label}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="text-slate-500">حوزه:</span>
                  <span className="text-slate-300">{session.constituency}</span>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <span className="text-slate-500">شعبه:</span>
                  <strong className="text-emerald-300 font-mono">{toPersianDigits(session.stationNumber)}</strong>
                </span>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1">
                  <span className="text-slate-500">صندوق:</span>
                  <span className="text-slate-300">{session.boxNumber}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Left side: Operator Selector, Clock, Projector & Actions */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-between lg:justify-end">
            
            {/* Live Clock */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{timeString}</span>
            </div>

            {/* Operator in charge Selector */}
            <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 px-2.5 py-1.5 rounded-xl">
              <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="text-xs">
                <span className="text-slate-400 text-[10px] block leading-none">اپراتور فعال جلسه:</span>
                {operators.length > 0 ? (
                  <select
                    value={currentOperator?.id ?? ''}
                    onChange={(e) => {
                      const found = operators.find(op => op.id === e.target.value);
                      if (found) onSelectOperator(found);
                    }}
                    className="bg-transparent font-medium text-slate-100 text-xs outline-none cursor-pointer pr-1"
                  >
                    {operators.map((op) => (
                      <option key={op.id} value={op.id} className="bg-slate-800 text-slate-100">
                        {op.name} ({op.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-amber-400 font-bold text-xs">در انتظار ثبت مسئول شعبه</span>
                )}
              </div>
            </div>

            {/* Actions: Bold Projector Button & Grouped Dropdowns */}
            <PanelDropdownActions
              isHeader={true}
              onOpenProjector={onOpenProjector}
              onOpenGuide={onOpenGuide}
              onOpenBackup={onOpenBackup}
              onNavigateToArchive={onNavigateToArchive}
              onExportExcel={onExportExcel}
              onOpenManualTallySheet={onOpenManualTallySheet}
              onOpenSecurity={onOpenSecurity}
              onOpenNetworkHub={onOpenNetworkHub}
              operatingMode={operatingMode}
              archivedCount={archivedCount}
            />

          </div>

        </div>
      </div>
    </header>
  );
};
