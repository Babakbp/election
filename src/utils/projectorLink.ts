/**
 * Utility functions for generating, opening, and verifying the Hall Projector URL
 * Handles browser popup blocker detection, iframe constraints, and fallback strategies.
 */

export const getProjectorUrl = (): string => {
  if (typeof window === 'undefined') return '/?station=projector';
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('station', 'projector');
    // Clear any hash if present to ensure clean search param handling
    return url.toString();
  } catch {
    return `${window.location.origin}/?station=projector`;
  }
};

export interface OpenProjectorResult {
  success: boolean;
  blocked: boolean;
  url: string;
}

export const tryOpenProjectorWindow = (): OpenProjectorResult => {
  const url = getProjectorUrl();
  try {
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    // In modern browsers, a blocked popup returns null, undefined, or an immediate closed handle
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      return { success: false, blocked: true, url };
    }
    // Attempt focus if allowed
    try {
      newWindow.focus();
    } catch {
      // Ignore cross-origin or focus errors
    }
    return { success: true, blocked: false, url };
  } catch (err) {
    console.warn('Browser prevented window.open:', err);
    return { success: false, blocked: true, url };
  }
};

export const isRunningInIframe = (): boolean => {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
};
