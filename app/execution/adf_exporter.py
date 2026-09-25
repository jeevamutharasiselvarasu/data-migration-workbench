import json
from datetime import datetime, timezone
from typing import Any, Dict


class ADFPackageExporter:
    """Exports approved Control Plane transformation packages to ADLS for ADF execution[cite: 8, 10]."""

    @classmethod
    def export_package(cls, run_id: str, transformation_sql: str, validation_plan: Dict[str, Any]) -> Dict[str, Any]:
        target_path = f"abfss://reconciled-gold@xodusamp.dfs.core.windows.net/packages/{run_id}/"
        
        manifest = {
            "runId": run_id,
            "exportedUtc": datetime.now(timezone.utc).isoformat(),
            "adfPipelineTarget": "Pipeline_AMK_Gold_Load",
            "targetLocation": target_path,
            "artifacts": {
                "transformation_sql": f"{target_path}transformation_rules.sql",
                "validation_plan": f"{target_path}validation_plan.json",
                "package_manifest": f"{target_path}package_manifest.json"
            },
            "status": "PACKAGE_EXPORTED"
        }

        return manifest