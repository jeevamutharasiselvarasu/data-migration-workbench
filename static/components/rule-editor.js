import { state, processStageApproval, revokeStageApproval } from '../prototype.js';

export async function renderRuleEditor(mainContainer, hitlContainer, appState) {
  if (!state.columnApprovals) {
    state.columnApprovals = {};
  }

  let isPackageGenerated = false;

  // Fetch active compiled rulebook if unpopulated in state
  if (!appState.rulebookParsed || !appState.rulebookParsed.fieldRules || appState.rulebookParsed.fieldRules.length === 0) {
    try {
      const res = await fetch(`/api/migrations/${appState.migrationId}/rulebook`);
      if (res.ok) {
        const data = await res.json();
        appState.rulebookParsed = data.parsed;
      }
    } catch (err) {
      console.warn('Failed to load rulebook for mapper', err);
    }
  }

  const fieldRules = (appState.rulebookParsed && appState.rulebookParsed.fieldRules) ? appState.rulebookParsed.fieldRules : [];

  // Group rules by Entity
  const rulesByEntity = {};
  fieldRules.forEach(rule => {
    const key = `${rule.entity}::${rule.targetField}`;
    if (state.columnApprovals[key] === undefined) {
      state.columnApprovals[key] = false;
    }
    if (!rulesByEntity[rule.entity]) {
      rulesByEntity[rule.entity] = [];
    }
    rulesByEntity[rule.entity].push(rule);
  });

  function renderView() {
    const isStageApproved = !!state.stageApprovals['04_mapper'];
    const totalRules = fieldRules.length;
    const approvedRulesCount = fieldRules.filter(r => !!state.columnApprovals[`${r.entity}::${r.targetField}`]).length;
    const areAllRulesApproved = totalRules > 0 && approvedRulesCount === totalRules;

    // 1. Pre-build Entity Sections HTML (Prevents Deep Template Literal Nesting)
    let entitySectionsHtml = '';

    if (Object.keys(rulesByEntity).length > 0) {
      const sections = Object.entries(rulesByEntity).map(([entityName, rules]) => {
        const entityApprovedCount = rules.filter(r => !!state.columnApprovals[`${r.entity}::${r.targetField}`]).length;
        const isEntityFullyApproved = entityApprovedCount === rules.length;

        const cardsHtml = rules.map(rule => {
          const ruleKey = `${rule.entity}::${rule.targetField}`;
          const isColumnApproved = !!state.columnApprovals[ruleKey];
          const exprStr = (rule.expression || '').trim();
          const isDirect = exprStr.startsWith('{{') && exprStr.endsWith('}}');
          const mappingType = isDirect ? 'Direct 1-to-1' : 'Transformation Expression';
          const safeExpr = exprStr.replace(/"/g, '&quot;');

          return `
            <div class="rule-card ${isColumnApproved ? 'column-approved' : ''}" style="border-top: 3px solid ${isColumnApproved ? 'var(--teal)' : 'var(--blue)'};">
              <div class="card-header">
                <span class="field-name">${rule.targetField}</span>
                <span class="status-pill ${isColumnApproved ? 'ok' : ''}">${isColumnApproved ? '✓ Approved' : 'Pending'}</span>
              </div>
              
              <div class="card-body" style="margin: 8px 0;">
                <p><b>Source File:</b> <code>${rule.sourceFile || ''}</code></p>
                <p style="font-size: 10px; color: var(--faint); margin-top:4px;">Mapping Type: <b>${mappingType}</b></p>
                
                <div class="expression-edit-box" style="margin-top: 8px;">
                  <label style="font-size: 9px; font-weight: 700; color: var(--faint); display:block; margin-bottom: 2px;">SQL TRANSFORMATION EXPRESSION:</label>
                  <input type="text" class="input-expression-edit" data-rule-key="${ruleKey}" value="${safeExpr}" style="width: 100%; font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 6px; border: 1px solid var(--line-2); border-radius: 4px; background: #FCFDFF;" />
                </div>
              </div>

              <div class="card-actions" style="display:flex; gap: 8px; margin-top: 10px;">
                <button class="action-btn-sm btn-save-expr" data-rule-key="${ruleKey}" style="flex: 1;">
                  Save Expression
                </button>
                <button class="action-btn-sm btn-toggle-col-appr" data-rule-key="${ruleKey}" style="flex: 1; background: ${isColumnApproved ? 'var(--teal-bg)' : 'var(--blue-bg)'}; color: ${isColumnApproved ? 'var(--teal-deep)' : 'var(--blue-deep)'};">
                  ${isColumnApproved ? '✓ Approved' : 'Approve Column'}
                </button>
              </div>
            </div>
          `;
        }).join('');

        return `
          <div class="entity-section-card" style="border: 1px solid var(--line); border-radius: 12px; background: var(--panel); padding: 18px; margin-bottom: 20px;">
            <div class="entity-section-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 14px; border-bottom: 1px solid var(--line); padding-bottom: 10px;">
              <div>
                <span class="entity-badge" style="font-size: 11px;">${entityName} Entity</span>
                <span style="font-size: 12px; color: var(--muted); margin-left: 8px;">
                  (${entityApprovedCount} of ${rules.length} column rules approved)
                </span>
              </div>
              <button class="action-btn-sm btn-approve-entity" data-entity="${entityName}" style="background: ${isEntityFullyApproved ? 'var(--teal-bg)' : '#fff'}; color: ${isEntityFullyApproved ? 'var(--teal-deep)' : 'var(--navy)'};">
                ${isEntityFullyApproved ? '✓ All Entity Rules Approved' : `Approve All ${entityName} Rules`}
              </button>
            </div>

            <div class="entity-rule-grid">
              ${cardsHtml}
            </div>
          </div>
        `;
      }).join('');

      entitySectionsHtml = `<div class="mapper-entity-sections">${sections}</div>`;
    } else {
      entitySectionsHtml = `
        <div class="placeholder-box">
          <p><b>No Compiled Rules Found</b></p>
          <p class="sub-text">Please go to Stage 03 (Rulebook Editor) and click "Save & Compile Rulebook" first.</p>
        </div>
      `;
    }

    // 2. Pre-build Hand-Off Banner HTML
    const handoffBannerHtml = isStageApproved ? `
      <div class="results-card" style="border-left: 4px solid var(--teal); background: var(--teal-bg);">
        <h3 style="color: var(--teal-deep);">✓ Control Plane Hand-Off Complete</h3>
        <p style="margin-top: 4px;">All Control Plane stages (00–04) have been compiled, verified column-by-column, and signed off.</p>
        <p class="section-sub" style="margin-top: 8px;">
          <b>Next Step:</b> Switch role to <b>Validation Specialist</b> in the header to execute Data Plane stages (05 & 06).
        </p>
      </div>
    ` : '';

    // 3. Assemble mainContainer HTML cleanly
    mainContainer.innerHTML = `
      <div class="stagehead">
        <div class="eyebrow">Control Plane · Stage 04</div>
        <h2>Schema Mapper & Granular Rule Authoring</h2>
        <p>Author non 1-to-1 transformations, perform column/entity approvals, and build the SQL package.</p>
      </div>

      ${entitySectionsHtml}

      <div id="exportStatusArea" class="output-results" style="margin-top:16px;">
        ${handoffBannerHtml}
      </div>
    `;

    // 4. Render HITL Side Panel
    hitlContainer.innerHTML = `
      <div class="gatecard ${isStageApproved ? 'approved-card' : ''}">
        <h3>HITL Gate · Mapper Review</h3>
        <p>Authorized: <b>Migration Analyst</b></p>
      </div>
      <div class="stat-list">
        <div class="stat"><span>Total Column Rules:</span> <b>${totalRules}</b></div>
        <div class="stat"><span>Approved Columns:</span> <b>${approvedRulesCount} / ${totalRules}</b></div>
        <div class="stat"><span>Package Status:</span> <b>${isPackageGenerated || isStageApproved ? 'GENERATED' : 'PENDING'}</b></div>
        <div class="stat"><span>Control Plane Sign-Off:</span> <b>${isStageApproved ? 'APPROVED' : 'PENDING'}</b></div>
      </div>

      <button id="exportAdfBtn" class="action-btn" style="margin-bottom:8px;">
        ${isPackageGenerated || isStageApproved ? '↻ Re-Generate Package (.sql)' : '▶ Generate Package (.sql)'}
      </button>

      <button id="approveMapperBtn" class="approve-btn ${isStageApproved ? 'btn-approved' : ''}" ${(!areAllRulesApproved || !isPackageGenerated) && !isStageApproved ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
        ${isStageApproved ? '✓ Control Plane Signed Off' : 'Approve & Hand Off Control Plane'}
      </button>
    `;

    // Bind Column Approval Toggles
    mainContainer.querySelectorAll('.btn-toggle-col-appr').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ruleKey = btn.getAttribute('data-rule-key');
        state.columnApprovals[ruleKey] = !state.columnApprovals[ruleKey];

        if (state.stageApprovals['04_mapper']) {
          await revokeStageApproval('04_mapper');
        }
        renderView();
      });
    });

    // Bind Entity Bulk Approval
    mainContainer.querySelectorAll('.btn-approve-entity').forEach(btn => {
      btn.addEventListener('click', async () => {
        const entityName = btn.getAttribute('data-entity');
        const entityRules = fieldRules.filter(r => r.entity === entityName);
        const allApproved = entityRules.every(r => !!state.columnApprovals[`${r.entity}::${r.targetField}`]);

        entityRules.forEach(r => {
          state.columnApprovals[`${r.entity}::${r.targetField}`] = !allApproved;
        });

        if (state.stageApprovals['04_mapper']) {
          await revokeStageApproval('04_mapper');
        }
        renderView();
      });
    });

    // Bind Expression Save Buttons
    mainContainer.querySelectorAll('.btn-save-expr').forEach(btn => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.rule-card');
        const inputEl = card ? card.querySelector('.input-expression-edit') : null;
        if (!inputEl) return;

        const ruleKey = btn.getAttribute('data-rule-key');
        const newExpr = inputEl.value.trim();

        const [entity, targetField] = ruleKey.split('::');
        const targetRule = fieldRules.find(r => r.entity === entity && r.targetField === targetField);

        if (targetRule) {
          targetRule.expression = newExpr;
          state.columnApprovals[ruleKey] = false;
          isPackageGenerated = false;

          if (state.stageApprovals['04_mapper']) {
            await revokeStageApproval('04_mapper');
          }
          renderView();
        }
      });
    });

    // Bind Package Export Event
    const exportBtn = document.getElementById('exportAdfBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const res = await fetch(`/api/runs/${state.runId}/export-package?mode=local`);
        const data = await res.json();
        isPackageGenerated = true;

        renderView();

        const statusArea = document.getElementById('exportStatusArea');
        if (statusArea) {
          statusArea.innerHTML = `
            <div class="results-card">
              <h3>Transformation Package Generated</h3>
              <p class="file-path">${data.targetLocation}</p>
              <span class="status-pill ok">✓ Export Status: ${data.status}</span>
            </div>
          `;
        }
      });
    }

    // Bind Master Control Plane Approval Event
    const approveBtn = document.getElementById('approveMapperBtn');
    if (approveBtn && areAllRulesApproved && (isPackageGenerated || isStageApproved)) {
      approveBtn.addEventListener('click', async () => {
        await processStageApproval('04_mapper');
      });
    }
  }

  renderView();
}