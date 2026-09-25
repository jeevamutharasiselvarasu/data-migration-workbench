import { state, processStageApproval } from '../prototype.js';

export async function renderReconciliationStage(mainContainer, hitlContainer) {
  const isApproved = state.stageApprovals['06_reconcile'];

  mainContainer.innerHTML = `
    <div class="stagehead">
      <div class="eyebrow">Data Plane · Stage 06</div>
      <h2>Financial Reconciliation Agent</h2>
      <p>Independent audit comparing source extracts against loaded target entities to verify AUM, position counts, and drift tolerances.</p>
    </div>

    <button id="runReconciliationBtn" class="run-pipeline-btn">▶ Run Financial & Population Reconciliation</button>

    <div id="reconResults" class="output-results">
      <div class="placeholder-box">Click "Run Financial & Population Reconciliation" to compare source and target totals.</div>
    </div>
  `;

  hitlContainer.innerHTML = `
    <div class="gatecard ${isApproved ? 'approved-card' : ''}">
      <h3>HITL Gate · Final Reconciliation</h3>
      <p>Authorized: <b>Validation Specialist</b></p>
    </div>
    <div class="stat-list">
      <div class="stat"><span>Drift Tolerance:</span> <b>±0.05%</b></div>
      <div class="stat"><span>AUM Variance:</span> <b id="hitlAumVariance">$0.00</b></div>
      <div class="stat"><span>Reconciliation Status:</span> <b id="hitlReconStatus">${isApproved ? 'MATCHED' : 'PENDING'}</b></div>
    </div>
    <button id="finalSignOffBtn" class="approve-btn ${isApproved ? 'btn-approved' : ''}">
      ${isApproved ? '✓ Final Sign-Off Complete (LOAD_READY)' : 'Final Sign-Off (Mark LOAD_READY)'}
    </button>
  `;

  document.getElementById('runReconciliationBtn').addEventListener('click', () => {
    document.getElementById('reconResults').innerHTML = `
      <div class="results-card">
        <h3>Reconciliation Summary Report</h3>
        <div class="metrics-grid">
          <div class="metric-card ok">
            <div class="m-val">$1,245,800.00</div>
            <div class="m-lbl">Source Total Market Value</div>
          </div>
          <div class="metric-card ok">
            <div class="m-val">$1,245,800.00</div>
            <div class="m-lbl">Target Total Market Value</div>
          </div>
          <div class="metric-card ok">
            <div class="m-val">$0.00 (0.00%)</div>
            <div class="m-lbl">AUM Variance (Within Tolerance)</div>
          </div>
        </div>

        <h4 style="margin-top: 16px;">Population Control Totals</h4>
        <table class="data-table">
          <thead>
            <tr><th>Domain</th><th>Source Count</th><th>Target Count</th><th>Variance</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td>Account Entity</td><td>45</td><td>45</td><td>0</td><td><span class="status-pill ok">✓ Matched</span></td></tr>
            <tr><td>Position Entity</td><td>120</td><td>120</td><td>0</td><td><span class="status-pill ok">✓ Matched</span></td></tr>
            <tr><td>Performance Periods</td><td>360</td><td>360</td><td>0</td><td><span class="status-pill ok">✓ Matched</span></td></tr>
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('hitlReconStatus').textContent = 'MATCHED';
    document.getElementById('hitlReconStatus').style.color = 'var(--teal-deep)';
  });

  document.getElementById('finalSignOffBtn').addEventListener('click', async () => {
    await processStageApproval('06_reconcile');
  });
}