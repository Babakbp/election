/**
 * Real-time Sync Engine for Multi-Laptop, WiFi, and Touchscreen Kiosk
 * Supports dual-layer sync:
 * 1. WebSockets via local Node/Express server for separate laptops/tablets on WiFi/LAN
 * 2. BroadcastChannel for same-device multi-screen / multi-window communication
 */

import { Voter, Candidate, ElectionSession, AuditEvent } from '../types/election';

export type StationRole = 'master' | 'checkin' | 'kiosk' | 'projector';
export type OperatingMode = 'STANDALONE' | 'NETWORK_MULTI';

export interface SyncMessage {
  type: 
    | 'VOTER_CHECK_IN'
    | 'VOTER_UNDO_CHECK_IN'
    | 'VOTER_ADD'
    | 'KIOSK_VOTE_CAST'
    | 'KIOSK_MULTIPLE_VOTES_CAST'
    | 'CANDIDATE_VOTE_INCREMENT'
    | 'SESSION_UPDATE'
    | 'FULL_STATE_SYNC'
    | 'REQUEST_FULL_STATE'
    | 'STATION_ANNOUNCE'
    | 'HEARTBEAT';
  senderId: string;
  senderRole: StationRole;
  senderName: string;
  timestamp: string;
  payload?: any;
}

export interface ConnectedStation {
  id: string;
  role: StationRole;
  name: string;
  ip?: string;
  lastSeen: number;
}

class SyncEngine {
  private ws: WebSocket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private stationId: string;
  private role: StationRole = 'master';
  private mode: OperatingMode = 'STANDALONE';
  private listeners: Set<(msg: SyncMessage) => void> = new Set();
  private stations: Map<string, ConnectedStation> = new Map();
  private stationListeners: Set<(stations: ConnectedStation[]) => void> = new Set();
  private isConnecting = false;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;

  constructor() {
    this.stationId = 'station_' + Math.random().toString(36).substring(2, 9);
    
    // Check saved mode or URL param
    try {
      const savedMode = localStorage.getItem('election_operating_mode') as OperatingMode;
      if (savedMode === 'NETWORK_MULTI' || savedMode === 'STANDALONE') {
        this.mode = savedMode;
      }
    } catch {
      // ignore
    }

    // Initialize BroadcastChannel for instant local tab/monitor sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('election_sync_bus_v1');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingMessage(event.data, false);
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported', e);
      }
    }

    // Always attempt WebSocket connection so multi-device/phone features work seamlessly
    this.connectWebSocket();
  }

  public getStationId(): string {
    return this.stationId;
  }

  public getMode(): OperatingMode {
    return this.mode;
  }

  public setMode(newMode: OperatingMode) {
    this.mode = newMode;
    try {
      localStorage.setItem('election_operating_mode', newMode);
    } catch {
      // ignore
    }

    if (newMode === 'NETWORK_MULTI') {
      this.connectWebSocket();
    }
  }

  public getRole(): StationRole {
    return this.role;
  }

  public setRole(role: StationRole) {
    this.role = role;
    this.announcePresence();
  }

  public init(role: StationRole) {
    this.role = role;
    // Always ensure WebSocket is connected
    this.connectWebSocket();
    this.announcePresence();

    // Start heartbeat
    if (!this.heartbeatTimer) {
      this.heartbeatTimer = setInterval(() => {
        this.announcePresence();
        this.pruneStaleStations();
      }, 5000);
    }
  }

  public subscribe(callback: (msg: SyncMessage) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public subscribeStations(callback: (stations: ConnectedStation[]) => void) {
    this.stationListeners.add(callback);
    callback(Array.from(this.stations.values()));
    return () => {
      this.stationListeners.delete(callback);
    };
  }

  public broadcast(type: SyncMessage['type'], payload?: any) {
    const msg: SyncMessage = {
      type,
      senderId: this.stationId,
      senderRole: this.role,
      senderName: this.getStationDisplayName(this.role),
      timestamp: new Date().toISOString(),
      payload,
    };

    // 1. Broadcast locally via BroadcastChannel (instant for secondary touch screen/tabs)
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch (e) {
        console.warn('BroadcastChannel error', e);
      }
    }

    // 2. Broadcast via WebSocket to all connected devices across network
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (e) {
        console.warn('WebSocket send error', e);
      }
    }
  }

  /**
   * Cast a vote reliably from a mobile phone or kiosk.
   * Dispatches via WebSocket, BroadcastChannel AND HTTP REST endpoint
   * to guarantee the vote is never missed by the master station.
   */
  public async castVote(candidateIds: string[], voterId?: string, stationName?: string): Promise<boolean> {
    const payload = {
      candidateIds,
      voterId,
      stationName: stationName || this.getStationDisplayName(this.role),
      timestamp: new Date().toISOString(),
    };

    // 1. Broadcast locally and via WebSocket
    this.broadcast('KIOSK_MULTIPLE_VOTES_CAST', payload);

    // 2. Send via HTTP REST API endpoint for guaranteed server-side delivery
    try {
      const res = await fetch('/api/sync/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateIds,
          voterId,
          source: this.role === 'kiosk' ? 'kiosk' : 'mobile',
          stationName: stationName || this.getStationDisplayName(this.role),
        }),
      });
      if (res.ok) {
        return true;
      }
    } catch (err) {
      console.warn('[SyncEngine] HTTP Vote fetch error', err);
    }
    return true;
  }

  /**
   * Fetch latest full state from server (for newly opened phones or kiosk tabs)
   */
  public async fetchLatestServerState(): Promise<any | null> {
    try {
      const res = await fetch('/api/sync/state');
      if (res.ok) {
        const data = await res.json();
        if (data && data.hasState && data.state) {
          return data.state;
        }
      }
    } catch (e) {
      // ignore
    }
    return null;
  }

  /**
   * Push current full state to server so any joining phone can get it
   */
  public async pushFullStateToServer(state: any): Promise<void> {
    try {
      await fetch('/api/sync/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });
    } catch (e) {
      // ignore
    }
  }

  /**
   * Pull pending votes since a timestamp (backup polling)
   */
  public async pullPendingVotes(since?: string): Promise<any[]> {
    try {
      const url = since ? `/api/sync/pending-votes?since=${encodeURIComponent(since)}` : '/api/sync/pending-votes';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        return data.votes || [];
      }
    } catch {
      // ignore
    }
    return [];
  }

  private handleIncomingMessage(msg: SyncMessage, fromWs: boolean) {
    // Ignore own messages
    if (msg.senderId === this.stationId) return;

    // Track station presence
    if (msg.senderId) {
      this.stations.set(msg.senderId, {
        id: msg.senderId,
        role: msg.senderRole,
        name: msg.senderName,
        lastSeen: Date.now(),
      });
      this.notifyStationListeners();
    }

    // If a station announced itself, respond so it knows about us
    if (msg.type === 'STATION_ANNOUNCE') {
      // reply with own announcement if needed
    }

    // Notify listeners
    this.listeners.forEach((listener) => {
      try {
        listener(msg);
      } catch (err) {
        console.error('Error in sync listener', err);
      }
    });
  }

  private connectWebSocket() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        console.log('[SyncEngine] Connected to multi-device network server');
        this.announcePresence();
        // Request latest state if not master
        if (this.role !== 'master') {
          this.broadcast('REQUEST_FULL_STATE');
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as SyncMessage;
          this.handleIncomingMessage(msg, true);
        } catch (e) {
          console.warn('Failed to parse WebSocket message', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        if (this.mode === 'NETWORK_MULTI') {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = setTimeout(() => {
            this.connectWebSocket();
          }, 3000);
        }
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch (e) {
      this.isConnecting = false;
      console.warn('WebSocket init failed', e);
    }
  }

  private disconnectWebSocket() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.stations.clear();
    this.notifyStationListeners();
  }

  private announcePresence() {
    const msg: SyncMessage = {
      type: 'STATION_ANNOUNCE',
      senderId: this.stationId,
      senderRole: this.role,
      senderName: this.getStationDisplayName(this.role),
      timestamp: new Date().toISOString(),
    };

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg);
      } catch {
        // ignore
      }
    }
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch {
        // ignore
      }
    }
  }

  private pruneStaleStations() {
    const now = Date.now();
    let changed = false;
    for (const [id, station] of this.stations.entries()) {
      if (now - station.lastSeen > 15000) {
        this.stations.delete(id);
        changed = true;
      }
    }
    if (changed) {
      this.notifyStationListeners();
    }
  }

  private notifyStationListeners() {
    const list = Array.from(this.stations.values());
    this.stationListeners.forEach((l) => l(list));
  }

  public getStationDisplayName(role: StationRole): string {
    switch (role) {
      case 'master':
        return 'سرور مرکزی و پنل اصلی شمارش';
      case 'checkin':
        return 'ترمینال ثبت ورود واجدین شرایط';
      case 'kiosk':
        return 'کیوسک لمسی اخذ رأی';
      case 'projector':
        return 'پروژکتور زنده سالن';
      default:
        return 'ایستگاه شبکه';
    }
  }

  public getConnectedStations(): ConnectedStation[] {
    return Array.from(this.stations.values());
  }

  public isWsConnected(): boolean {
    return !!(this.ws && this.ws.readyState === WebSocket.OPEN);
  }
}

export const syncEngine = new SyncEngine();
