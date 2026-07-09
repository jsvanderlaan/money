import { Injectable, inject, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { PatternType } from './unlabeled-patterns.service';

export interface LabelSuggestionAuditEntry {
    timestamp: string;
    sourceType: PatternType;
    sourceLabel: string;
    suggestedName: string;
    action: 'draft-created' | 'saved';
}

@Injectable({
    providedIn: 'root',
})
export class LabelSuggestionAuditService {
    private readonly storageKey = 'label_suggestion_audit';
    private readonly maxEntries = 300;
    private readonly storage = inject(StorageService);

    readonly entries = signal<LabelSuggestionAuditEntry[]>([]);

    constructor() {
        this.entries.set(this.storage.getObject<LabelSuggestionAuditEntry[]>(this.storageKey) || []);
    }

    record(entry: LabelSuggestionAuditEntry): void {
        const next = [...this.entries(), entry].slice(-this.maxEntries);
        this.entries.set(next);
        this.storage.setObject(this.storageKey, next);
    }
}
