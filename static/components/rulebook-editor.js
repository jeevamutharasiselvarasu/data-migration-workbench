import { state, processStageApproval, revokeStageApproval } from '../prototype.js';

export async function renderRulebookEditor(mainContainer, hitlContainer, appState) {
  let isCompiled = false;
  const isApproved = state.stageApprovals['03_rules'];

  const response = await fetch(`/api/migrations/${appState.migrationId}/rulebook`);
  const data = await response.json();
  appState.rulebookParsed = data.parsed;

  function renderView() {
    const isApprovedNow = state.stageApprovals['03_rules'];

    mainContainer.innerHTML = `
      <div class="stagehead">
        <div class="eyebrow">Control Plane · Stage 03</div>
        <h2>Markdown Rulebook Authoring</h2>
        <p>Human-authored business logic parsed into executable transformations, joins, and crosswalks[cite: 1, 11].</p>
      </div>

      <div class="rulebook-container">
        <div class="editor-pane">
          <div class="pane-header">
            <span>migration-rulebook.md</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <span id="saveStatusIndicator" class="status-pill ok" style="${isCompiled ? 'display:inline-block;' : 'display:none;'}">✓ Compiled & Saved</span>
              <button id="saveRulebookBtn" class="save-btn">Save & Compile Rulebook</button>
            </div>
          </div>
          <textarea id="rulebookMarkdownText" class="code-editor" spellcheck="false">${data.content}</textarea>
        </div>

        <div class="compiled-preview-pane">
          <div class="pane-header">Compiled Rules (Live Inspection)</div>
          <pre class="json-preview" id="compiledPreviewArea">${JSON.stringify(data.parsed, null, 2)}</pre>
        </div>
      </div>
    `;

    hitlContainer.innerHTML = `
      <div class="gatecard ${isApprovedNow ? 'approved-card' : ''}">
        <h3>HITL Gate · Rulebook Review</h3>
        <p>Authorized: <b>Migration Analyst</b>[cite: 8, 12]</p>
      </div>
      <div class="stat-list">
        <div class="stat"><span>Field Rules:</span> <b id="statFieldRules">${data.parsed.fieldRules.length}</b></div>
        <div class="stat"><span>Crosswalks:</span> <b id="statCrosswalks">${data.parsed.crosswalks.length}</b></div>
        <div class="stat"><span>Entity Joins:</span> <b id="statJoins">${data.parsed.joins.length}</b></div>
        <div class="stat"><span>Validations:</span> <b id="statValidations">${data.parsed.validationRules.length}</b></div>
        <div class="stat"><span>Approval Status:</span> <b>${isApprovedNow ? 'APPROVED' : 'PENDING'}</b></div>
      </div>

      <button id="approveRulebookBtn" class="approve-btn ${isApprovedNow ? 'btn-approved' : ''}" ${!isCompiled && !isApprovedNow ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
        ${isApprovedNow ? '✓ Rulebook Package Approved' : 'Approve Rulebook & Continue ->'}
      </button>
    `;

    // Save & Compile Event -> Revokes downstream approvals
    document.getElementById('saveRulebookBtn').addEventListener('click', async () => {
      const updatedContent = document.getElementById('rulebookMarkdownText').value;
      const putRes = await fetch(`/api/migrations/${appState.migrationId}/rulebook`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent, updatedBy: appState.currentUser || 'migration-analyst' })
      });
      
      if (putRes.ok) {
        const resData = await putRes.json();
        appState.rulebookParsed = resData.parsed;
        data.content = updatedContent;
        data.parsed = resData.parsed;
        isCompiled = true;
        
        // Dynamic Approval Revocation on Edit
        if (state.stageApprovals['03_rules']) {
          await revokeStageApproval('03_rules');
        }

        renderView();
      }
    });

    if (isCompiled || isApprovedNow) {
      document.getElementById('approveRulebookBtn').addEventListener('click', async () => {
        await processStageApproval('03_rules');
      });
    }
  }

  renderView();
}