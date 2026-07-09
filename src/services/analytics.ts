import { Injectable } from '@angular/core';

type PlausibleProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: PlausibleProps }) => void;
  }
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsService {
  track(event: string, props?: PlausibleProps): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (localStorage.getItem('plausible_ignore') === 'true') {
      return;
    }

    const plausible = window.plausible;
    if (!plausible) {
      return;
    }

    try {
      plausible(event, props ? { props } : undefined);
    } catch {
      // Ignore analytics errors
    }
  }
}
