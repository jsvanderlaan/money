import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';

export interface ParseDiagnosticsSummary {
    ranAt: string;
    totalLines: number;
    nonEmptyLines: number;
    ignoredEmptyLines: number;
    parsedTransactions: number;
    unknownTypeCount: number;
    unmatchedKnownPatternCount: number;
    successRatio: number;
    unknownSamples: string[];
}

interface ParseRunState {
    totalLines: number;
    nonEmptyLines: number;
    ignoredEmptyLines: number;
    unknownTypeCount: number;
    unmatchedKnownPatternCount: number;
    unknownSamples: string[];
}

@Injectable({
    providedIn: 'root',
})
export class ParseDiagnosticsService {
    private readonly storageKey = 'tx_parse_diagnostics_last';
    private runState: ParseRunState | null = null;

    readonly lastRun = signal<ParseDiagnosticsSummary | null>(null);

    constructor(private readonly storage: StorageService) {
        this.lastRun.set(this.storage.getObject<ParseDiagnosticsSummary>(this.storageKey));
    }

    beginRun(totalLines: number): void {
        this.runState = {
            totalLines,
            nonEmptyLines: 0,
            ignoredEmptyLines: 0,
            unknownTypeCount: 0,
            unmatchedKnownPatternCount: 0,
            unknownSamples: [],
        };
    }

    recordEmptyLine(): void {
        if (!this.runState) return;
        this.runState.ignoredEmptyLines += 1;
    }

    recordNonEmptyLine(): void {
        if (!this.runState) return;
        this.runState.nonEmptyLines += 1;
    }

    recordUnknownType(description: string): void {
        if (!this.runState) return;
        this.runState.unknownTypeCount += 1;
        this.pushSample(description);
    }

    recordPatternMiss(description: string): void {
        if (!this.runState) return;
        this.runState.unmatchedKnownPatternCount += 1;
        this.pushSample(description);
    }

    completeRun(parsedTransactions: number): void {
        if (!this.runState) return;

        const recognized = Math.max(0, this.runState.nonEmptyLines - this.runState.unknownTypeCount);
        const successRatio = this.runState.nonEmptyLines ? Math.round((recognized / this.runState.nonEmptyLines) * 1000) / 10 : 0;

        const summary: ParseDiagnosticsSummary = {
            ranAt: new Date().toISOString(),
            totalLines: this.runState.totalLines,
            nonEmptyLines: this.runState.nonEmptyLines,
            ignoredEmptyLines: this.runState.ignoredEmptyLines,
            parsedTransactions,
            unknownTypeCount: this.runState.unknownTypeCount,
            unmatchedKnownPatternCount: this.runState.unmatchedKnownPatternCount,
            successRatio,
            unknownSamples: this.runState.unknownSamples,
        };

        this.storage.setObject(this.storageKey, summary);
        this.lastRun.set(summary);
        this.runState = null;
    }

    private pushSample(description: string): void {
        if (!this.runState) return;
        if (!description) return;
        if (this.runState.unknownSamples.length >= 5) return;
        this.runState.unknownSamples.push(description.slice(0, 160));
    }
}
