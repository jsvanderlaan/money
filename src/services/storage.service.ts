import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    setObject(key: string, value: any) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    getObject<T>(key: string): T | null {
        const v = localStorage.getItem(key);
        return v ? (JSON.parse(v) as T) : null;
    }

    remove(key: string) {
        localStorage.removeItem(key);
    }
}
