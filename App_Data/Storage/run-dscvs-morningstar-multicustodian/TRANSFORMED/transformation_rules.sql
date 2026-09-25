-- ====================================================================
-- Data Migration Control Plane · Transformation Rules Package
-- Run ID: run-dscvs-morningstar-multicustodian
-- Migration: morningstar-multicustodian
-- Exported UTC: 2026-09-25T17:17:24.909530+00:00
-- ====================================================================

-- --------------------------------------------------------------------
-- Entity Transformation View: stg_account
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW stg_account AS
SELECT
    CAST(account_ref AS VARCHAR) AS account_id,
    CAST(household_ref AS VARCHAR) AS household_id,
    CAST(custodian AS VARCHAR) AS custodian_code,
    CAST(reg_type AS VARCHAR) AS account_registration_type,
    CAST(open_date AS VARCHAR) AS account_open_date
FROM morningstar_accounts;

-- --------------------------------------------------------------------
-- Entity Transformation View: stg_position
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW stg_position AS
SELECT
    CAST(mkt_val AS VARCHAR) AS market_value
FROM fidelity_positions;

-- --------------------------------------------------------------------
-- Entity Transformation View: stg_performance
-- --------------------------------------------------------------------
CREATE OR REPLACE VIEW stg_performance AS
SELECT
    DATE_TRUNC('month', CAST(period_end AS DATE)) AS performance_period_start,
    CAST(period_end AS VARCHAR) AS performance_period_end
FROM morningstar_performance;

-- --------------------------------------------------------------------
-- Value Crosswalk Maps
-- --------------------------------------------------------------------
-- Crosswalk: morningstar_accounts.csv -> registration_type
CASE
    WHEN registration_type = 'TAX' THEN 'TAXABLE'
    WHEN registration_type = 'IRA' THEN 'IRA'
    WHEN registration_type = 'JNT' THEN 'JOINT'
    ELSE registration_type
END AS registration_type_mapped;

-- Crosswalk: morningstar_accounts.csv -> custodian_code
CASE
    WHEN custodian_code = 'FID' THEN 'FIDELITY'
    WHEN custodian_code = 'SCH' THEN 'SCHWAB'
    WHEN custodian_code = 'PER' THEN 'PERSHING'
    ELSE custodian_code
END AS custodian_code_mapped;
