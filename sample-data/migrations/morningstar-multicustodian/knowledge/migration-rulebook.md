# Morningstar → AMK migration rulebook

Governs the migration of multi-custodian wealth management domains into AMK target contracts[cite: 1].

## How to use this migration

- Author transformations, value crosswalks, joins, and validation checks in the executable tables below[cite: 1, 11].
- Saving edits updates the Control Plane package and flags the mapping specification for review[cite: 1, 2].

## Field transformations

| Entity | Target field | Source file | Expression |
| --- | --- | --- | --- |
| Account | account_id | morningstar_accounts.csv | {{account_ref}} |
| Account | household_id | morningstar_accounts.csv | {{household_ref}} |
| Account | custodian_code | morningstar_accounts.csv | {{custodian}} |
| Account | account_registration_type | morningstar_accounts.csv | {{reg_type}} |
| Account | account_open_date | morningstar_accounts.csv | {{open_date}} |
| Position | market_value | fidelity_positions.psv | {{mkt_val}} |
| Performance | performance_period_start | morningstar_performance.csv | PERIOD_START({{period_end}}) |
| Performance | performance_period_end | morningstar_performance.csv | {{period_end}} |

## Value crosswalks

| Source file | Target field | Source value | Target value |
| --- | --- | --- | --- |
| morningstar_accounts.csv | registration_type | TAX | TAXABLE |
| morningstar_accounts.csv | registration_type | IRA | IRA |
| morningstar_accounts.csv | registration_type | JNT | JOINT |
| morningstar_accounts.csv | custodian_code | FID | FIDELITY |
| morningstar_accounts.csv | custodian_code | SCH | SCHWAB |
| morningstar_accounts.csv | custodian_code | PER | PERSHING |

## Entity joins

| Left file | Left field | Right file | Right field | Join type |
| --- | --- | --- | --- | --- |
| morningstar_accounts.csv | household_ref | morningstar_households.csv | household_ref | LEFT |

## Validation rules

| Entity | File | Check type | Scope | Rule text |
| --- | --- | --- | --- | --- |
| Account | morningstar_accounts.csv | REQUIRED | account_ref,household_ref,custodian | Account natural keys are required. |
| Position | fidelity_positions.psv | POSITIVE_AMOUNT | market_value | Market value must be greater than zero. |

## Evidence and intent

- Custodian registration types are normalized through the value crosswalk table[cite: 1].
- Performance period start is derived dynamically from the period end date[cite: 1].

## Open questions

- Confirm if unsupervised assets should be filtered out or quarantined during intake[cite: 1].