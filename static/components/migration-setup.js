import { state, navigateToStage } from '../prototype.js';
import { openKnowledgePreviewModal } from './migration-knowledge.js';

export async function renderMigrationSetupStage(mainContainer, hitlContainer) {
  const templates = [
    {
      id: 'amplify-orion',
      name: 'Amplify -> Orion Eclipse',
      tag: 'Reference scenario',
      desc: 'Rep-as-PM advisory book with current positions, historical performance, and target routing.',
      source: 'Amplify / Schwab / Black Diamond',
      target: 'SPARC + Orion Eclipse'
    },
    {
      id: 'morningstar-multicustodian',
      name: 'Morningstar multi-custodian',
      tag: 'Migration template',
      desc: 'Heterogeneous custodian files, historical domains, fees, tax lots, and performance.',
      source: 'Morningstar',
      target: 'AMK'
    },
    {
      id: 'efficient-advisors-bulk-factory',
      name: 'Efficient Advisors bulk factory',
      tag: 'Migration template',
      desc: 'Configuration-driven mappings, account-to-client joins, crosswalks, and bulk-load output.',
      source: 'Efficient Advisors',
      target: 'AMK Bulk Factory'
    },
    {
      id: 'blank-custom',
      name: 'Blank custom migration',
      tag: 'Start from boundary',
      desc: 'Create a clean migration definition and author the knowledge base from scratch.',
      source: 'Custom Source',
      target: 'Custom Target'
    }
  ];

  const knowledgeAssets = [
    { id: 'source_profile', name: 'SOURCE PROFILE', desc: 'SYSTEMS, DOMAINS, CUSTODIANS, DELIVERY PHASES', selected: true },
    { id: 'file_contracts', name: 'FILE CONTRACTS', desc: 'FORMATS, DELIMITERS, KEYS, AND SOURCE DELIVERY RULES', selected: true },
    { id: 'mapping_set', name: 'MAPPING SET', desc: 'DIRECT FIELD MAPPINGS AND CANONICAL ENTITIES', selected: true },
    { id: 'markdown_rulebook', name: 'MARKDOWN RULEBOOK', desc: 'BUSINESS INTENT, TRANSFORMATIONS, JOINS, AND VALIDATIONS', selected: true },
    { id: 'validation_rules', name: 'VALIDATION RULES', desc: 'REQUIRED FIELDS, INTEGRITY, CONTROL TOTALS, AND TOLERANCES', selected: true },
    { id: 'target_contract', name: 'TARGET CONTRACT', desc: 'TARGET FIELDS, TYPES, REQUIRED STATUS, AND VERSION', selected: false }
  ];

  let selectedTemplate = templates[0];
  let migrationName = selectedTemplate.name;
  let sourceSystem = selectedTemplate.source;
  let targetSystem = selectedTemplate.target;

  mainContainer.innerHTML = `
    <div class="stagehead">
      <div class="eyebrow">CONTROL PLANE / STAGE 00</div>
      <h2>Migration Setup</h2>
      <p>Define the migration boundary, choose a starting template, and load the knowledge base before intake[cite: 1, 2, 7].</p>
    </div>

    <div class="setup-hero">
      <div class="eyebrow">CONTROL PLANE / STAGE 00</div>
      <h1>Create the migration before intake.</h1>
      <p>Start from a proven scenario or define a new source-to-target boundary. The selected knowledge base becomes the versioned context for this run[cite: 1, 2].</p>
    </div>

    <div class="setup-grid">
      <div class="setup-card">
        <div class="card-section-title">AVAILABLE SCENARIO TEMPLATES</div>
        <h3>Choose a starting point</h3>
        <p class="section-sub">Templates are preselected examples. You can change the source, target, name, and knowledge assets before creating your migration[cite: 1].</p>
        
        <div class="template-list">
          ${templates.map(t => `
            <label class="template-option ${t.id === selectedTemplate.id ? 'active' : ''}" data-template-id="${t.id}">
              <div class="radio-col">
                <input type="radio" name="scenario_template" value="${t.id}" ${t.id === selectedTemplate.id ? 'checked' : ''} />
              </div>
              <div class="details-col">
                <div class="t-name">${t.name}</div>
                <div class="t-tag">${t.tag}</div>
                <div class="t-desc">${t.desc}</div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="setup-card">
        <div class="card-section-title">MIGRATION DEFINITION</div>
        <h3>Source and target boundary</h3>
        
        <div class="form-group">
          <label>MIGRATION NAME</label>
          <input type="text" id="inputMigrationName" value="${migrationName}" />
        </div>

        <div class="form-group">
          <label>SOURCE SYSTEM</label>
          <input type="text" id="inputSourceSystem" value="${sourceSystem}" />
        </div>

        <div class="form-group">
          <label>TARGET SYSTEM</label>
          <input type="text" id="inputTargetSystem" value="${targetSystem}" />
        </div>

        <div class="form-group">
          <label>RUN UNIT</label>
          <select id="selectRunUnit">
            <option value="One advisor cohort" selected>One advisor cohort</option>
            <option value="Full firm book">Full firm book</option>
          </select>
        </div>

        <div class="next-banner">
          <div class="nb-num">01</div>
          <div class="nb-text">
            <b>What happens next?</b><br />
            Creating the migration snapshots this boundary, then unlocks Loader & Inspector for source intake[cite: 1, 2, 7].
          </div>
        </div>
      </div>
    </div>

    <div class="knowledge-setup-card">
      <div class="card-section-title">KNOWLEDGE BASE</div>
      <div class="kb-header">
        <h3>Load system knowledge</h3>
        <button id="selectAllKbBtn" class="btn-sm-outline">Select all</button>
      </div>
      <p class="section-sub">Select the assets the control plane should use. All selected assets remain reviewable before execution[cite: 1, 2, 7].</p>

      <div class="kb-grid">
        ${knowledgeAssets.map(k => `
          <div class="kb-box ${k.selected ? 'active' : ''}" data-kb-id="${k.id}">
            <div class="kb-check">
              <input type="checkbox" id="kb_chk_${k.id}" ${k.selected ? 'checked' : ''} />
            </div>
            <div class="kb-details">
              <div class="kb-name">${k.name}</div>
              <div class="kb-desc">${k.desc}</div>
            </div>
            <button class="kb-preview-btn" data-kb-id="${k.id}">Preview / edit</button>
          </div>
        `).join('')}
      </div>

      <div class="kb-footer">
        <span id="kbCountLabel" class="kb-count">5 of 6 assets selected</span>
        <button id="createMigrationContinueBtn" class="btn-primary-action">Create migration and continue -></button>
      </div>
    </div>
  `;

  hitlContainer.innerHTML = `
    <div class="gatecard">
      <h3>HITL GATE</h3>
      <p>Escalated: Choose a template or start blank, define the systems, and load the knowledge base before intake[cite: 1, 2, 7].</p>
    </div>

    <div class="reviewer">
      <div class="av">MA</div>
      <div>
        <div class="name">Migration Analyst</div>
        <div class="role">Migration definition and knowledge base</div>
      </div>
    </div>

    <div class="stat-list">
      <div class="stat"><span>Run status:</span> <b>NOT CREATED</b></div>
    </div>

    <div class="flagnote warning-box">
      No execution evidence exists until the migration boundary is created[cite: 2, 6, 14].
    </div>
  `;

  // Bind Template Radio Selection Events
  mainContainer.querySelectorAll('.template-option').forEach(el => {
    el.addEventListener('click', () => {
      const templateId = el.getAttribute('data-template-id');
      selectedTemplate = templates.find(t => t.id === templateId);

      mainContainer.querySelectorAll('.template-option').forEach(opt => {
        const isMatch = opt.getAttribute('data-template-id') === templateId;
        opt.classList.toggle('active', isMatch);
        opt.querySelector('input[type="radio"]').checked = isMatch;
      });

      document.getElementById('inputMigrationName').value = selectedTemplate.name;
      document.getElementById('inputSourceSystem').value = selectedTemplate.source;
      document.getElementById('inputTargetSystem').value = selectedTemplate.target;
    });
  });

  // Bind Knowledge Assets
  mainContainer.querySelectorAll('.kb-box').forEach(el => {
    const kbId = el.getAttribute('data-kb-id');
    const chk = el.querySelector('input[type="checkbox"]');

    chk.addEventListener('change', () => {
      el.classList.toggle('active', chk.checked);
    });

    el.querySelector('.kb-preview-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openKnowledgePreviewModal(kbId);
    });
  });

  // Bind Boundary Creation & Automatic Stage Transition
  document.getElementById('createMigrationContinueBtn').addEventListener('click', async () => {
    const name = document.getElementById('inputMigrationName').value.trim();
    const sourceSystem = document.getElementById('inputSourceSystem').value.trim();
    const targetSystem = document.getElementById('inputTargetSystem').value.trim();

    const res = await fetch('/api/migrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        sourceSystem,
        targetSystem,
        templateId: selectedTemplate.id,
        entities: ['Account', 'Position', 'Performance'],
        createdBy: state.currentUser || 'Migration Analyst'
      })
    });

    if (res.ok || res.status === 400) {
      state.migrationId = selectedTemplate.id;
      state.stageApprovals['00_setup'] = true;
      // Seamlessly transition to Stage 01 without native alert popups
      navigateToStage('01_ingestion');
    }
  });
}