-- ====================================================================
-- Data Migration Control Plane · Transformation Rules Package
-- Run ID: run-j-morningstar-multicustodian
-- Migration: morningstar-multicustodian
-- Exported UTC: 2026-09-25T17:37:45.659045+00:00
-- ====================================================================

-- Entity Transformation View: stg_account
CREATE OR REPLACE VIEW stg_account AS
SELECT
    CAST(account_ref AS VARCHAR) AS account_id,
    CAST(household_ref AS VARCHAR) AS household_id,
    CAST(custodian AS VARCHAR) AS custodian_code,
    CAST(reg_type AS VARCHAR) AS account_registration_type,
    CAST(open_date AS VARCHAR) AS account_open_date
FROM morningstar_accounts;

-- Entity Transformation View: stg_position
CREATE OR REPLACE VIEW stg_position AS
SELECT
    CAST(mkt_val AS VARCHAR) AS market_value
FROM fidelity_positions;

-- Entity Transformation View: stg_performance
CREATE OR REPLACE VIEW stg_performance AS
SELECT
    DATE_TRUNC('month', CAST(period_end AS DATE)) AS performance_period_start,
    CAST(period_end AS VARCHAR) AS performance_period_end
FROM morningstar_performance;
