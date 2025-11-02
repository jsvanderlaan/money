import { Label } from '../types/label.type';

export const DEFAULT_LABELS: Label[] = [
    {
        id: 'lbl_netflix',
        name: 'Netflix',
        color: '#E50914',
        enabled: true,
        // (type is 'Incasso algemeen doorlopend') AND (description includes 'netflix')
        rules: {
            id: 'g1',
            kind: 'group',
            operator: 'and',
            children: [
                {
                    id: 'r1',
                    kind: 'condition',
                    field: 'type',
                    operator: 'is',
                    value: 'Incasso algemeen doorlopend',
                },
                {
                    id: 'r2',
                    kind: 'condition',
                    field: 'description',
                    operator: 'includes',
                    value: 'netflix',
                },
            ],
        },
    },
    {
        id: 'lbl_groceries',
        name: 'Groceries',
        color: '#10B981',
        enabled: true,
        rules: {
            id: 'r3',
            kind: 'condition',
            field: 'description',
            operator: 'includes',
            value: 'supermarkt',
        },
    },
    {
        id: 'lbl_salary',
        name: 'Salary',
        color: '#3B82F6',
        enabled: false,
        rules: {
            id: 'r4',
            kind: 'condition',
            field: 'description',
            operator: 'includes',
            value: 'salary',
        },
    },
];
