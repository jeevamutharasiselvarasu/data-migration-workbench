import json
from datetime import datetime, timezone
from typing import Any, Dict, List


class LocalDataPlaneExecutor:
    """Executes local transformations, applies validations, and generates target & quarantine outputs[cite: 7, 11]."""

    @classmethod
    def execute_run(cls, run_id: str, compiled_package: Dict[str, Any], raw_data: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """
        Executes transformed mappings against RAW data[cite: 7, 11].
        Returns PROCESSED, TRANSFORMED, TARGET, QUARANTINE, and RECONCILIATION artifacts[cite: 2, 7].
        """
        accounts_raw = raw_data.get("accounts", [])
        positions_raw = raw_data.get("positions", [])
        perf_raw = raw_data.get("performance", [])

        transformed_accounts = []
        transformed_positions = []
        quarantine_records = []

        # 1. Transform Accounts & apply crosswalks
        for row in accounts_raw:
            acc_ref = row.get("account_ref") or row.get("ACCOUNT_NBR_PRIME")
            custodian = row.get("custodian") or row.get("CUSTODIAN")
            reg_type = row.get("reg_type") or row.get("REG_TYPE")

            # Validation check: REQUIRED account_ref
            if not acc_ref:
                quarantine_records.append({
                    "entity": "Account",
                    "raw_record": row,
                    "reason": "Missing required field: account_ref"
                })
                continue

            # Apply value crosswalks
            reg_mapped = "TAXABLE" if reg_type == "TAX" else (reg_type or "UNKNOWN")
            cust_mapped = "FIDELITY" if custodian == "FID" else ("SCHWAB" if custodian == "SCH" else custodian)

            transformed_accounts.append({
                "account_id": acc_ref,
                "household_id": row.get("household_ref") or row.get("HHOLD_ID"),
                "custodian_code": cust_mapped,
                "account_registration_type": reg_mapped,
                "account_open_date": row.get("open_date") or "2020-01-01"
            })

        # 2. Transform Positions & apply amount validations
        for pos in positions_raw:
            mkt_val = float(pos.get("mkt_val") or pos.get("MKT_VAL") or 0.0)
            
            # Validation check: POSITIVE_AMOUNT
            if mkt_val <= 0:
                quarantine_records.append({
                    "entity": "Position",
                    "raw_record": pos,
                    "reason": "Validation failure: market_value <= 0"
                })
                continue

            transformed_positions.append({
                "account_id": pos.get("account_ref") or pos.get("ACCOUNT_NBR_PRIME"),
                "cusip": pos.get("cusip") or pos.get("CUSIP"),
                "quantity": float(pos.get("qty") or pos.get("QTY") or 0.0),
                "market_value": mkt_val,
                "cost_basis": float(pos.get("cost_basis") or pos.get("COST_BASIS") or 0.0)
            })

        # Calculate Financial & Population Control Totals for Reconciliation
        total_source_mkt_val = sum(float(p.get("mkt_val") or p.get("MKT_VAL") or 0.0) for p in positions_raw)
        total_target_mkt_val = sum(p["market_value"] for p in transformed_positions)
        variance_mkt_val = round(total_target_mkt_val - total_source_mkt_val, 2)

        return {
            "runId": run_id,
            "executedUtc": datetime.now(timezone.utc).isoformat(),
            "status": "LOAD_READY" if len(quarantine_records) == 0 else "RECONCILED",
            "summary": {
                "raw_account_count": len(accounts_raw),
                "target_account_count": len(transformed_accounts),
                "raw_position_count": len(positions_raw),
                "target_position_count": len(transformed_positions),
                "quarantine_count": len(quarantine_records),
                "source_total_market_value": round(total_source_mkt_val, 2),
                "target_total_market_value": round(total_target_mkt_val, 2),
                "market_value_variance": variance_mkt_val
            },
            "target": {
                "accounts": transformed_accounts,
                "positions": transformed_positions
            },
            "quarantine": quarantine_records
        }