import { state, processStageApproval, revokeStageApproval } from '../prototype.js';

export async function renderDiscoveryStage(mainContainer, hitlContainer) {
  let isProfileRun = state.stageApprovals['02_discovery'];

  function renderView() {
    const isApproved = state.stageApprovals['02_discovery'];

    mainContainer.innerHTML = `
      <div class="stagehead">
        <div class="eyebrow">Control Plane · Stage 02</div>
        <h2>Discovery Agent & Profiler</h2>
        <p>Profiles source columns, detects data types, null rates, and maps source fields to canonical entities[cite: 1, 6, 8, 10].</p>
      </div>

      <div class="run-banner">
        <button id="runDiscoveryBtn" class="run-pipeline-btn">
          ${isProfileRun ? '↻ Re-Run Discovery Agent Profiling' : '▶ Run Discovery Agent Profiling'}
        </button>
      </div>

      <div id="discoveryResults" class="output-results">
        ${isProfileRun ? `
          <div class="results-card">
            <h3>Discovered Entity Schema</h3>
            <div class="entity-block">
              <h4>Account Entity (morningstar_accounts.csv)</h4>
              <ul class="field-list">
                <li><code>account_ref</code> (string) → Candidate Key: account_id</li>
                <li><code>household_ref</code> (string) → Candidate Key: household_id</li>
                <li><code>custodian</code> (string) → Requires Crosswalk: FID, SCH, PER</li>
                <li><code>reg_type</code> (string) → Requires Crosswalk: TAX, IRA</li>
              </ul>
            </div>

            <div class="entity-block">
              <h4>Position Entity (fidelity_positions.psv)</h4>
              <ul class="field-list">
                <li><code>account_ref</code> (string) → Composite Key: account_id</li>
                <li><code>cusip</code> (string) → Security Identifier</li>
                <li><code>mkt_val</code> (decimal) → Maps to market_value</li>
              </ul>
            </div>

            <div class="entity-block">
              <h4>Performance Entity (morningstar_performance.csv)</h4>
              <ul class="field-list">
                <li><code>period_end</code> (date) → Expression Target: PERIOD_START({{period_end}})</li>
                <li><code>return_net</code> (decimal) → Maps to return_net_of_fees</li>
              </ul>
            </div>
          </div>
        ` : `
          <div class="placeholder-box">
            <p><b>Profiling Pending</b></p>
            <p class="sub-text">Click "▶ Run Discovery Agent Profiling" above to profile source extracts and discover entity schemas[cite: 8, 10].</p>
          </div>
        `}
      </div>
    `;

    hitlContainer.innerHTML = `
      <div class="gatecard ${isApproved ? 'approved-card' : ''}">
        <h3>HITL Gate · Discovery Approval</h3>
        <p>Authorized: <b>Migration Analyst</b>[cite: 8, 12]</p>
      </div>
      <div class="stat-list">
        <div class="stat"><span>Profile Status:</span> <b>${isProfileRun ? 'PROFILED' : 'PENDING'}</b></div>
        <div class="stat"><span>Discovered Entities:</span> <b>${isProfileRun ? 'Account, Position, Performance' : '0'}</b></div>
        <div class="stat"><span>Target System:</span> <b>AMK</b></div>
        <div class="stat"><span>Approval Status:</span> <b>${isApproved ? 'APPROVED' : 'PENDING'}</b></div>
      </div>

      <button id="approveDiscoveryBtn" class="approve-btn ${isApproved ? 'btn-approved' : ''}" ${!isProfileRun && !isApproved ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
        ${isApproved ? '✓ Discovered Model Approved' : 'Approve Model & Continue ->'}
      </button>
    `;

    // Re-profiling revokes approval[cite: 2, 8, 12]
    document.getElementById('runDiscoveryBtn').addEventListener('click', async () => {
      isProfileRun = true;
      if (state.stageApprovals['02_discovery']) {
        await revokeStageApproval('02_discovery');
      }
      renderView();
    });

    if (isProfileRun || isApproved) {
      document.getElementById('approveDiscoveryBtn').addEventListener('click', async () => {
        await processStageApproval('02_discovery');
      });
    }
  }

  renderView();
}