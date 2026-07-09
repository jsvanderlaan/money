import { Injectable } from '@angular/core';
import { Transaction, TransactionExtra, TransactionType } from '../types/transaction.type';
import { ParseDiagnosticsService } from './parse-diagnostics.service';

interface ParsedDescription {
    type: TransactionType | undefined;
    extra: TransactionExtra;
}

type DescriptionParser = (description: string) => ParsedDescription | null;

@Injectable({
    providedIn: 'root',
})
export class ParseService {
    private readonly descriptionParsers: DescriptionParser[] = [
        description => this.parseCardDescription(description),
        description => this.parseSepaTransferDescription(description),
        description => this.parseSepaIncassoDescription(description),
        description => this.parseAbnAmroDescription(description),
        description => this.parseTrtpDescription(description),
    ];

    constructor(private readonly diagnostics: ParseDiagnosticsService) {}

    parseTabFile(data: string): Transaction[] {
        const lines = data.split('\n');
        this.diagnostics.beginRun(lines.length);

        const jsonData = lines.map(line => {
            if (!line.trim()) {
                this.diagnostics.recordEmptyLine();
                return null;
            }

            this.diagnostics.recordNonEmptyLine();
            const values = line.split('\t');
            let description = values[7]?.trim();
            const { type, extra } = this.parseTabDescription(description);

            return {
                currency: values[1],
                // parse date like 20220912 to UTC Date
                date: new Date(
                    Date.UTC(
                        +values[2].substring(0, 4),
                        +values[2].substring(4, 6) - 1, // months are 0-based
                        +values[2].substring(6, 8),
                        0, // hours
                        0, // minutes
                        0 // seconds
                    )
                ),
                balanceStart: this.parseDutchNumber(values[3]),
                balanceEnd: this.parseDutchNumber(values[4]),
                amount: this.parseDutchNumber(values[6]),
                description,
                type,
                ...extra,
            };
        });

        const parsed = jsonData.filter(item => item !== null) as Transaction[];
        this.diagnostics.completeRun(parsed.length);
        return parsed;
    }

    private parseTabDescription(description: string): ParsedDescription {
        for (const parser of this.descriptionParsers) {
            const parsed = parser(description);
            if (parsed) return parsed;
        }

        this.diagnostics.recordUnknownType(description);
        console.log('Unknown description type:', description);
        return { type: undefined, extra: {} };
    }

    private parseCardDescription(description: string): ParsedDescription | null {
        if (
            !description.startsWith('BEA, Betaalpas') &&
            !description.startsWith('GEA, Betaalpas') &&
            !description.startsWith('BEA, Garmin Pay')
        ) {
            return null;
        }

        let type: TransactionType;
        if (description.startsWith('GEA, Betaalpas')) {
            type = TransactionType.BetaalpasTerugboeking;
        } else if (description.startsWith('BEA, Garmin Pay')) {
            type = TransactionType.GarminPay;
        } else {
            type = TransactionType.Betaalpas;
        }

        const x = description.match(
            /^.+\s{2,}(.+?),PAS0*(\d+)\s+NR:([A-Za-z0-9]+)[, ]+\s*(\d{2}\.\d{2}\.\d{2}[\/\.]\d{2}[:\.]\d{2})\s+(.+?)(?:,\s+Land:\s*([A-Z]{3})(.*))?$/
        );
        if (!x) {
            this.diagnostics.recordPatternMiss(description);
            console.log('No match for description:', description);
            return { type, extra: {} };
        }

        const [, merchant, pasNumber, nr, dateTime, city, countryCode, extraInfo] = x;
        return {
            type,
            extra: {
                merchant: merchant?.trim(),
                pasNumber,
                nr,
                dateTime,
                city,
                countryCode,
                extraInfo: extraInfo?.trim(),
            },
        };
    }

    private parseSepaTransferDescription(description: string): ParsedDescription | null {
        if (
            !description.startsWith('SEPA Overboeking') &&
            !description.startsWith('SEPA iDEAL') &&
            !description.startsWith('SEPA Periodieke overb.')
        ) {
            return null;
        }

        let type: TransactionType;
        if (description.startsWith('SEPA Overboeking')) {
            type = TransactionType.Overboeking;
        } else if (description.startsWith('SEPA iDEAL')) {
            type = TransactionType.iDEAL;
        } else {
            type = TransactionType.PeriodiekeOverboeking;
        }

        const x = description.match(
            /IBAN:\s*([A-Z0-9]+)\s+BIC:\s*([A-Z0-9]+)\s+Naam:\s*(.+?)(?:\s+Omschrijving:\s*(.+?))?(?:\s+Kenmerk:\s*(.+?))?$/
        );
        if (!x) {
            this.diagnostics.recordPatternMiss(description);
            console.log('No match for description:', description);
            return { type, extra: {} };
        }

        const [, iban, bic, naam, omschrijving, kenmerk] = x;
        return {
            type,
            extra: {
                iban,
                bic,
                naam,
                omschrijving,
                kenmerk,
            },
        };
    }

    private parseSepaIncassoDescription(description: string): ParsedDescription | null {
        if (!description.startsWith('SEPA Incasso algemeen doorlopend')) return null;

        const trimmed = description.replace('SEPA Incasso algemeen doorlopend', '').trim();
        const x = trimmed.match(
            /Incassant:\s*([A-Z0-9]+)\s*Naam:\s*(.+?)\s*Machtiging:\s*(.+)\s*Omschrijving:\s*(.+?)(?:\s*IBAN:\s*([A-Z0-9]+))?(?:\s+Kenmerk:\s*([^\s]+))?(?:\s+Voor:\s*(.+?))?$/s
        );
        if (!x) {
            this.diagnostics.recordPatternMiss(description);
            console.log('No match for description:', description);
            return { type: TransactionType.IncassoAlgemeenDoorlopend, extra: {} };
        }

        const [, incassant, naam, machtiging, omschrijving, iban, kenmerk, voor] = x;
        return {
            type: TransactionType.IncassoAlgemeenDoorlopend,
            extra: {
                incassant,
                naam,
                machtiging: machtiging?.trim(),
                omschrijving,
                iban,
                kenmerk,
                voor,
            },
        };
    }

    private parseAbnAmroDescription(description: string): ParsedDescription | null {
        if (!description.startsWith('ABN AMRO Bank N.V.')) return null;
        return {
            type: TransactionType.Bankkosten,
            extra: {},
        };
    }

    private parseTrtpDescription(description: string): ParsedDescription | null {
        if (!/^\/TRTP\//.test(description)) return null;

        const fields = {} as any;
        const regex = /\/([A-Z]+)\/([^\/]*)/g;
        let match;
        while ((match = regex.exec(description)) !== null) {
            fields[match[1]] = match[2].trim();
        }

        return {
            type: fields.TRTP,
            extra: {
                iban: fields.IBAN,
                bic: fields.BIC,
                naam: fields.NAME,
                omschrijving: fields.REMI,
                kenmerk: fields.EREF,
                csid: fields.CSID,
                machtiging: fields.MARF,
            },
        };
    }

    parseDutchNumber(value: string): number {
        if (!value) return 0;
        if (value.includes(',')) {
            return parseFloat(value.replace('.', '').replace(',', '.'));
        }
        return parseFloat(value);
    }
}
