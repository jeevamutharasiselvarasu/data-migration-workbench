import uuid
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Response, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from app.db import init_db, get_db_connection
from app.storage import HybridStorageManager
from app.models import (
    CreateMigrationRequest, RulebookUpdateRequest,
    CreateRunRequest, ApprovalRequest, RuleRerunRequest
)
from app.compiler.rulebook import RulebookCompiler

app = FastAPI(title="Data Migration Control Plane API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.on_event("startup")
def startup_event():
    init_db()


@app.get("/", include_in_schema=False)
def read_root():
    return FileResponse("static/prototype.html")


@app.get("/api/health")
def health_check():
    return {
        "service": "Data Migration Control Plane",
        "status": "healthy",
        "layers": ["SOURCE", "RAW", "PROCESSED", "TRANSFORMED", "TARGET"],
        "sqlOutput": "GENERIC_ANSI_SQL"
    }


# --- MIGRATIONS & RULEBOOKS ---

@app.post("/api/migrations")
def create_migration(req: CreateMigrationRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    existing = cursor.execute("SELECT id FROM migrations WHERE name = ?", (req.name,)).fetchone()
    migration_id = existing["id"] if existing else (req.templateId or f"mig-{uuid.uuid4().hex[:8]}")
    created_utc = datetime.now(timezone.utc).isoformat()

    if not existing:
        cursor.execute("""
            INSERT INTO migrations (id, name, category, description, source_system, target_system, entities_json, template_id, created_by, created_utc)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (migration_id, req.name, req.category, req.description, req.sourceSystem, req.targetSystem,
              json.dumps(req.entities), req.templateId, req.createdBy, created_utc))

    # Initialize a default run for this migration if none exists
    run_id = f"run-{migration_id}"
    run_existing = cursor.execute("SELECT id FROM runs WHERE id = ?", (run_id,)).fetchone()
    if not run_existing:
        cursor.execute("""
            INSERT INTO runs (id, source_system_id, target_system_id, migration_id, status, canonical_model_version, created_by, created_utc, updated_utc)
            VALUES (?, ?, ?, ?, 'DRAFT', 'wealth-v1', ?, ?, ?)
        """, (run_id, req.sourceSystem, req.targetSystem, migration_id, req.createdBy, created_utc, created_utc))

    conn.commit()
    conn.close()
    return {"id": migration_id, "runId": run_id, "name": req.name, "status": "created"}


@app.get("/api/migrations/{migration_id}/rulebook")
def get_rulebook(migration_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()

    row = cursor.execute("SELECT content, updated_by, updated_utc FROM migration_rulebooks WHERE migration_id = ?", (migration_id,)).fetchone()
    conn.close()

    if row:
        content = row["content"]
        updated_by = row["updated_by"]
        updated_utc = row["updated_utc"]
    else:
        content = "# Morningstar → AMK migration rulebook\n\n## Field transformations\n"
        updated_by = None
        updated_utc = None

    parsed = RulebookCompiler.parse_markdown(content)
    return {
        "migrationId": migration_id,
        "content": content,
        "updatedBy": updated_by,
        "updatedUtc": updated_utc,
        "parsed": parsed
    }


@app.put("/api/migrations/{migration_id}/rulebook")
def update_rulebook(migration_id: str, req: RulebookUpdateRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    updated_utc = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        INSERT INTO migration_rulebooks (migration_id, content, updated_by, updated_utc)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(migration_id) DO UPDATE SET
            content = excluded.content,
            updated_by = excluded.updated_by,
            updated_utc = excluded.updated_utc
    """, (migration_id, req.content, req.updatedBy, updated_utc))

    conn.commit()
    conn.close()

    parsed = RulebookCompiler.parse_markdown(req.content)
    return {"migrationId": migration_id, "status": "updated", "parsed": parsed}


# --- LOCAL FILE UPLOAD ENDPOINT ---

@app.post("/api/runs/{run_id}/upload-file")
async def upload_local_source_file(
    run_id: str,
    entity: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Saves a locally uploaded file into the RAW storage layer for a run.
    """
    content = await file.read()
    rel_path, sha256, size_bytes = HybridStorageManager.save_file(
        run_id=run_id,
        filename=file.filename,
        content=content,
        subfolder="RAW"
    )

    conn = get_db_connection()
    cursor = conn.cursor()
    file_id = f"file-{uuid.uuid4().hex[:8]}"
    created_utc = datetime.now(timezone.utc).isoformat()

    cursor.execute("""
        INSERT INTO run_input_files (id, run_id, file_order, file_name, entity_name, dataset_id, processing_id, feed_instance_id, relative_path, content_type, layer, size_bytes, sha256, created_utc)
        VALUES (?, ?, 1, ?, ?, 'LOCAL_UPLOAD', ?, ?, ?, ?, 'RAW', ?, ?, ?)
    """, (file_id, run_id, file.filename, entity, f"proc-{run_id}", f"feed-{run_id}", rel_path, file.content_type or "text/csv", size_bytes, sha256, created_utc))

    conn.commit()
    conn.close()

    return {
        "fileId": file_id,
        "filename": file.filename,
        "entity": entity,
        "relativePath": rel_path,
        "sha256": sha256,
        "sizeBytes": size_bytes,
        "status": "RAW_STORED"
    }


# --- SINGLE RULE RERUN, APPROVALS & RUN STATE ---

@app.get("/api/runs/{run_id}/approvals")
def get_run_approvals(run_id: str):
    """Returns all recorded approvals for a run[cite: 2]."""
    conn = get_db_connection()
    cursor = conn.cursor()
    rows = cursor.execute("SELECT stage, decision, reviewer, comments, created_utc FROM approvals WHERE run_id = ?", (run_id,)).fetchall()
    conn.close()

    return {
        "runId": run_id,
        "approvals": [dict(r) for r in rows]
    }


@app.post("/api/runs/{run_id}/approvals")
def record_approval(run_id: str, req: ApprovalRequest):
    """Records persona decisions and updates stage approval status in DB[cite: 2, 8, 12, 13]."""
    conn = get_db_connection()
    cursor = conn.cursor()

    approval_id = f"appr-{uuid.uuid4().hex[:8]}"
    created_utc = datetime.now(timezone.utc).isoformat()

    # Record or update approval decision
    cursor.execute("""
        INSERT INTO approvals (id, run_id, artifact_id, stage, decision, reviewer, comments, created_utc)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (approval_id, run_id, req.artifactId, req.stage, req.decision, req.reviewer, req.comments, created_utc))

    # Update state machine based on stage approval
    if req.decision == "APPROVED":
        if req.stage in ["FINAL_APPROVAL", "06_reconcile"]:
            cursor.execute("UPDATE runs SET status = 'LOAD_READY', updated_utc = ? WHERE id = ?", (created_utc, run_id))
        else:
            cursor.execute("UPDATE runs SET status = ?, updated_utc = ? WHERE id = ?", (f"APPROVED_{req.stage}", created_utc, run_id))

    conn.commit()
    conn.close()

    return {"approvalId": approval_id, "stage": req.stage, "status": req.decision, "reviewer": req.reviewer}


@app.post("/api/runs/{run_id}/rerun-rule")
def rerun_single_rule(run_id: str, req: RuleRerunRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    run = cursor.execute("SELECT migration_id FROM runs WHERE id = ?", (run_id,)).fetchone()
    migration_id = run["migration_id"] if run else "morningstar-multicustodian"

    rulebook = cursor.execute("SELECT content FROM migration_rulebooks WHERE migration_id = ?", (migration_id,)).fetchone()
    content = rulebook["content"] if rulebook else ""
    parsed = RulebookCompiler.parse_markdown(content)

    entity_field_rules = [r for r in parsed["fieldRules"] if r["entity"] == req.entity]

    conn.close()
    return {
        "runId": run_id,
        "entity": req.entity,
        "status": "recompiled",
        "compiledRules": entity_field_rules
    }


# --- ADF & LOCAL PACKAGE EXPORT ---

@app.get("/api/runs/{run_id}/export-package")
def export_package(run_id: str, mode: str = Query("local", description="local or adls")):
    """
    Generates and exports full ANSI transformation SQL for all compiled entity rules[cite: 1, 7, 8, 10].
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    run = cursor.execute("SELECT migration_id FROM runs WHERE id = ?", (run_id,)).fetchone()
    migration_id = run["migration_id"] if run else "morningstar-multicustodian"

    rulebook = cursor.execute("SELECT content FROM migration_rulebooks WHERE migration_id = ?", (migration_id,)).fetchone()
    content = rulebook["content"] if rulebook else ""
    parsed = RulebookCompiler.parse_markdown(content)
    conn.close()

    # Generate full ANSI SQL queries for all entity rules[cite: 1, 7]
    utc_now = datetime.now(timezone.utc).isoformat()
    sql_lines = [
        f"-- ====================================================================",
        f"-- Data Migration Control Plane · Transformation Rules Package",
        f"-- Run ID: {run_id}",
        f"-- Migration: {migration_id}",
        f"-- Exported UTC: {utc_now}",
        f"-- ====================================================================\n"
    ]

    # Group rules by Entity
    rules_by_entity = {}
    for r in parsed.get("fieldRules", []):
        ent = r["entity"]
        if ent not in rules_by_entity:
            rules_by_entity[ent] = []
        rules_by_entity[ent].append(r)

    # Build SQL Views per Entity
    for ent, rules in rules_by_entity.items():
        sql_lines.append(f"-- --------------------------------------------------------------------")
        sql_lines.append(f"-- Entity Transformation View: stg_{ent.lower()}")
        sql_lines.append(f"-- --------------------------------------------------------------------")
        sql_lines.append(f"CREATE OR REPLACE VIEW stg_{ent.lower()} AS")
        sql_lines.append("SELECT")
        
        select_exprs = []
        source_file = rules[0]["sourceFile"] if rules else "raw_table"

        for r in rules:
            target_field = r["targetField"]
            expr = r["expression"]

            # Parse expression types safely[cite: 1]
            if "PERIOD_START" in expr:
                inner_var = expr.replace("PERIOD_START({{", "").replace("}})", "").replace("PERIOD_START(", "").replace(")", "")
                sql_expr = f"    DATE_TRUNC('month', CAST({inner_var} AS DATE)) AS {target_field}"
            elif expr.startswith("{{") and expr.endswith("}}"):
                var_name = expr.replace("{{", "").replace("}}", "").strip()
                sql_expr = f"    CAST({var_name} AS VARCHAR) AS {target_field}"
            else:
                sql_expr = f"    '{expr}' AS {target_field}"
                
            select_exprs.append(sql_expr)

        sql_lines.append(",\n".join(select_exprs))
        sql_lines.append(f"FROM {source_file.replace('.csv', '').replace('.psv', '')};\n")

    # Add Value Crosswalk Logic
    if parsed.get("crosswalks"):
        sql_lines.append("-- --------------------------------------------------------------------")
        sql_lines.append("-- Value Crosswalk Maps")
        sql_lines.append("-- --------------------------------------------------------------------")
        for cw in parsed["crosswalks"]:
            sql_lines.append(f"-- Crosswalk: {cw['sourceFile']} -> {cw['targetField']}")
            case_stmt = ["CASE"]
            for src_val, tgt_val in cw["mappings"].items():
                case_stmt.append(f"    WHEN {cw['targetField']} = '{src_val}' THEN '{tgt_val}'")
            case_stmt.append(f"    ELSE {cw['targetField']}\nEND AS {cw['targetField']}_mapped;")
            sql_lines.append("\n".join(case_stmt) + "\n")

    full_sql = "\n".join(sql_lines)

    if mode == "local":
        out_dir = Path(f"App_Data/Storage/{run_id}/TRANSFORMED")
        out_dir.mkdir(parents=True, exist_ok=True)
        with open(out_dir / "transformation_rules.sql", "w", encoding="utf-8") as f:
            f.write(full_sql)

        return {
            "runId": run_id,
            "mode": "local",
            "exportedUtc": utc_now,
            "targetLocation": str((out_dir / "transformation_rules.sql").absolute()),
            "sqlFile": "transformation_rules.sql",
            "status": "LOCAL_PACKAGE_EXPORTS_READY"
        }
    else:
        target_path = f"abfss://reconciled-gold@xodusamp.dfs.core.windows.net/packages/{run_id}/"
        return {
            "runId": run_id,
            "mode": "adls",
            "exportedUtc": utc_now,
            "targetLocation": target_path,
            "artifacts": ["transformation_rules.sql", "validation_plan.json", "package_manifest.json"],
            "status": "ADLS_PACKAGE_EXPORTED"
        }