import { state, processStageApproval } from '../prototype.js?v=1.1';

export async function renderRuleEditor(mainContainer, hitlContainer, appState) {
  const isApproved = state.stageApprovals['04_mapper'];
  const parsed = appState.rulebookParsed || { fieldRules: [] };

  mainContainer.innerHTML = `
    <div class="stagehead">
      <div class="eyebrow">Control Plane · Stage 04</div>
      <h2>Schema Mapper & Granular Rule Rerun</h2>
      <p>Inspect entity rules side-by-side and execute targeted single-rule reruns[cite: 2, 8, 10].</p>
    </div>

    <div class="entity-rule-grid">
      ${parsed.fieldRules.map((rule, idx) => `
        <div class="rule-card">
          <div class="card-header">
            <span class="entity-badge">${rule.entity}</span>
            <span class="field-name">${rule.targetField}</span>
          </div>
          <div class="card-body">
            <p><b>Source File:</b> ${rule.sourceFile}</p>
            <p><b>Expression:</b> <code>${rule.expression}</code></p>
          </div>
          <div class="card-actions">
            <button class="rerun-btn" data-entity="${rule.entity}" data-field="${rule.targetField}">
              ↻ Rerun Single Rule
            </button>
            <span id="status-${rule.entity}-${rule.targetField}" class="status-pill ok" style="display:none;margin-top:4px;">✓ Recompiled</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div id="exportStatusArea" class="output-results" style="margin-top:16px;"></div>
  `;

  hitlContainer.innerHTML = `
    <div class="gatecard ${isApproved ? 'approved-card' : ''}">
      <h3>HITL Gate · Mapper Review</h3>
      <p>Authorized: <b>Migration Analyst</b></p>
    </div>
    <div class="stat-list">
      <div class="stat"><span>Compiled Rules:</span> <b>${parsed.fieldRules.length}</b></div>
      <div class="stat"><span>Approval Status:</span> <b>${isApproved ? 'APPROVED' : 'PENDING'}</b></div>
    </div>

    <button id="exportAdfBtn" class="action-btn" style="margin-bottom:8px;">Generate Package (.sql)</button>

    <button id="approveMapperBtn" class="approve-btn ${isApproved ? 'btn-approved' : ''}">
      ${isApproved ? '✓ Schema Mapper Approved' : 'Approve Schema Mapper & Continue ->'}
    </button>
  `;

  // Bind Single-Rule Rerun Events without alert()
  mainContainer.querySelectorAll('.rerun-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const entity = e.target.getAttribute('data-entity');
      const targetField = e.target.getAttribute('data-field');

      const res = await fetch(`/api/runs/${state.runId}/rerun-rule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entity, targetField, reviewer: appState.currentUser || 'migration-analyst' })
      });

      if (res.ok) {
        const indicator = document.getElementById(`status-${entity}-${targetField}`);
        if (indicator) {
          indicator.style.display = 'inline-block';
          setTimeout(() => { indicator.style.display = 'none'; }, 2000);
        }
      }
    });
  });

  // Fixed Export Event (No alert() popups, renders inline result card)
  document.getElementById('exportAdfBtn').addEventListener('click', async () => {
    const res = await fetch(`/api/runs/${state.runId}/export-package?mode=local`);
    const data = await res.json();

    document.getElementById('exportStatusArea').innerHTML = `
      <div class="results-card">
        <h3>Transformation Package Generated</h3>
        <p class="file-path">${data.targetLocation}</p>
        <span class="status-pill ok">✓ Export Status: ${data.status}</span>
      </div>
    `;
  });

  // Bind Stage 04 Approval Event & Auto Progression to Stage 05
  document.getElementById('approveMapperBtn').addEventListener('click', async () => {
    await processStageApproval('04_mapper');
  });
}