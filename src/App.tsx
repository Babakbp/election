/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Candidate, 
  ElectionSession, 
  AuditEvent, 
  Operator, 
  SessionStatus, 
  TieBreakerRule,
  Voter,
  ArchivedSession
} from './types/election';
import { 
  createInitialCandidates, 
  createInitialSession, 
  createInitialAuditEvents, 
  createInitialVoters,
  INITIAL_OPERATORS,
  SYNTHETIC_CANDIDATE_POOL
} from './utils/mockData';
import { rankCandidates } from './utils/tieBreaker';
import { exportElectionToExcel } from './utils/export';
import { 
  formatJalali, 
  computeSHA256, 
  toPersianDigits, 
  generateValidSyntheticNationalId, 
  maskNationalId 
} from './utils/persian';
import { audioFeedback } from './utils/audioFeedback';

// Components
import { Header } from './components/Header';
import { VotingCounterTab } from './components/VotingCounterTab';
import { AuditLedgerTab } from './components/AuditLedgerTab';
import { CandidatesTab } from './components/CandidatesTab';
import { VotersTab } from './components/VotersTab';
import { SessionConfigTab } from './components/SessionConfigTab';
import { OfficialMinutesTab } from './components/OfficialMinutesTab';
import { VoteCorrectionModal } from './components/VoteCorrectionModal';
import { ProjectorViewModal } from './components/ProjectorViewModal';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { BallotPaperDesignerTab } from './components/BallotPaperDesignerTab';
import { SecurityConfigModal } from './components/SecurityConfigModal';
import { AppLockScreenModal } from './components/AppLockScreenModal';
import { ManualTallySheetModal } from './components/ManualTallySheetModal';
import { ElectionGuideModal } from './components/ElectionGuideModal';
import { SessionsArchiveTab } from './components/SessionsArchiveTab';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TouchVotingKiosk } from './components/TouchVotingKiosk';
import { VoterCheckinTerminal } from './components/VoterCheckinTerminal';
import { NetworkHubModal } from './components/NetworkHubModal';
import { syncEngine, OperatingMode, StationRole, SyncMessage } from './utils/syncEngine';
import { getAppPasswordInfo, getLicenseStatus, CREATOR_NAME, CREATOR_EMAIL } from './utils/license';
import { archiveSession, getArchivedSessions } from './utils/fileBackupStorage';

// Icons
import { 
  Vote, 
  ScrollText, 
  Users, 
  Settings2, 
  FileCheck2, 
  HardDriveDownload,
  AlertCircle,
  UserCheck,
  ShieldCheck,
  UserPlus,
  Ticket,
  HelpCircle,
  Archive
} from 'lucide-react';

const STORAGE_KEY_SESSION = 'elections_session_v1';
const STORAGE_KEY_CANDIDATES = 'elections_candidates_v1';
const STORAGE_KEY_AUDIT = 'elections_audit_v1';
const STORAGE_KEY_OPERATOR = 'elections_operator_v1';
const STORAGE_KEY_OPERATORS_LIST = 'elections_operators_list_v1';
const STORAGE_KEY_VOTERS = 'elections_voters_v1';
const STORAGE_KEY_DEMO_MODE = 'elections_is_demo_mode_v1';

export default function App() {
  // Load initial state or local storage
  const [session, setSession] = useState<ElectionSession>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SESSION);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return createInitialSession();
  });

  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CANDIDATES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return createInitialCandidates();
  });

  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUDIT);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return createInitialAuditEvents();
  });

  const [operators, setOperators] = useState<Operator[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPERATORS_LIST);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_OPERATORS;
  });

  const [currentOperator, setCurrentOperator] = useState<Operator>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPERATOR);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_OPERATORS[2]; // Default to ballot clerk / operator
  });

  const [voters, setVoters] = useState<Voter[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VOTERS);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return createInitialVoters();
  });

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DEMO_MODE);
      if (saved !== null) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return true;
  });

  // UI Navigation
  const [activeTab, setActiveTab] = useState<
    'VOTING' | 'AUDIT' | 'CANDIDATES' | 'VOTERS' | 'BALLOTS' | 'SESSION' | 'MINUTES' | 'ARCHIVE'
  >('VOTING');

  // Archive Sessions State
  const [archivedSessions, setArchivedSessions] = useState<ArchivedSession[]>(() => {
    return getArchivedSessions();
  });

  // Modals state
  const [correctionCandidate, setCorrectionCandidate] = useState<Candidate | null>(null);
  const [isProjectorOpen, setIsProjectorOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isManualTallyModalOpen, setIsManualTallyModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(() => getAppPasswordInfo().isLocked);
  const [licenseData, setLicenseData] = useState(() => getLicenseStatus());
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  // Operating mode & Station Role
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(() => syncEngine.getMode());
  const [stationRole, setStationRole] = useState<StationRole>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('station');
      if (s === 'kiosk' || s === 'checkin' || s === 'projector') return s as StationRole;
    }
    return 'master';
  });
  const [isNetworkHubModalOpen, setIsNetworkHubModalOpen] = useState(false);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(session));
    } catch (e) {
      console.error(e);
    }
  }, [session]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CANDIDATES, JSON.stringify(candidates));
    } catch (e) {
      console.error(e);
    }
  }, [candidates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT, JSON.stringify(auditEvents));
    } catch (e) {
      console.error(e);
    }
  }, [auditEvents]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OPERATOR, JSON.stringify(currentOperator));
    } catch (e) {
      console.error(e);
    }
  }, [currentOperator]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OPERATORS_LIST, JSON.stringify(operators));
    } catch (e) {
      console.error(e);
    }
  }, [operators]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_VOTERS, JSON.stringify(voters));
    } catch (e) {
      console.error(e);
    }
  }, [voters]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DEMO_MODE, JSON.stringify(isDemoMode));
    } catch (e) {
      console.error(e);
    }
  }, [isDemoMode]);

  // Automatically request fullscreen when entering main panel (VOTING tab)
  useEffect(() => {
    if (activeTab !== 'VOTING') return;

    let isDisposed = false;

    const requestFs = async () => {
      if (document.fullscreenElement) return;
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
      } catch {
        // If browser blocks without gesture, trigger on first user interaction on the page
        if (isDisposed) return;
        const onFirstInteraction = async () => {
          window.removeEventListener('pointerdown', onFirstInteraction);
          window.removeEventListener('keydown', onFirstInteraction);
          if (!document.fullscreenElement && activeTab === 'VOTING') {
            try {
              if (document.documentElement.requestFullscreen) {
                await document.documentElement.requestFullscreen();
              } else if ((document.documentElement as any).webkitRequestFullscreen) {
                await (document.documentElement as any).webkitRequestFullscreen();
              }
            } catch {
              // ignore
            }
          }
        };
        window.addEventListener('pointerdown', onFirstInteraction, { once: true });
        window.addEventListener('keydown', onFirstInteraction, { once: true });
      }
    };

    requestFs();

    return () => {
      isDisposed = true;
    };
  }, [activeTab]);

  // Derived statistics
  const totalValidVotes = useMemo(() => {
    return candidates.reduce((sum, c) => sum + c.votes, 0);
  }, [candidates]);

  const totalVotes = useMemo(() => {
    return totalValidVotes + session.blankBallots + session.invalidBallots;
  }, [totalValidVotes, session.blankBallots, session.invalidBallots]);

  const rankedCandidates = useMemo(() => {
    return rankCandidates(candidates, session.tieBreakerRule, totalValidVotes);
  }, [candidates, session.tieBreakerRule, totalValidVotes]);

  const showFlash = (msg: string) => {
    setFlashMessage(msg);
    setTimeout(() => setFlashMessage(null), 3500);
  };

  /**
   * Helper to create a cryptographically linked tamper-evident audit event
   */
  const appendAuditEvent = async (eventData: Omit<AuditEvent, 'id' | 'eventIdNumber' | 'timestamp' | 'persianTimestamp' | 'hash' | 'prevHash'>) => {
    const nextNumber = auditEvents.length + 1;
    const nextId = `EVT-${1000 + nextNumber}`;
    const nowIso = new Date().toISOString();
    const jalaliTime = formatJalali(nowIso, true);
    const lastHash = auditEvents.length > 0 ? auditEvents[0].hash : '0000000000000000000000000000000000000000000000000000000000000000';

    const hashPayload = `${nextId}|${nowIso}|${eventData.operatorName}|${eventData.actionType}|${eventData.newValue}|${eventData.reason}|${lastHash}`;
    const newHash = await computeSHA256(hashPayload);

    const fullEvent: AuditEvent = {
      id: nextId,
      eventIdNumber: nextNumber,
      timestamp: nowIso,
      persianTimestamp: jalaliTime,
      ...eventData,
      hash: newHash,
      prevHash: lastHash,
    };

    setAuditEvents((prev) => [fullEvent, ...prev]);
    return fullEvent;
  };

  // Operating mode & Station Role Handlers
  const handleSelectMode = (newMode: OperatingMode) => {
    setOperatingMode(newMode);
    syncEngine.setMode(newMode);
    if (newMode === 'NETWORK_MULTI') {
      showFlash('روش ۲: شبکه محلی، چندکاربره و کیوسک لمسی با موفقیت فعال شد.');
    } else {
      showFlash('روش ۱: سامانه به حالت مستقل (تک‌سیستمه و آفلاین) بازگردانده شد.');
    }
  };

  const handleSelectStationRole = (newRole: StationRole) => {
    setStationRole(newRole);
    syncEngine.setRole(newRole);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (newRole === 'master') {
        url.searchParams.delete('station');
      } else {
        url.searchParams.set('station', newRole);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleAddVoterQuick = async (voterData: Omit<Voter, 'id' | 'rowNumber' | 'hasVoted'>) => {
    const nextRow = voters.length + 1;
    const newV: Voter = {
      id: `VOTER-${Date.now()}`,
      rowNumber: nextRow,
      ...voterData,
      hasVoted: true,
      votedAt: formatJalali(new Date(), true),
    };

    setVoters((prev) => [...prev, newV]);
    syncEngine.broadcast('VOTER_ADD', newV);

    await appendAuditEvent({
      operatorName: currentOperator.name || 'اپراتور باجه',
      operatorRole: currentOperator.role || 'مسئول پذیرش',
      actionType: 'VOTER_CHECKED_IN',
      previousValue: null,
      newValue: `ثبت فوری: ${newV.fullName}`,
      delta: null,
      reason: `ثبت‌نام مراجع جدید در باجه ورود و صدور تعرفه برای ایشان`,
    });
  };

  // Real-time Multi-Station Sync Effect
  useEffect(() => {
    syncEngine.init(stationRole);

    const unsubscribe = syncEngine.subscribe(async (msg: SyncMessage) => {
      // 1. Voter checked in from Laptop 2 (Registration Desk)
      if (msg.type === 'VOTER_CHECK_IN' && msg.payload) {
        const { voterId, voterName, newStatus, operatorName } = msg.payload;
        setVoters((prev) =>
          prev.map((v) =>
            v.id === voterId
              ? {
                  ...v,
                  hasVoted: newStatus !== undefined ? newStatus : true,
                  votedAt: formatJalali(new Date(), true),
                }
              : v
          )
        );

        if (stationRole === 'master') {
          audioFeedback.playVoterCheckin();
          showFlash(`ورود «${voterName || 'رأی‌دهنده'}» از باجه پذیرش (لپ‌تاپ ۲) ثبت شد.`);
          await appendAuditEvent({
            operatorName: operatorName || 'اپراتور باجه پذیرش (لپ‌تاپ ۲)',
            operatorRole: 'مسئول ثبت ورود وای‌فای',
            actionType: 'BALLOT_BLANK_CHANGE',
            previousValue: 'عدم حضور',
            newValue: 'احراز هویت و صدور برگه رأی',
            delta: null,
            reason: `ثبت ورود آنلاین رأی‌دهنده: ${voterName || voterId} از باجه شبکه`,
          });
        }
      }

      // 2. New voter added from checkin terminal
      if (msg.type === 'VOTER_ADD' && msg.payload) {
        const newV = msg.payload as Voter;
        setVoters((prev) => {
          if (prev.some((v) => v.id === newV.id)) return prev;
          return [...prev, newV];
        });
      }

      // 3. Vote cast from Touchscreen Kiosk
      if (msg.type === 'KIOSK_VOTE_CAST' && msg.payload) {
        const { candidateId, candidateName, candidateNumber } = msg.payload;
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, votes: c.votes + 1 } : c))
        );

        if (stationRole === 'master') {
          audioFeedback.playVoteCast();
          showFlash(`یک رأی جدید برای «${candidateName || 'کاندیدا'}» از کیوسک لمسی ثبت شد.`);
          await appendAuditEvent({
            operatorName: 'کیوسک لمسی دیجیتال (باجه ۱)',
            operatorRole: 'صندوق الکترونیک اخذ رأی',
            candidateId,
            candidateName,
            candidateNumber,
            actionType: 'VOTE_INCREMENT',
            previousValue: null,
            newValue: 'رأی مستقیم لمسی',
            delta: 1,
            reason: `ثبت رأی مستقیم شهروند توسط مانیتور لمسی کیوسک دیجیتال`,
          });
        }
      }

      // 4. State synchronization
      if (msg.type === 'REQUEST_FULL_STATE' && stationRole === 'master') {
        syncEngine.broadcast('FULL_STATE_SYNC', {
          session,
          candidates,
          voters,
        });
      }

      if (msg.type === 'FULL_STATE_SYNC' && msg.payload && stationRole !== 'master') {
        if (msg.payload.session) setSession(msg.payload.session);
        if (msg.payload.candidates) setCandidates(msg.payload.candidates);
        if (msg.payload.voters) setVoters(msg.payload.voters);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [stationRole, session, candidates, voters, currentOperator]);

  // Vote Increment (+1, +5)
  const handleIncrementVote = async (candidateId: string, amount: number) => {
    if (session.status === 'LOCKED_FINAL') return;

    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) return;

    const prevVotes = cand.votes;
    const newVotes = prevVotes + amount;

    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, votes: newVotes } : c))
    );

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      candidateId: cand.id,
      candidateName: cand.name,
      candidateNumber: cand.candidateNumber,
      actionType: 'VOTE_INCREMENT',
      previousValue: prevVotes,
      newValue: newVotes,
      delta: amount,
      reason: amount === 1 
        ? 'قرائت تعرفه و شمارش حضوری برگه رأی' 
        : `ثبت بسته ${toPersianDigits(amount)} تایی تعرفه با تایید ناظران`,
    });

    showFlash(`رأی ${cand.name} افزایش یافت (+${toPersianDigits(amount)})`);
  };

  // Vote Correction / Decrement
  const handleConfirmVoteCorrection = async (
    candidateId: string,
    decrementCount: number,
    reason: string
  ) => {
    if (session.status === 'LOCKED_FINAL') return;

    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) return;

    const prevVotes = cand.votes;
    const newVotes = Math.max(0, prevVotes - decrementCount);

    audioFeedback.playVoteCorrection();

    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, votes: newVotes } : c))
    );

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      candidateId: cand.id,
      candidateName: cand.name,
      candidateNumber: cand.candidateNumber,
      actionType: 'VOTE_CORRECTION_DECREASE',
      previousValue: prevVotes,
      newValue: newVotes,
      delta: -decrementCount,
      reason,
    });

    showFlash(`اصلاح و کسر ${toPersianDigits(decrementCount)} رأی با موفقیت در دفتر کل ثبت شد.`);
  };

  // Rollback / Undo of previous event
  const handleRollbackEvent = async (eventToRollback: AuditEvent, rollbackReason: string) => {
    if (session.status === 'LOCKED_FINAL') return;

    if (!eventToRollback.candidateId || eventToRollback.delta === null) return;
    const cand = candidates.find((c) => c.id === eventToRollback.candidateId);
    if (!cand) return;

    const prevVotes = cand.votes;
    // Reverse the delta
    const reversedDelta = -eventToRollback.delta;
    const newVotes = Math.max(0, prevVotes + reversedDelta);

    audioFeedback.playVoteCorrection();

    setCandidates((prev) =>
      prev.map((c) => (c.id === cand.id ? { ...c, votes: newVotes } : c))
    );

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      candidateId: cand.id,
      candidateName: cand.name,
      candidateNumber: cand.candidateNumber,
      actionType: 'ROLLBACK',
      previousValue: prevVotes,
      newValue: newVotes,
      delta: reversedDelta,
      reason: `لغو رسمی رویداد شماره ${eventToRollback.id}: ${rollbackReason}`,
      isRollback: true,
      rollbackOfEventId: eventToRollback.id,
    });

    showFlash(`عملیات ${eventToRollback.id} با ثبت رویداد معکوس لغو گردید.`);
  };

  // Blank ballots change
  const handleUpdateBlankBallots = async (delta: number) => {
    if (session.status === 'LOCKED_FINAL') return;
    const prev = session.blankBallots;
    const next = Math.max(0, prev + delta);
    setSession((s) => ({ ...s, blankBallots: next }));

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      actionType: 'BALLOT_BLANK_CHANGE',
      previousValue: prev,
      newValue: next,
      delta,
      reason: delta > 0 ? 'شمارش تعرفه سفید قانونی (رأی ممتنع)' : 'اصلاح تعداد آرای سفید',
    });
  };

  // Invalid ballots change
  const handleUpdateInvalidBallots = async (delta: number) => {
    if (session.status === 'LOCKED_FINAL') return;
    const prev = session.invalidBallots;
    const next = Math.max(0, prev + delta);
    setSession((s) => ({ ...s, invalidBallots: next }));

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      actionType: 'BALLOT_INVALID_CHANGE',
      previousValue: prev,
      newValue: next,
      delta,
      reason: delta > 0 ? 'ابطال برگه رأی فاقد مهر یا خط‌خورده' : 'اصلاح تعداد برگه‌های باطله',
    });
  };

  // Add Candidate
  const handleAddCandidate = async (candidateData: Omit<Candidate, 'id' | 'votes' | 'registrationOrder'>) => {
    if (session.status === 'LOCKED_FINAL') return;

    const nextId = `CAND-${candidates.length + 1}`;
    const nextOrder = candidates.length + 1;
    const newCand: Candidate = {
      id: nextId,
      ...candidateData,
      votes: 0,
      registrationOrder: nextOrder,
    };

    setCandidates((prev) => [...prev, newCand]);

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      candidateId: newCand.id,
      candidateName: newCand.name,
      candidateNumber: newCand.candidateNumber,
      actionType: 'CANDIDATE_REGISTERED',
      previousValue: null,
      newValue: `ثبت نامزد با کد ${newCand.candidateNumber}`,
      delta: null,
      reason: `ثبت رسمی نامزد ${newCand.name} پس از اعتبارسنجی شناسه ملی (${newCand.nationalIdMasked})`,
    });
  };

  // Update Candidate Photo (crop & upload from computer)
  const handleUpdateCandidatePhoto = async (candidateId: string, newPhotoUrl: string) => {
    if (session.status === 'LOCKED_FINAL') return;

    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) return;

    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, avatarUrl: newPhotoUrl } : c))
    );

    await appendAuditEvent({
      operatorName: currentOperator.name || 'اپراتور سامانه',
      operatorRole: currentOperator.role || 'مسئول',
      candidateId: cand.id,
      candidateName: cand.name,
      candidateNumber: cand.candidateNumber,
      actionType: 'CANDIDATE_PHOTO_UPDATED',
      previousValue: 'تصویر قبلی',
      newValue: 'بارگذاری و تنظیم تصویر جدید در کادر',
      delta: null,
      reason: `بروزرسانی و تنظیم تصویر پرتره کاندیدا «${cand.name}» از حافظه کامپیوتر در کادر رسمی`,
    });

    showFlash(`تصویر پرتره «${cand.name}» با موفقیت تنظیم و ذخیره شد.`);
  };

  // Edit & Update Candidate details
  const handleUpdateCandidate = async (candidateId: string, updatedData: Partial<Candidate>) => {
    if (session.status === 'LOCKED_FINAL') return;

    const existing = candidates.find((c) => c.id === candidateId);
    if (!existing) return;

    // Check candidate number uniqueness if updated
    if (updatedData.candidateNumber && updatedData.candidateNumber !== existing.candidateNumber) {
      const duplicate = candidates.some(
        (c) => c.id !== candidateId && c.candidateNumber === updatedData.candidateNumber
      );
      if (duplicate) {
        showFlash(`کد انتخاباتی ${updatedData.candidateNumber} قبلاً به کاندیدای دیگری اختصاص یافته است.`);
        return;
      }
    }

    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, ...updatedData } : c))
    );

    await appendAuditEvent({
      operatorName: currentOperator.name || 'اپراتور سامانه',
      operatorRole: currentOperator.role || 'مسئول',
      candidateId: existing.id,
      candidateName: updatedData.name || existing.name,
      candidateNumber: updatedData.candidateNumber || existing.candidateNumber,
      actionType: 'CANDIDATE_UPDATED',
      previousValue: `${existing.name} (کد ${existing.candidateNumber})`,
      newValue: `${updatedData.name || existing.name} (کد ${updatedData.candidateNumber || existing.candidateNumber})`,
      delta: null,
      reason: `ویرایش اطلاعات کاندیدا «${existing.name}» توسط اپراتور شعبه`,
    });

    showFlash(`مشخصات کاندیدا «${updatedData.name || existing.name}» با موفقیت بروزرسانی شد.`);
  };

  // Delete Candidate
  const handleDeleteCandidate = async (candidateId: string) => {
    if (session.status === 'LOCKED_FINAL') return;

    const target = candidates.find((c) => c.id === candidateId);
    if (!target) return;

    setCandidates((prev) => prev.filter((c) => c.id !== candidateId));

    await appendAuditEvent({
      operatorName: currentOperator.name || 'اپراتور سامانه',
      operatorRole: currentOperator.role || 'مسئول',
      candidateId: target.id,
      candidateName: target.name,
      candidateNumber: target.candidateNumber,
      actionType: 'CANDIDATE_DELETED',
      previousValue: `${target.name} (کد ${target.candidateNumber}، آرا: ${target.votes})`,
      newValue: 'حذف کامل از فهرست نامزدها',
      delta: null,
      reason: `حذف نامزد «${target.name}» با کد انتخاباتی ${target.candidateNumber} از فهرست رسمی`,
    });

    showFlash(`کاندیدا «${target.name}» با موفقیت حذف گردید.`);
  };

  // Generate Synthetic Candidates pool
  const handleGenerateSyntheticCandidates = async () => {
    if (session.status === 'LOCKED_FINAL') return;

    const remaining = SYNTHETIC_CANDIDATE_POOL.slice(candidates.length);
    if (remaining.length === 0) {
      showFlash('تمام نامزدهای آزمایشی پیش‌فرض در سامانه ثبت شده‌اند.');
      return;
    }

    const template = remaining[0];
    const syntheticNId = generateValidSyntheticNationalId(candidates.length + 10);
    const masked = maskNationalId(syntheticNId);

    const newCand: Candidate = {
      id: `CAND-${candidates.length + 1}`,
      candidateNumber: String(100 + candidates.length + 1),
      name: template.name,
      nationalIdMasked: masked,
      affiliation: template.affiliation,
      avatarUrl: template.avatarUrl,
      votes: 0,
      birthYear: template.birthYear,
      registrationOrder: candidates.length + 1,
      bio: template.bio,
      status: 'APPROVED',
    };

    setCandidates((prev) => [...prev, newCand]);

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      candidateId: newCand.id,
      candidateName: newCand.name,
      candidateNumber: newCand.candidateNumber,
      actionType: 'CANDIDATE_REGISTERED',
      previousValue: null,
      newValue: 'تولید داده مصنوعی آزمایشی',
      delta: null,
      reason: `ایجاد خودکار نامزد آزمایشی جهت شبیه‌سازی و تست شمارش بدون افشای داده‌های واقعی`,
    });

    showFlash(`نامزد آزمایشی «${newCand.name}» با موفقیت اضافه شد.`);
  };

  // Update session settings
  const handleUpdateSession = async (updated: Partial<ElectionSession>, reason: string) => {
    if (session.status === 'LOCKED_FINAL') return;
    setSession((s) => ({ ...s, ...updated }));

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      actionType: 'SESSION_STATE_CHANGE',
      previousValue: null,
      newValue: 'بروزرسانی مشخصات شعبه',
      delta: null,
      reason,
    });
  };

  // Change lifecycle status
  const handleAdvanceStatus = async (nextStatus: SessionStatus, reason: string) => {
    setSession((s) => ({ ...s, status: nextStatus }));

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      actionType: 'SESSION_STATE_CHANGE',
      previousValue: session.status,
      newValue: nextStatus,
      delta: null,
      reason,
    });

    showFlash(`وضعیت جلسه با موفقیت به «${nextStatus}» تغییر یافت.`);
  };

  // Save Person Signature
  const handleSavePersonSignature = async (
    personId: string,
    signatureDataUrl: string,
    signedAt: string,
    digitalToken: string
  ) => {
    let personName = '';

    if (session.presidingOfficer.id === personId) {
      personName = session.presidingOfficer.name;
      setSession((s) => ({
        ...s,
        presidingOfficer: {
          ...s.presidingOfficer,
          signatureDataUrl,
          signedAt,
          digitalCertificateToken: digitalToken,
        },
      }));
    } else {
      const obs = session.observers.find((o) => o.id === personId);
      if (obs) {
        personName = obs.name;
        setSession((s) => ({
          ...s,
          observers: s.observers.map((o) =>
            o.id === personId
              ? {
                  ...o,
                  signatureDataUrl,
                  signedAt,
                  digitalCertificateToken: digitalToken,
                }
              : o
          ),
        }));
      }
    }

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      actionType: 'SIGNATURE_RECORDED',
      previousValue: null,
      newValue: `ثبت امضا: ${personName}`,
      delta: null,
      reason: `امضای رسمی صورتجلسه توسط ${personName} با توکن امنیتی ${digitalToken}`,
    });

    showFlash(`امضای قانونی ${personName} با موفقیت ثبت و ضمیمه شد.`);
  };

  // Lock session permanently
  const handleLockSessionFinal = async (officialHash: string) => {
    const nowIso = new Date().toISOString();
    setSession((s) => ({
      ...s,
      status: 'LOCKED_FINAL',
      lockedAt: nowIso,
      finalMinutesHash: officialHash,
    }));

    audioFeedback.playSignatureSuccess();

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      actionType: 'LOCK_SESSION',
      previousValue: 'AWAITING_SIGNATURES',
      newValue: 'LOCKED_FINAL',
      delta: null,
      reason: `قفل نهایی، صدور قطعی صورتجلسه و درج پلمپ الکترونیک با هش ${officialHash}`,
    });

    // Automatically archive the completed locked election
    try {
      const lockedSession = {
        ...session,
        status: 'LOCKED_FINAL' as const,
        lockedAt: nowIso,
        finalMinutesHash: officialHash,
      };
      await archiveSession(
        lockedSession,
        candidates,
        auditEvents,
        operators,
        voters,
        `قفل نهایی و صدور قطعی صورتجلسه با پلمپ ${officialHash}`
      );
      setArchivedSessions(getArchivedSessions());
    } catch (e) {
      console.warn('Auto-archive on lock failed:', e);
    }

    showFlash('صورتجلسه انتخابات با موفقیت قفل گردید و در بایگانی دائمی ذخیره شد.');
  };

  // Explicitly Archive Current Session
  const handleArchiveCurrentSession = async (customNotes?: string) => {
    try {
      await archiveSession(
        session,
        candidates,
        auditEvents,
        operators,
        voters,
        customNotes || `بایگانی جلسه در تاریخ ${formatJalali(new Date(), true)}`
      );
      setArchivedSessions(getArchivedSessions());
      showFlash(`جلسه «${session.title}» با موفقیت در بایگانی دائمی برنامه ذخیره شد.`);
    } catch (e) {
      console.error(e);
      showFlash('خطا در ذخیره‌سازی جلسه در بایگانی.');
    }
  };

  // Restore archived session as active session
  const handleRestoreArchivedSession = (arch: ArchivedSession) => {
    setSession(arch.session);
    setCandidates(arch.candidates);
    setAuditEvents(arch.auditEvents);
    setOperators(arch.operators);
    if (arch.voters) setVoters(arch.voters);
    showFlash(`جلسه «${arch.session.title}» از بایگانی با موفقیت بارگذاری و فعال شد.`);
  };

  // Switch to Real Election (clears all candidates, voters, officers, and operators)
  // Switch to Real Election (clears ALL demo participants: candidates, voters, officers, operators)
  const handleSwitchToRealElection = async () => {
    // 1. Wipe all candidates
    setCandidates([]);

    // 2. Wipe all voters
    setVoters([]);

    // 3. Clear operators completely
    setOperators([]);
    const initialBlankOperator: Operator = {
      id: '',
      name: 'در انتظار ثبت مسئول/اپراتور',
      role: 'عضو مسئول شعبه',
      nationalIdMasked: '—',
      organization: 'هیئت اجرایی',
    };
    setCurrentOperator(initialBlankOperator);

    // 4. Wipe session presiding officer, observers, counters, and signatures
    setSession((prev) => ({
      ...prev,
      presidingOfficer: {
        id: 'OFF-NEW-01',
        name: 'در انتظار ثبت مشخصات مسئول شعبه',
        role: 'مسئول حوزه (رئیس شعبه)',
        organization: 'هیئت اجرایی',
        nationalIdMasked: '—',
        signatureDataUrl: undefined,
        signedAt: undefined,
        digitalCertificateToken: undefined,
      },
      observers: [],
      blankBallots: 0,
      invalidBallots: 0,
      registeredVotersCount: 0,
      status: 'PREPARATION',
      finalMinutesHash: undefined,
      isDemoMode: false,
    }));
    setIsDemoMode(false);

    // 5. Initialize clean audit ledger with inaugural preparation record
    const nowIso = new Date().toISOString();
    const inauguralAudit: AuditEvent = {
      id: 'EVT-1001',
      eventIdNumber: 1,
      timestamp: nowIso,
      persianTimestamp: formatJalali(nowIso, true),
      operatorName: 'مدیر سامانه',
      operatorRole: 'مسئول آماده‌سازی',
      actionType: 'INITIAL_SEAL',
      previousValue: 'داده‌های دمو و تستی',
      newValue: 'سامانه ۱۰۰٪ پاک‌سازی و آماده انتخابات رسمی',
      delta: null,
      reason: 'پاک‌سازی کامل تمامی افراد دمو اعم از کاندیداها، رأی‌دهندگان، مسئولین حوزه و اپراتورها؛ سامانه خالی و آماده ثبت عوامل و فرآیند واقعی انتخابات شد.',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    };
    setAuditEvents([inauguralAudit]);

    showFlash('تمامی افراد دمو (کاندیداها، رأی‌دهندگان، مسئولین و اپراتورها) کلاً حذف شدند و سامانه آماده ثبت افراد واقعی شد.');
  };

  // Load Demo Data for training/testing
  const handleLoadDemoData = async () => {
    const demoCands = createInitialCandidates();
    const demoVoters = createInitialVoters();
    const demoOps = INITIAL_OPERATORS;
    const demoSession = createInitialSession();
    const demoAudit = createInitialAuditEvents();

    setCandidates(demoCands);
    setVoters(demoVoters);
    setOperators(demoOps);
    setCurrentOperator(demoOps[2]);
    setSession({
      ...demoSession,
      isDemoMode: true,
    });
    setAuditEvents(demoAudit);
    setIsDemoMode(true);

    showFlash('داده‌های نمونه و آموزشی دمو با موفقیت بارگذاری شدند.');
  };

  // Update Operators team
  const handleUpdateOperators = async (newOperators: Operator[], reason: string) => {
    setOperators(newOperators);
    // If current operator was unset or removed, pick first operator
    if (newOperators.length > 0) {
      if (!currentOperator.id || !newOperators.some(o => o.id === currentOperator.id)) {
        setCurrentOperator(newOperators[0]);
      }
    } else {
      setCurrentOperator({
        id: '',
        name: 'در انتظار ثبت مسئول/اپراتور',
        role: 'عضو مسئول شعبه',
        nationalIdMasked: '—',
        organization: 'هیئت اجرایی',
      });
    }

    // Sync presiding officer in session if updated
    const presiding = newOperators.find(o => o.role.includes('رئیس') || o.role.includes('مسئول'));
    if (presiding) {
      setSession(prev => ({
        ...prev,
        presidingOfficer: {
          ...prev.presidingOfficer,
          name: presiding.name,
          role: presiding.role,
          organization: presiding.organization ?? prev.presidingOfficer.organization,
          nationalIdMasked: presiding.nationalIdMasked,
        }
      }));
    }

    await appendAuditEvent({
      operatorName: currentOperator.name || 'مدیریت سامانه',
      operatorRole: currentOperator.role || 'مسئول',
      actionType: 'SESSION_STATE_CHANGE',
      previousValue: null,
      newValue: `بروزرسانی عوامل شعبه (${toPersianDigits(newOperators.length)} نفر)`,
      delta: null,
      reason,
    });
  };

  // Toggle single voter status
  const handleToggleVoterStatus = async (voterId: string) => {
    if (session.status === 'LOCKED_FINAL') return;
    const target = voters.find(v => v.id === voterId);
    if (!target) return;
    const newStatus = !target.hasVoted;
    const nowJalali = formatJalali(new Date(), true);

    setVoters(prev => prev.map(v => v.id === voterId ? {
      ...v,
      hasVoted: newStatus,
      votedAt: newStatus ? nowJalali : undefined,
    } : v));

    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      actionType: 'BALLOT_BLANK_CHANGE',
      previousValue: target.hasVoted ? 'تعرفه صادر شده بود' : 'عدم حضور',
      newValue: newStatus ? 'صدور تعرفه و ثبت حضور' : 'لغو صدور تعرفه',
      delta: null,
      reason: newStatus
        ? `احراز هویت و صدور برگه رأی برای: ${target.fullName} (${target.nationalIdMasked})`
        : `ابطال ثبت حضور رأی‌دهنده: ${target.fullName}`,
    });

    showFlash(newStatus ? `تعرفه رأی برای «${target.fullName}» صادر شد.` : `وضعیت رأی «${target.fullName}» لغو شد.`);
  };

  // Update voter list (e.g. from Excel/CSV import)
  const handleUpdateVoters = async (newVoters: Voter[], reason: string) => {
    setVoters(newVoters);
    setSession(prev => ({ ...prev, registeredVotersCount: newVoters.length }));
    await appendAuditEvent({
      operatorName: currentOperator.name,
      operatorRole: currentOperator.role,
      actionType: 'SESSION_STATE_CHANGE',
      previousValue: `${toPersianDigits(voters.length)} واجد شرایط`,
      newValue: `${toPersianDigits(newVoters.length)} واجد شرایط`,
      delta: null,
      reason,
    });
    showFlash(`لیست واجدین شرایط با موفقیت بروزرسانی شد (${toPersianDigits(newVoters.length)} نفر).`);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    exportElectionToExcel(session, rankedCandidates, totalVotes, totalValidVotes);
  };

  // Reset to initial
  const handleResetSession = () => {
    // Safely auto-archive before wiping if there are votes or customized candidates
    if (totalVotes > 0 || candidates.length > 0) {
      try {
        archiveSession(session, candidates, auditEvents, operators, voters, 'بایگانی خودکار قبل از شروع دوره جدید');
        setArchivedSessions(getArchivedSessions());
      } catch (e) {
        // ignore
      }
    }

    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_CANDIDATES);
    localStorage.removeItem(STORAGE_KEY_AUDIT);
    localStorage.removeItem(STORAGE_KEY_VOTERS);
    localStorage.removeItem(STORAGE_KEY_OPERATORS_LIST);
    setSession(createInitialSession());
    setCandidates(createInitialCandidates());
    setAuditEvents(createInitialAuditEvents());
    setVoters(createInitialVoters());
    setOperators(INITIAL_OPERATORS);
    setIsDemoMode(true);
    showFlash('دوره قبلی در بایگانی ذخیره شد و جلسه جدید با موفقیت آغاز گردید.');
  };

  // 1. Dedicated Kiosk Screen (Touchscreen for Voters)
  if (stationRole === 'kiosk') {
    return (
      <ErrorBoundary fallbackTitle="خطا در اجرای کیوسک لمسی اخذ رأی">
        <TouchVotingKiosk
          session={session}
          candidates={candidates}
          onVoteCast={(candId) => handleIncrementVote(candId, 1)}
          onExitKiosk={() => handleSelectStationRole('master')}
        />
      </ErrorBoundary>
    );
  }

  // 2. Dedicated Check-in Terminal Screen (Laptop 2 for Registration Desk)
  if (stationRole === 'checkin') {
    return (
      <ErrorBoundary fallbackTitle="خطا در اجرای باجه ثبت ورود واجدین شرایط">
        <VoterCheckinTerminal
          session={session}
          voters={voters}
          currentOperator={currentOperator}
          isLocked={session.status === 'LOCKED_FINAL'}
          onToggleVoterStatus={handleToggleVoterStatus}
          onAddVoter={handleAddVoterQuick}
          onExitTerminal={() => handleSelectStationRole('master')}
        />
      </ErrorBoundary>
    );
  }

  // 3. Dedicated Live Projector View
  if (stationRole === 'projector') {
    return (
      <ErrorBoundary fallbackTitle="خطا در نمایش پروژکتور سالن">
        <div className="min-h-screen bg-slate-950">
          <ProjectorViewModal
            isOpen={true}
            onClose={() => handleSelectStationRole('master')}
            session={session}
            rankedCandidates={rankedCandidates}
            recentAuditEvents={auditEvents.slice(0, 6)}
            totalVotes={totalVotes}
            totalValidVotes={totalValidVotes}
          />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white print:bg-white print:text-black print:min-h-0" dir="rtl">
      
      {/* Header bar */}
      <Header
        session={session}
        currentOperator={currentOperator}
        operators={operators}
        onSelectOperator={setCurrentOperator}
        onOpenProjector={() => setIsProjectorOpen(true)}
        onExportExcel={handleExportExcel}
        totalVotes={totalVotes}
        onOpenSecurity={() => setIsSecurityModalOpen(true)}
        onOpenManualTallySheet={() => setIsManualTallyModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onOpenBackup={() => setIsBackupModalOpen(true)}
        onNavigateToArchive={() => setActiveTab('ARCHIVE')}
        onOpenNetworkHub={() => setIsNetworkHubModalOpen(true)}
        operatingMode={operatingMode}
        archivedCount={archivedSessions.length}
      />

      {/* Network Multi-Station Mode Active Notice */}
      {operatingMode === 'NETWORK_MULTI' && (
        <div className="no-print print:hidden bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/90 border-b border-indigo-500/30 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-indigo-200">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold">روش ۲: شبکه محلی و چندکاربره فعال است</span>
            <span className="text-slate-400 hidden md:inline">| لپ‌تاپ ۲ پذیرش و کیوسک لمسی آماده همگام‌سازی لحظه‌ای هستند</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => handleSelectStationRole('checkin')}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/40 hover:bg-indigo-600 text-indigo-100 border border-indigo-500/40 font-bold transition-colors"
            >
              لپ‌تاپ ۲: ثبت ورود
            </button>
            <button
              onClick={() => handleSelectStationRole('kiosk')}
              className="px-2.5 py-1 rounded-lg bg-emerald-600/40 hover:bg-emerald-600 text-emerald-100 border border-emerald-500/40 font-bold transition-colors"
            >
              کیوسک لمسی رأی
            </button>
            <button
              onClick={() => setIsNetworkHubModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-medium transition-colors"
            >
              کیوآرکد و تنظیمات
            </button>
          </div>
        </div>
      )}

      {/* Flash Banner if any */}
      {flashMessage && (
        <div className="no-print print:hidden bg-emerald-600/90 text-white text-xs font-bold py-2 px-4 text-center sticky top-[61px] z-30 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
          {flashMessage}
        </div>
      )}

      {/* Main Tab Navigation (Hidden in print) */}
      <nav className="no-print print:hidden bg-slate-900/90 border-b border-slate-800 sticky top-[61px] z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1 sm:gap-2 py-2">
            
            {/* Tab 1: Live Voting */}
            <button
              onClick={() => {
                setActiveTab('VOTING');
                if (!document.fullscreenElement) {
                  try {
                    document.documentElement.requestFullscreen?.();
                  } catch {
                    // ignore
                  }
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === 'VOTING'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Vote className="w-4 h-4" />
              <span>شمارش زنده و صندوق</span>
              <span className="font-mono text-xs px-1.5 py-0.2 rounded-md bg-slate-950/40">
                {toPersianDigits(totalVotes)}
              </span>
            </button>

            {/* Tab 2: Audit Ledger */}
            <button
              onClick={() => setActiveTab('AUDIT')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === 'AUDIT'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ScrollText className="w-4 h-4" />
              <span>دفتر کل ردگیری</span>
              <span className="font-mono text-xs px-1.5 py-0.2 rounded-md bg-slate-950/40">
                {toPersianDigits(auditEvents.length)}
              </span>
            </button>

            {/* Tab 3: Candidates */}
            <button
              onClick={() => setActiveTab('CANDIDATES')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === 'CANDIDATES'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>نامزدهای رسمی</span>
              <span className="font-mono text-xs px-1.5 py-0.2 rounded-md bg-slate-950/40">
                {toPersianDigits(candidates.length)}
              </span>
            </button>

            {/* Tab 4: Voters Roll */}
            <button
              onClick={() => setActiveTab('VOTERS')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === 'VOTERS'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>واجدین شرایط و بارکد</span>
              <span className="font-mono text-xs px-1.5 py-0.2 rounded-md bg-slate-950/40">
                {toPersianDigits(voters.filter(v => v.hasVoted).length)}/{toPersianDigits(voters.length)}
              </span>
            </button>

            {/* Tab 5: Ballot Paper Designer & Print (Requested by user) */}
            <button
              onClick={() => setActiveTab('BALLOTS')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === 'BALLOTS'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Ticket className="w-4 h-4 text-emerald-400" />
              <span>طراحی و چاپ تعرفه رأی</span>
            </button>

            {/* Tab 6: Session Lifecycle & Rules */}
            <button
              onClick={() => setActiveTab('SESSION')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === 'SESSION'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              <span>تنظیمات شعبه و عوامل</span>
            </button>

            {/* Tab 7: Official Minutes & Signatures */}
            <button
              onClick={() => setActiveTab('MINUTES')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === 'MINUTES'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-purple-300" />
              <span>صورتجلسه و امضاها</span>
              {session.status === 'LOCKED_FINAL' && (
                <span className="text-[10px] bg-purple-950/80 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-500/50">
                  قفل نهایی
                </span>
              )}
            </button>

            {/* Tab 8: Sessions Archive (بایگانی جلسات) */}
            <button
              onClick={() => setActiveTab('ARCHIVE')}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 whitespace-nowrap transition ${
                activeTab === 'ARCHIVE'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Archive className="w-4 h-4 text-purple-400" />
              <span>بایگانی جلسات</span>
              <span className="font-mono text-xs px-1.5 py-0.2 rounded-md bg-slate-950/40">
                {toPersianDigits(archivedSessions.length)}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Body Area */}
      <main className={`flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 print:p-0 print:m-0 print:max-w-none print:w-full ${isManualTallyModalOpen ? 'print:hidden' : ''}`}>
        {/* Readiness Alert when all demo participants have been wiped */}
        {!isDemoMode && operators.length === 0 && (
          <div className="no-print print:hidden mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/70 to-teal-950/70 border-2 border-emerald-500/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">سامانه برای شروع انتخابات رسمی کاملاً پاک‌سازی شد</h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  تمامی داده‌ها و افراد دمو حذف شدند. لطفاً برای ثبت نام مسئولین واقعی، نامزدها و وارد کردن واجدین شرایط اقدام نمایید.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('SESSION')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 self-start sm:self-auto flex-shrink-0 shadow-md"
            >
              <UserPlus className="w-4 h-4" />
              <span>ثبت مسئول شعبه و اپراتورها</span>
            </button>
          </div>
        )}

        {activeTab === 'VOTING' && (
          <VotingCounterTab
            session={session}
            rankedCandidates={rankedCandidates}
            currentOperator={currentOperator}
            recentAuditEvents={auditEvents}
            onIncrementVote={handleIncrementVote}
            onRequestCorrection={(cand) => setCorrectionCandidate(cand)}
            onUpdateBlankBallots={handleUpdateBlankBallots}
            onUpdateInvalidBallots={handleUpdateInvalidBallots}
            totalVotes={totalVotes}
            totalValidVotes={totalValidVotes}
          />
        )}

        {activeTab === 'AUDIT' && (
          <AuditLedgerTab
            auditEvents={auditEvents}
            currentOperator={currentOperator}
            sessionTitle={session.title}
            isLocked={session.status === 'LOCKED_FINAL'}
            onRollbackEvent={handleRollbackEvent}
          />
        )}

        {activeTab === 'CANDIDATES' && (
          <CandidatesTab
            candidates={candidates}
            currentOperator={currentOperator}
            isLocked={session.status === 'LOCKED_FINAL'}
            onAddCandidate={handleAddCandidate}
            onGenerateSyntheticCandidates={handleGenerateSyntheticCandidates}
            onUpdateCandidatePhoto={handleUpdateCandidatePhoto}
            onUpdateCandidate={handleUpdateCandidate}
            onDeleteCandidate={handleDeleteCandidate}
            onOpenManualTallySheet={() => setIsManualTallyModalOpen(true)}
          />
        )}

        {activeTab === 'VOTERS' && (
          <VotersTab
            voters={voters}
            isLocked={session.status === 'LOCKED_FINAL'}
            currentOperator={currentOperator}
            onUpdateVoters={handleUpdateVoters}
            onToggleVoterStatus={handleToggleVoterStatus}
          />
        )}

        {activeTab === 'BALLOTS' && (
          <BallotPaperDesignerTab
            candidates={candidates}
            session={session}
            voters={voters}
            isLocked={session.status === 'LOCKED_FINAL'}
            onOpenManualTallySheet={() => setIsManualTallyModalOpen(true)}
          />
        )}

        {activeTab === 'SESSION' && (
          <SessionConfigTab
            session={session}
            isLocked={session.status === 'LOCKED_FINAL'}
            operators={operators}
            isDemoMode={isDemoMode}
            onUpdateSession={handleUpdateSession}
            onAdvanceStatus={handleAdvanceStatus}
            onUpdateOperators={handleUpdateOperators}
            onSwitchToRealElection={handleSwitchToRealElection}
            onLoadDemoData={handleLoadDemoData}
          />
        )}

        {activeTab === 'MINUTES' && (
          <OfficialMinutesTab
            session={session}
            rankedCandidates={rankedCandidates}
            auditEvents={auditEvents}
            totalVotes={totalVotes}
            totalValidVotes={totalValidVotes}
            onSavePersonSignature={handleSavePersonSignature}
            onLockSessionFinal={handleLockSessionFinal}
            onExportExcel={handleExportExcel}
          />
        )}

        {activeTab === 'ARCHIVE' && (
          <SessionsArchiveTab
            archivedSessions={archivedSessions}
            onRefreshArchives={() => setArchivedSessions(getArchivedSessions())}
            onRestoreSession={handleRestoreArchivedSession}
            currentSession={session}
            currentCandidates={candidates}
            currentAuditEvents={auditEvents}
            currentOperators={operators}
            currentVoters={voters}
            onArchiveCurrentSession={() => handleArchiveCurrentSession()}
          />
        )}
      </main>

      {/* Footer (Designer & Developer Attribution - Point 2) */}
      <footer className="no-print print:hidden bg-slate-950 border-t border-slate-800 text-slate-400 py-4 px-6 text-xs text-center">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
            <span className="text-slate-400 font-medium">نام طراح و سازنده:</span>
            <span className="font-bold text-white bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-700/80 shadow-sm">
              بابک بهرامی پور
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 font-medium">ایمیل:</span>
            <a 
              href="mailto:babakbahramipour@gmail.com" 
              className="font-mono text-emerald-400 hover:text-emerald-300 hover:underline transition font-semibold"
              dir="ltr"
            >
              babakbahramipour@gmail.com
            </a>
          </div>

          <div className="text-slate-500 font-mono text-[11px] flex items-center gap-2 flex-wrap justify-center">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>شناسه جلسه: {session.id}</span>
            <span>•</span>
            <span>دفتر کل ممیزی رمزنگاری‌شده فعال است</span>
          </div>
        </div>
      </footer>

      {/* Mandatory Reason Vote Correction Modal */}
      {correctionCandidate && (
        <VoteCorrectionModal
          candidate={correctionCandidate}
          currentOperator={currentOperator}
          isOpen={true}
          onClose={() => setCorrectionCandidate(null)}
          onConfirm={handleConfirmVoteCorrection}
        />
      )}

      {/* Projector / Presentation Modal */}
      <ProjectorViewModal
        isOpen={isProjectorOpen}
        onClose={() => setIsProjectorOpen(false)}
        session={session}
        rankedCandidates={rankedCandidates}
        recentAuditEvents={auditEvents}
        totalVotes={totalVotes}
        totalValidVotes={totalValidVotes}
      />

      {/* Backup and Restore Modal */}
      <BackupRestoreModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        session={session}
        candidates={candidates}
        auditEvents={auditEvents}
        operators={operators}
        voters={voters}
        onRestoreData={({ session: s, candidates: c, auditEvents: a, operators: ops, voters: vts }) => {
          setSession(s);
          setCandidates(c);
          setAuditEvents(a);
          if (ops && ops.length > 0) setOperators(ops);
          if (vts && vts.length > 0) setVoters(vts);
          showFlash('بازیابی اطلاعات با موفقیت انجام شد.');
        }}
        onResetSession={handleResetSession}
      />

      {/* App Lock Screen Modal (Point 3) */}
      <AppLockScreenModal
        isLocked={isAppLocked}
        onUnlocked={() => setIsAppLocked(false)}
        sessionTitle={session.title}
      />

      {/* Security, Password & License Modal (Point 3) */}
      {isSecurityModalOpen && (
        <ErrorBoundary key={String(isSecurityModalOpen)} fallbackTitle="خطا در باز شدن پنجره تنظیمات امنیتی">
          <SecurityConfigModal
            isOpen={isSecurityModalOpen}
            onClose={() => setIsSecurityModalOpen(false)}
            onLockAppNow={() => {
              setIsSecurityModalOpen(false);
              setIsAppLocked(true);
            }}
            onLicenseChanged={() => setLicenseData(getLicenseStatus())}
          />
        </ErrorBoundary>
      )}

      {/* Manual Tally Sheet Modal (5 clusters of 10 grid boxes per candidate) */}
      <ManualTallySheetModal
        isOpen={isManualTallyModalOpen}
        onClose={() => setIsManualTallyModalOpen(false)}
        candidates={candidates}
        session={session}
      />

      {/* Comprehensive Election Workflow & Tools Guide Modal */}
      <ElectionGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setIsGuideModalOpen(false);
        }}
        onOpenManualTallySheet={() => {
          setIsGuideModalOpen(false);
          setIsManualTallyModalOpen(true);
        }}
        onOpenProjector={() => {
          setIsGuideModalOpen(false);
          setIsProjectorOpen(true);
        }}
        onOpenBackup={() => {
          setIsGuideModalOpen(false);
          setIsBackupModalOpen(true);
        }}
        onOpenSecurity={() => {
          setIsGuideModalOpen(false);
          setIsSecurityModalOpen(true);
        }}
      />

      {/* Network & WiFi Station Selector Modal (روش سابق / روش شبکه و کیوسک) */}
      <NetworkHubModal
        isOpen={isNetworkHubModalOpen}
        onClose={() => setIsNetworkHubModalOpen(false)}
        currentMode={operatingMode}
        onSelectMode={handleSelectMode}
        onSelectStationRole={handleSelectStationRole}
      />
    </div>
  );
}
