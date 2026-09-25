import { state, processStageApproval, revokeStageApproval } from '../prototype.js';

export async function renderIngestionStage(mainContainer, hitlContainer) {
  let mode = 'cloud';

  const sourceEntities = [
    { id: 'morningstar_accounts', label: 'Morningstar Accounts', file: 'morningstar_accounts.csv', entity: 'Account' },
    { id: 'fidelity_positions', label: 'Fidelity Positions', file: 'fidelity_positions.psv', entity: 'Position' },
    { id: 'morningstar_performance', label: 'Morningstar Performance', file: 'morningstar_performance.csv', entity: 'Performance' }
  ];

  function renderView() {
    const isApproved = state.stageApprovals['01_ingestion'];

    mainContainer.innerHTML = `
      <div class="stagehead">
        <div class="eyebrow">Control Plane · Stage 01</div>
        <h2>Loader & Ingestion Inspector</h2>
        <p>Ingest raw extracts from Cloud Storage (ADLS Gen2 / AWS) or local file uploads[cite: 1, 8, 10].</p>
      </div>

      <div class="toggle-mode-bar">
        <span class="toggle-label">STORAGE SOURCE:</span>
        <button id="modeCloudBtn" class="toggle-btn ${mode === 'cloud' ? 'active' : ''}">☁ Cloud Storage (ADLS / AWS)</button>
        <button id="modeLocalBtn" class="toggle-btn ${mode === 'local' ? 'active' : ''}">📁 Local File Upload (Source Entities)</button>
      </div>

      ${mode === 'cloud' ? `
        <div class="file-slots-grid">
          ${sourceEntities.map(slot => `
            <div class="slot-card">
              <div class="slot-header">
                <span class="slot-title">${slot.label}</span>
                <span class="entity-tag">${slot.entity}</span>
              </div>
              <div class="slot-body">
                <p class="file-path">abfss://raw-landing@xodusamp.dfs.core.windows.net/morningstar/${slot.file}</p>
                <div class="slot-status"><span class="status-pill ok">✓ ADLS Linked</span></div>
              </div>
              <div class="slot-actions">
                <button class="action-btn-sm">↻ Re-sync Path</button>
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="multi-upload-grid">
          ${sourceEntities.map(item => `
            <div class="local-upload-card" id="card-${item.id}">
              <div class="slot-header">
                <span class="slot-title">${item.label}</span>
                <span class="entity-tag">${item.entity}</span>
              </div>
              <p class="section-sub" style="margin-bottom: 8px;">Upload raw source extract for ${item.entity}:</p>
              
              <div class="upload-dropzone-compact">
                <input type="file" id="fileInput-${item.id}" class="file-input-hidden" />
                <button class="action-btn-sm btn-upload-trigger" data-slot-id="${item.id}" data-entity="${item.entity}">
                  📁 Pick File for ${item.entity}
                </button>
              </div>
              <div id="status-${item.id}" class="upload-msg-sm"></div>
            </div>
          `).join('')}
        </div>
      `}

      <div class="run-banner">
        <button id="runIngestionBtn" class="run-pipeline-btn">▶ Execute Ingestion & Profiling</button>
      </div>

      <div id="ingestionResults" class="output-results"></div>
    `;

    hitlContainer.innerHTML = `
      <div class="gatecard ${isApproved ? 'approved-card' : ''}">
        <h3>HITL Gate · Stage 01 Approval</h3>
        <p>Authorized: <b>Migration Analyst</b>[cite: 8, 12]</p>
      </div>
      <div class="stat-list">
        <div class="stat"><span>Ingestion Mode:</span> <b>${mode.toUpperCase()}</b></div>
        <div class="stat"><span>Source Entities:</span> <b>3 Raw Extracts</b></div>
        <div class="stat"><span>Approval Status:</span> <b>${isApproved ? 'APPROVED' : 'PENDING'}</b></div>
      </div>

      <button id="approveIngestionBtn" class="approve-btn ${isApproved ? 'btn-approved' : ''}">
        ${isApproved ? '✓ Ingestion Approved' : 'Approve Ingestion & Continue ->'}
      </button>
    `;

    document.getElementById('modeCloudBtn').addEventListener('click', () => { mode = 'cloud'; renderView(); });
    document.getElementById('modeLocalBtn').addEventListener('click', () => { mode = 'local'; renderView(); });

    if (mode === 'local') {
      mainContainer.querySelectorAll('.btn-upload-trigger').forEach(btn => {
        btn.addEventListener('click', () => {
          const slotId = btn.getAttribute('data-slot-id');
          const entity = btn.getAttribute('data-entity');
          const inputEl = document.getElementById(`fileInput-${slotId}`);

          inputEl.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const statusEl = document.getElementById(`status-${slotId}`);
            statusEl.innerHTML = `<span class="status-pill pending">Uploading ${file.name}...</span>`;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('entity', entity);

            const res = await fetch(`/api/runs/${state.runId}/upload-file`, {
              method: 'POST',
              body: formData
            });

            if (res.ok) {
              const data = await res.json();
              statusEl.innerHTML = `
                <span class="status-pill ok">✓ Stored: ${data.filename} (${data.sizeBytes} B)</span>
              `;

              // File upload triggers approval revocation[cite: 2, 8, 12]
              if (state.stageApprovals['01_ingestion']) {
                await revokeStageApproval('01_ingestion');
              }
            }
          };

          inputEl.click();
        });
      });
    }

    document.getElementById('runIngestionBtn').addEventListener('click', () => {
      document.getElementById('ingestionResults').innerHTML = `
        <div class="results-card">
          <h3>Ingestion Manifest Summary</h3>
          <table class="data-table">
            <thead>
              <tr><th>File Name</th><th>Entity</th><th>Source Mode</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr><td class="mono">morningstar_accounts.csv</td><td>Account</td><td>${mode.toUpperCase()}</td><td><span class="status-pill ok">✓ RAW Stored</span></td></tr>
              <tr><td class="mono">fidelity_positions.psv</td><td>Position</td><td>${mode.toUpperCase()}</td><td><span class="status-pill ok">✓ RAW Stored</span></td></tr>
              <tr><td class="mono">morningstar_performance.csv</td><td>Performance</td><td>${mode.toUpperCase()}</td><td><span class="status-pill ok">✓ RAW Stored</span></td></tr>
            </tbody>
          </table>
        </div>
      `;
    });

    document.getElementById('approveIngestionBtn').addEventListener('click', async () => {
      await processStageApproval('01_ingestion');
    });
  }

  renderView();
}