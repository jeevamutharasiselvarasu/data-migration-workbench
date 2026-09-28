# Morningstar → AMK Migration Executable Rulebook

## Field transformations

| Entity | Target field | Source file | Expression |
| --- | --- | --- | --- |
| Clients Households | household_id | morningstar_clients_households.csv | {{household_ref}} |
| Clients Households | household_name | morningstar_clients_households.csv | {{first_name}} \|\| ' ' \|\| {{last_name}} |
| Clients Households | advisor_code | morningstar_clients_households.csv | COALESCE({{primary_advisor}}, 'UNASSIGNED') |
| Accounts | account_id | morningstar_accounts.csv | {{account_ref}} |
| Accounts | household_id | morningstar_accounts.csv | {{household_ref}} |
| Accounts | custodian_code | morningstar_accounts.csv | COALESCE({{custodian}}, 'PERSHING') |
| Accounts | account_registration_type | morningstar_accounts.csv | CASE WHEN {{reg_type}} = 'TAX' THEN 'TAXABLE' WHEN {{reg_type}} = 'IRA' THEN 'IRA_TRADITIONAL' ELSE 'OTHER' END |
| Accounts | account_open_date | morningstar_accounts.csv | {{open_date}} |
| Positions | account_id | fidelity_positions.psv | {{account_ref}} |
| Positions | security_id | fidelity_positions.psv | {{cusip}} |
| Positions | units_quantity | fidelity_positions.psv | ROUND(CAST({{quantity}} AS DECIMAL(18,4)), 4) |
| Positions | market_value | fidelity_positions.psv, pricing_feed.csv | {{quantity}} * COALESCE({{latest_price}}, {{fallback_mkt_val}}) |
| Fees | account_id | morningstar_fees.csv | {{account_ref}} |
| Fees | schedule_id | morningstar_fees.csv | {{fee_schedule_code}} |
| Fees | fee_basis_points | morningstar_fees.csv, fee_tiers.csv | CASE WHEN {{annual_rate}} IS NULL THEN {{tier_default_rate}} * 10000 ELSE {{annual_rate}} * 10000 END |
| Billing | account_id | morningstar_billing.csv, morningstar_accounts.csv | COALESCE({{account_ref}}, {{alt_account_id}}) |
| Billing | period_date | morningstar_billing.csv | {{billing_date}} |
| Billing | total_fee_charged | morningstar_billing.csv, billing_adjustments.csv | COALESCE({{billed_amount}}, 0) + COALESCE({{late_fee_adj}}, 0) - COALESCE({{discount_adj}}, 0) |
| Transactions | transaction_id | morningstar_transactions.csv | {{txn_id}} |
| Transactions | account_id | morningstar_transactions.csv | {{account_ref}} |
| Transactions | activity_type | morningstar_transactions.csv | UPPER(TRIM({{txn_code}})) |
| Transactions | net_cash_flow | morningstar_transactions.csv | CASE WHEN {{txn_code}} IN ('BUY', 'DEP') THEN {{net_amount}} ELSE -1 * {{net_amount}} END |
| Performance | account_id | morningstar_performance.csv, morningstar_accounts.csv | {{account_ref}} |
| Performance | performance_period_start | morningstar_performance.csv | PERIOD_START({{period_end}}) |
| Performance | net_return_pct | morningstar_performance.csv | (COALESCE({{return_gross}}, 0) - COALESCE({{fee_drag}}, 0)) * 100.0 |

## Value crosswalks

| Source file | Target field | Source value | Target value |
| --- | --- | --- | --- |
| morningstar_accounts.csv | custodian_code | FID | FIDELITY |
| morningstar_accounts.csv | custodian_code | SCH | SCHWAB |
| morningstar_accounts.csv | custodian_code | PER | PERSHING |
| morningstar_accounts.csv | account_registration_type | TAX | TAXABLE |
| morningstar_accounts.csv | account_registration_type | IRA | IRA_TRADITIONAL |
| morningstar_transactions.csv | activity_type | DEP | DEPOSIT |
| morningstar_transactions.csv | activity_type | WITH | WITHDRAWAL |

## Entity joins

| Left file | Left field | Right file | Right field | Join type |
| --- | --- | --- | --- | --- |
| morningstar_clients_households.csv | household_ref | morningstar_accounts.csv | household_ref | INNER |
| morningstar_accounts.csv | account_ref | fidelity_positions.psv | account_ref | LEFT |
| fidelity_positions.psv | cusip | pricing_feed.csv | cusip | LEFT |
| morningstar_accounts.csv | account_ref | morningstar_fees.csv | account_ref | LEFT |
| morningstar_fees.csv | fee_schedule_code | fee_tiers.csv | schedule_code | LEFT |
| morningstar_accounts.csv | account_ref | morningstar_billing.csv | account_ref | LEFT |
| morningstar_billing.csv | billing_id | billing_adjustments.csv | billing_id | LEFT |
| morningstar_accounts.csv | account_ref | morningstar_transactions.csv | account_ref | LEFT |
| morningstar_accounts.csv | account_ref | morningstar_performance.csv | account_ref | LEFT |

## Validation rules

| Entity | Source file | Check type | Scope | Rule text |
| --- | --- | --- | --- | --- |
| Clients Households | morningstar_clients_households.csv | REQUIRED | household_ref | Household ID cannot be null |
| Accounts | morningstar_accounts.csv | REQUIRED | account_ref,household_ref | Account and household keys must not be null |
| Positions | fidelity_positions.psv | POSITIVE_AMOUNT | market_value | Market value must be greater than or equal to zero |
| Fees | morningstar_fees.csv | RANGE | annual_rate | Rate must be between 0.00 and 0.05 |
| Transactions | morningstar_transactions.csv | NON_ZERO | net_amount | Transaction amount must be non-zero |