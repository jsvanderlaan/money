export interface Transaction extends TransactionExtra {
  currency: string;
  date: Date;
  balanceStart: number;
  balanceEnd: number;
  amount: number;
  description: string;
  type: TransactionType;
}

export interface TransactionExtra {
  merchant?: string;
  pasNumber?: string;
  nr?: string;
  dateTime?: string;
  city?: string;
  countryCode?: string;
  extraInfo?: string;
  iban?: string;
  bic?: string;
  naam?: string;
  omschrijving?: string;
  kenmerk?: string;
  incassant?: string;
  machtiging?: string;
  voor?: string;
  csid?: string;
}

export enum TransactionType {
  Betaalpas = "Betaalpas",
  Overboeking = "Overboeking",
  PeriodiekeOverboeking = "Periodieke overboeking",
  Incasso = "Incasso",
  IncassoAlgemeenDoorlopend = "Incasso algemeen doorlopend",
  iDEAL = "iDEAL",
  GarminPay = "Garmin Pay",
  Bankkosten = "Bankkosten",
  BetaalpasTerugboeking = "Betaalpas (terugboekingen)",
}
