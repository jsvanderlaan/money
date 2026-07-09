import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    private readonly platformId = inject(PLATFORM_ID);

    setObject(key: string, value: any) {
        if (!isPlatformBrowser(this.platformId)) return;
        localStorage.setItem(key, JSON.stringify(value));
    }

    getObject<T>(key: string): T | null {
        if (!isPlatformBrowser(this.platformId)) return null;
        const v = localStorage.getItem(key);
        return v ? (JSON.parse(v) as T) : null;
    }

    remove(key: string) {
        if (!isPlatformBrowser(this.platformId)) return;
        localStorage.removeItem(key);
    }
}
