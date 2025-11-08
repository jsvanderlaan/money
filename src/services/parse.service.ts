import { Injectable } from '@angular/core';
import { Transaction, TransactionExtra, TransactionType } from '../types/transaction.type';

@Injectable({
    providedIn: 'root',
})
export class ParseService {
    parseTabFile(data: string): Transaction[] {
        const lines = data.split('\n');
        const jsonData = lines.map(line => {
            if (!line.trim()) return null;
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
        return jsonData.filter(item => item !== null) as Transaction[];
    }

    private parseTabDescription(description: string): {
        type: TransactionType | undefined;
        extra: TransactionExtra;
    } {
        let type;
        let extra: TransactionExtra = {};
        if (
            description.startsWith('BEA, Betaalpas') ||
            description.startsWith('GEA, Betaalpas') ||
            description.startsWith('BEA, Garmin Pay')
        ) {
            // description = description.replace("BEA, Betaalpas", "").trim();
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
            if (x) {
                const [, merchant, pasNumber, nr, dateTime, city, countryCode, extraInfo] = x;
                extra = {
                    merchant: merchant?.trim(),
                    pasNumber,
                    nr,
                    dateTime,
                    city,
                    countryCode,
                    extraInfo: extraInfo?.trim(),
                };
            } else {
                console.log('No match for description:', description);
            }
        } else if (
            description.startsWith('SEPA Overboeking') ||
            description.startsWith('SEPA iDEAL') ||
            description.startsWith('SEPA Periodieke overb.')
        ) {
            // description = description.replace("SEPA Overboeking", "").trim();
            if (description.startsWith('SEPA Overboeking')) {
                type = TransactionType.Overboeking;
            } else if (description.startsWith('SEPA iDEAL')) {
                type = TransactionType.iDEAL;
            } else if (description.startsWith('SEPA Periodieke overb.')) {
                type = TransactionType.PeriodiekeOverboeking;
            }
            const x = description.match(
                /IBAN:\s*([A-Z0-9]+)\s+BIC:\s*([A-Z0-9]+)\s+Naam:\s*(.+?)(?:\s+Omschrijving:\s*(.+?))?(?:\s+Kenmerk:\s*(.+?))?$/
            );
            if (x) {
                const [, iban, bic, naam, omschrijving, kenmerk] = x;
                extra = {
                    iban,
                    bic,
                    naam,
                    omschrijving,
                    kenmerk,
                };
            } else {
                console.log('No match for description:', description);
            }
        } else if (description.startsWith('SEPA Incasso algemeen doorlopend')) {
            description = description.replace('SEPA Incasso algemeen doorlopend', '').trim();
            type = TransactionType.IncassoAlgemeenDoorlopend;
            const x = description.match(
                /Incassant:\s*([A-Z0-9]+)\s*Naam:\s*(.+?)\s*Machtiging:\s*(.+)\s*Omschrijving:\s*(.+?)(?:\s*IBAN:\s*([A-Z0-9]+))?(?:\s+Kenmerk:\s*([^\s]+))?(?:\s+Voor:\s*(.+?))?$/s
            );
            if (x) {
                const [, incassant, naam, machtiging, omschrijving, iban, kenmerk, voor] = x;
                extra = {
                    incassant,
                    naam,
                    machtiging: machtiging?.trim(),
                    omschrijving,
                    iban,
                    kenmerk,
                    voor,
                };
            } else {
                console.log('No match for description:', description);
            }
        } else if (description.startsWith('ABN AMRO Bank N.V.')) {
            description = description.replace('ABN AMRO Bank N.V.', '').trim();
            type = TransactionType.Bankkosten;
        } else if (/^\/TRTP\//.test(description)) {
            // Parse /FIELD/VALUE/ pairs
            const fields = {} as any;
            // Match all /FIELD/VALUE/ pairs
            const regex = /\/([A-Z]+)\/([^\/]*)/g;
            let match;
            while ((match = regex.exec(description)) !== null) {
                fields[match[1]] = match[2].trim();
            }
            type = fields.TRTP;
            extra = {
                iban: fields.IBAN,
                bic: fields.BIC,
                naam: fields.NAME,
                omschrijving: fields.REMI,
                kenmerk: fields.EREF,
                csid: fields.CSID,
                machtiging: fields.MARF,
            };
        } else {
            type = undefined;
            console.log('Unknown description type:', description);
        }
        return { type, extra };
    }

    parseDutchNumber(value: string): number {
        if (!value) return 0;
        if (value.includes(',')) {
            return parseFloat(value.replace('.', '').replace(',', '.'));
        }
        return parseFloat(value);
    }
}
