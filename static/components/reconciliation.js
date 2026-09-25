import { state } from '../prototype.js';

export async function renderReconciliationStage(mainContainer, hitlContainer) {
  mainContainer.innerHTML = `
    <div class="stagehead">
      <div class="eyebrow">Data Plane · Stage 06</div>
      <h2>Financial Reconciliation Agent</h2>
      <p>Independent audit comparing source extracts against loaded target entities to verify AUM, position counts, and drift tolerances[cite: 8, 10].</p>
    </div>

    <button id="runReconciliationBtn" class="run-pipeline-btn">▶ Run Financial & Population Reconciliation</button>

    <div id="reconResults" class="output-results">
      <div class="placeholder-box">Click "Run Financial & Population Reconciliation" to compare source and target totals.</div>
    </div>
  `;

  // Render HITL Side Panel
  hitlContainer.innerHTML = `
    <div class="gatecard">
      <h3>HITL Gate · Final Reconciliation</h3>
      <p>Authorized: <b>Validation Specialist</b>[cite: 8, 12]</p>
    </div>
    <div class="stat-list">
      <div class="stat"><span>Drift Tolerance:</span> <b>±0.05%</b></div>
      <div class="stat"><span>AUM Variance:</span> <b id="hitlAumVariance">$0.00</b></div>
      <div class="stat"><span>Reconciliation Status:</span> <b id="hitlReconStatus">PENDING</b></div>
    </div>
    <button id="finalSignOffBtn" class="approve-btn">Final Sign-Off (Mark LOAD_READY)</button>
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
    const res = await fetch('/api/runs/run-demo-001/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage: 'FINAL_APPROVAL',
        decision: 'APPROVED',
        reviewer: state.currentUser || 'Marcus (Specialist)',
        comments: 'Financial reconciliation passed with 0 variance. Run is LOAD_READY.'
      })
    });

    if (res.ok) {
      alert('Migration Run Signed Off & Marked LOAD_READY! Ready for production cutover.');
    }
  });
}