import { state } from '../prototype.js';

// In-Memory Knowledge Cache to persist edits across modal opens
export const knowledgeStore = {
  source_profile: {
    system: "Morningstar",
    migrationPattern: "multi-custodian acquisition migration",
    custodians: ["Fidelity", "Schwab", "Pershing"],
    domains: ["clients_households", "accounts", "fees", "billing", "positions", "transactions", "performance"],
    phases: ["Mock 1", "Mock 2", "Dress Rehearsal", "Production"]
  },
  file_contracts: {
    fileContracts: [
      { fileName: "morningstar_accounts.csv", entity: "Account", format: "csv", delimiter: ",", naturalKey: ["account_ref"] },
      { fileName: "fidelity_positions.psv", entity: "Position", format: "psv", delimiter: "|", naturalKey: ["account_ref", "cusip"] },
      { fileName: "morningstar_performance.csv", entity: "Performance", format: "csv", delimiter: ",", naturalKey: ["account_ref", "period_end"] }
    ]
  },
  mapping_set: {
    fieldMappings: [
      {
        sourceFile: "morningstar_accounts.csv",
        entity: "Account",
        sourceFields: {
          account_ref: "account_id",
          household_ref: "household_id",
          custodian: "custodian_code",
          reg_type: "account_registration_type"
        }
      }
    ]
  },
  markdown_rulebook: `# Morningstar → AMK migration rulebook\n\n## Field transformations\n\n| Entity | Target field | Source file | Expression |\n| --- | --- | --- | --- |\n| Account | account_id | morningstar_accounts.csv | {{account_ref}} |\n| Performance | performance_period_start | morningstar_performance.csv | PERIOD_START({{period_end}}) |\n\n## Value crosswalks\n\n| Source file | Target field | Source value | Target value |\n| --- | --- | --- | --- |\n| morningstar_accounts.csv | registration_type | TAX | TAXABLE |\n| morningstar_accounts.csv | registration_type | IRA | IRA |\n`,
  validation_rules: {
    validationRules: [
      { entity: "Account", fileName: "morningstar_accounts.csv", checkType: "REQUIRED", scope: "account_ref,household_ref,custodian" },
      { entity: "Position", fileName: "fidelity_positions.psv", checkType: "POSITIVE_AMOUNT", scope: "market_value" }
    ]
  },
  target_contract: {
    system: "AMK",
    version: "morningstar-v1",
    fields: [
      { name: "account_id", entity: "Account", type: "string", required: true },
      { name: "account_registration_type", entity: "Account", type: "string", required: true },
      { name: "account_open_date", entity: "Account", type: "date", required: true }
    ]
  }
};

export async function openKnowledgePreviewModal(assetId, templateId = 'morningstar-multicustodian') {
  const modalContainer = document.getElementById('modalContainer');

  const assetMeta = {
    source_profile: { title: 'Source System Profile (source-profile.json)', filename: 'source-profile.json', type: 'json' },
    file_contracts: { title: 'Source File Contracts (file-contract.json)', filename: 'file-contract.json', type: 'json' },
    mapping_set: { title: 'Field Mapping Set (mapping-set.json)', filename: 'mapping-set.json', type: 'json' },
    markdown_rulebook: { title: 'Executable Rulebook (migration-rulebook.md)', filename: 'migration-rulebook.md', type: 'markdown' },
    validation_rules: { title: 'Validation Rules (validation-rules.json)', filename: 'validation-rules.json', type: 'json' },
    target_contract: { title: 'AMK Target Contract (target-contract.json)', filename: 'target-contract.json', type: 'json' }
  };

  const meta = assetMeta[assetId] || assetMeta.source_profile;
  const storedData = knowledgeStore[assetId];
  
  // Format current stored value for the editor
  const initialText = meta.type === 'json' 
    ? (typeof storedData === 'string' ? storedData : JSON.stringify(storedData, null, 2))
    : storedData;

  modalContainer.innerHTML = `
    <div class="kb-modal-overlay">
      <div class="kb-modal-card">
        <div class="kb-modal-header">
          <div class="kb-modal-title">
            <span class="mono-tag">${meta.type.toUpperCase()}</span>
            <h3>${meta.title}</h3>
          </div>
          <button id="closeKbModalBtn" class="close-modal-btn">✕</button>
        </div>

        <div class="kb-modal-body">
          <p class="kb-modal-sub">
            Review and edit the knowledge asset before loading it into the run workspace.
          </p>
          <textarea id="kbTextareaEditor" class="kb-code-editor" spellcheck="false">${initialText}</textarea>
        </div>

        <div class="kb-modal-footer">
          <button id="cancelKbModalBtn" class="btn-secondary">Cancel</button>
          <button id="saveKbAssetBtn" class="btn-primary-action">Save Knowledge Edits</button>
        </div>
      </div>
    </div>
  `;

  // Bind Events
  document.getElementById('closeKbModalBtn').addEventListener('click', closeKbModal);
  document.getElementById('cancelKbModalBtn').addEventListener('click', closeKbModal);

  document.getElementById('saveKbAssetBtn').addEventListener('click', async () => {
    const updatedContent = document.getElementById('kbTextareaEditor').value;

    // 1. Validate and update memory store
    if (meta.type === 'json') {
      try {
        const parsed = JSON.parse(updatedContent);
        knowledgeStore[assetId] = parsed;
      } catch (err) {
        alert('Invalid JSON syntax. Please correct the syntax before saving.');
        return;
      }
    } else {
      knowledgeStore[assetId] = updatedContent;
    }

    // 2. Persist to FastAPI Backend if Markdown Rulebook
    if (assetId === 'markdown_rulebook') {
      await fetch(`/api/migrations/${state.migrationId}/rulebook`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: updatedContent,
          updatedBy: state.currentUser || 'Migration Analyst'
        })
      });
    }

    closeKbModal();
  });
}

function closeKbModal() {
  document.getElementById('modalContainer').innerHTML = '';
}