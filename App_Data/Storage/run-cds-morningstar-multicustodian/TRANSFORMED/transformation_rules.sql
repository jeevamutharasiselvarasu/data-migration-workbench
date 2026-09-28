-- ====================================================================
-- Data Migration Control Plane · Transformation Rules Package
-- Run ID: run-cds-morningstar-multicustodian
-- Migration: morningstar-multicustodian
-- Exported UTC: 2026-09-28T19:48:25.685745+00:00
-- ====================================================================

-- Entity Transformation View: stg_clients_households
CREATE OR REPLACE VIEW stg_clients_households AS
SELECT
    household_ref AS household_id,
    first_name |||| ' ' |||| last_name AS household_name,
    COALESCE(primary_advisor, 'UNASSIGNED') AS advisor_code
FROM morningstar_clients_households
;

-- Entity Transformation View: stg_accounts
CREATE OR REPLACE VIEW stg_accounts AS
SELECT
    account_ref AS account_id,
    household_ref AS household_id,
    COALESCE(custodian, 'PERSHING') AS custodian_code,
    CASE WHEN reg_type = 'TAX' THEN 'TAXABLE' WHEN reg_type = 'IRA' THEN 'IRA_TRADITIONAL' ELSE 'OTHER' END AS account_registration_type,
    open_date AS account_open_date
FROM morningstar_accounts
;

-- Entity Transformation View: stg_positions
CREATE OR REPLACE VIEW stg_positions AS
SELECT
    account_ref AS account_id,
    cusip AS security_id,
    ROUND(CAST(quantity AS DECIMAL(18,4)), 4) AS units_quantity,
    quantity * COALESCE(latest_price, fallback_mkt_val) AS market_value
FROM pricing_feed
LEFT JOIN fidelity_positions ON pricing_feed.account_ref = fidelity_positions.account_ref
;

-- Entity Transformation View: stg_fees
CREATE OR REPLACE VIEW stg_fees AS
SELECT
    account_ref AS account_id,
    fee_schedule_code AS schedule_id,
    CASE WHEN annual_rate IS NULL THEN tier_default_rate * 10000 ELSE annual_rate * 10000 END AS fee_basis_points
FROM morningstar_fees
LEFT JOIN fee_tiers ON morningstar_fees.account_ref = fee_tiers.account_ref
;

-- Entity Transformation View: stg_billing
CREATE OR REPLACE VIEW stg_billing AS
SELECT
    COALESCE(account_ref, alt_account_id) AS account_id,
    billing_date AS period_date,
    COALESCE(billed_amount, 0) + COALESCE(late_fee_adj, 0) - COALESCE(discount_adj, 0) AS total_fee_charged
FROM morningstar_accounts
LEFT JOIN morningstar_billing ON morningstar_accounts.account_ref = morningstar_billing.account_ref
LEFT JOIN billing_adjustments ON morningstar_accounts.account_ref = billing_adjustments.account_ref
;

-- Entity Transformation View: stg_transactions
CREATE OR REPLACE VIEW stg_transactions AS
SELECT
    txn_id AS transaction_id,
    account_ref AS account_id,
    UPPER(TRIM(txn_code)) AS activity_type,
    CASE WHEN txn_code IN ('BUY', 'DEP') THEN net_amount ELSE -1 * net_amount END AS net_cash_flow
FROM morningstar_transactions
;

-- Entity Transformation View: stg_performance
CREATE OR REPLACE VIEW stg_performance AS
SELECT
    account_ref AS account_id,
    DATE_TRUNC('month', CAST(period_end AS DATE)) AS performance_period_start,
    (COALESCE(return_gross, 0) - COALESCE(fee_drag, 0)) * 100.0 AS net_return_pct
FROM morningstar_accounts
LEFT JOIN morningstar_performance ON morningstar_accounts.account_ref = morningstar_performance.account_ref
;
