export type LabelRuleField = 'type' | 'description' | 'merchant' | 'naam' | 'amount';

export type LabelRuleOperator = 'is' | 'includes' | 'gt' | 'lt';

/**
 * A single atomic condition, e.g. "description includes netflix".
 */
export interface RuleCondition {
    id: string;
    kind: 'condition';
    field: LabelRuleField;
    operator: LabelRuleOperator;
    value: string;
}

/**
 * A rule that checks whether a transaction already has another label applied.
 * Note: this creates an ordering dependency — label referenced here must be
 * created before it can be used in a "has label" rule.
 */
export interface RuleHasLabel {
    id: string;
    kind: 'hasLabel';
    labelId: string;
}

/**
 * A group node allowing composition of other rule nodes using AND / OR.
 * Example: (A or B) and (C or D) => kind: 'group', operator: 'and', children: [ {group or conditions} ]
 */
export interface RuleGroup {
    id: string;
    kind: 'group';
    operator: 'and' | 'or';
    children: RuleNode[];
}

export type RuleNode = RuleCondition | RuleHasLabel | RuleGroup;

export interface Label {
    id: string;
    name: string;
    color: string; // hex or css color
    /**
     * Root rule node that determines whether the label applies to a transaction.
     * This allows arbitrarily nested boolean expressions, e.g. (A or B) and (C or D).
     */
    rules: RuleNode;
    enabled: boolean;
}
