/* ==========================================================================
   IntelliDesk Application JS - Full Featured Client & Developer Portal
   ========================================================================== */

(function () {
  'use strict';

  // --- State Management ---
  const state = {
    token: localStorage.getItem('intellidesk_token') || null,
    user: JSON.parse(localStorage.getItem('intellidesk_user') || 'null'),
    activeAgentTab: 'all', // 'all' | 'assigned' | 'escalated'
    currentTicketDetailId: null
  };

  // --- Category Map ---
  const CATEGORIES = {
    1: 'PAYMENT',
    2: 'ACCOUNT',
    3: 'TECHNICAL',
    4: 'SECURITY',
    5: 'ORDER',
    6: 'DELIVERY',
    7: 'OTHER'
  };

  // --- DOM Element References ---
  const DOM = {
    // Nav
    navUserArea: document.getElementById('nav-user-area'),
    navUserRole: document.getElementById('nav-user-role'),
    navUserName: document.getElementById('nav-user-name'),
    btnLogout: document.getElementById('btn-logout'),

    // Sections
    sectionAuth: document.getElementById('section-auth'),
    sectionCustomer: document.getElementById('section-customer'),
    sectionAgent: document.getElementById('section-agent'),

    // Auth Forms
    tabLogin: document.getElementById('tab-login'),
    tabRegister: document.getElementById('tab-register'),
    formLogin: document.getElementById('form-login'),
    formRegister: document.getElementById('form-register'),
    loginEmail: document.getElementById('login-email'),
    loginPassword: document.getElementById('login-password'),
    regName: document.getElementById('reg-name'),
    regEmail: document.getElementById('reg-email'),
    regPassword: document.getElementById('reg-password'),

    // Customer Elements
    btnOpenCreateModal: document.getElementById('btn-open-create-modal'),
    formCreateTicket: document.getElementById('form-create-ticket'),
    custTicketsContainer: document.getElementById('cust-tickets-container'),
    statCustTotal: document.getElementById('stat-cust-total'),
    statCustActive: document.getElementById('stat-cust-active'),
    statCustResolved: document.getElementById('stat-cust-resolved'),

    // Agent Elements
    tabAgentAll: document.getElementById('tab-agent-all'),
    tabAgentAssigned: document.getElementById('tab-agent-assigned'),
    tabAgentEscalated: document.getElementById('tab-agent-escalated'),
    agentTicketsContainer: document.getElementById('agent-tickets-container'),
    statAgentAssigned: document.getElementById('stat-agent-assigned'),
    statAgentEscalated: document.getElementById('stat-agent-escalated'),

    // Modals
    modalCreateTicket: document.getElementById('modal-create-ticket'),
    modalTicketDetail: document.getElementById('modal-ticket-detail'),
    modalStatusTransition: document.getElementById('modal-status-transition'),

    // Detail Modal Elements
    detailTicketNumber: document.getElementById('detail-ticket-number'),
    detailTitle: document.getElementById('detail-title'),
    detailStatus: document.getElementById('detail-status'),
    detailSla: document.getElementById('detail-sla'),
    detailCategory: document.getElementById('detail-category'),
    detailPriority: document.getElementById('detail-priority'),
    detailDescription: document.getElementById('detail-description'),
    detailResolutionBox: document.getElementById('detail-resolution-box'),
    detailResolutionText: document.getElementById('detail-resolution-text'),
    detailHintBox: document.getElementById('detail-hint-box'),
    detailHintText: document.getElementById('detail-hint-text'),
    detailHistoryTimeline: document.getElementById('detail-history-timeline'),
    detailActions: document.getElementById('detail-actions'),

    // Transition Form Elements
    formStatusTransition: document.getElementById('form-status-transition'),
    transTicketId: document.getElementById('trans-ticket-id'),
    transTargetStatus: document.getElementById('trans-target-status'),
    groupResolution: document.getElementById('group-resolution'),
    transResolution: document.getElementById('trans-resolution'),
    transReason: document.getElementById('trans-reason'),

    toastContainer: document.getElementById('toast-container')
  };

  // --- API Client ---
  async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    const config = { method, headers };
    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const res = await fetch(endpoint, config);
      
      if (res.status === 401) {
        // Token invalid / expired
        handleLogout();
        showToast('Session expired. Please sign in again.', 'error');
        throw new Error('Unauthorized');
      }

      const contentType = res.headers.get('content-type');
      let data = null;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (!res.ok) {
        const errorMsg = data?.message || data?.error || `Request failed with status ${res.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error('API Error:', err);
      throw err;
    }
  }

  // --- Toast Notifications ---
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
      <div>${escapeHtml(message)}</div>
    `;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- Modal Helpers ---
  function openModal(modalEl) {
    modalEl.classList.add('active');
  }

  function closeModal(modalEl) {
    modalEl.classList.remove('active');
  }

  document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = btn.getAttribute('data-modal');
      if (modalId) {
        const target = document.getElementById(modalId);
        if (target) closeModal(target);
      }
    });
  });

  // Close modal when clicking backdrop
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop);
    });
  });

  // --- Auth Handlers ---
  DOM.tabLogin.addEventListener('click', () => {
    DOM.tabLogin.classList.add('active');
    DOM.tabRegister.classList.remove('active');
    DOM.formLogin.style.display = 'block';
    DOM.formRegister.style.display = 'none';
  });

  DOM.tabRegister.addEventListener('click', () => {
    DOM.tabRegister.classList.add('active');
    DOM.tabLogin.classList.remove('active');
    DOM.formRegister.style.display = 'block';
    DOM.formLogin.style.display = 'none';
  });

  DOM.formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await apiCall('/api/auth/login', 'POST', {
        email: DOM.loginEmail.value.trim(),
        password: DOM.loginPassword.value
      });
      setSession(data.token, data.user);
      showToast(`Welcome back, ${data.user.fullName}!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  DOM.formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await apiCall('/api/auth/register', 'POST', {
        fullName: DOM.regName.value.trim(),
        email: DOM.regEmail.value.trim(),
        password: DOM.regPassword.value
      });
      setSession(data.token, data.user);
      showToast('Registration successful! Welcome to IntelliDesk.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  DOM.btnLogout.addEventListener('click', handleLogout);

  function setSession(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem('intellidesk_token', token);
    localStorage.setItem('intellidesk_user', JSON.stringify(user));
    renderApp();
  }

  function handleLogout() {
    state.token = null;
    state.user = null;
    localStorage.removeItem('intellidesk_token');
    localStorage.removeItem('intellidesk_user');
    renderApp();
  }

  async function checkSession() {
    if (!state.token) {
      renderApp();
      return;
    }
    try {
      const user = await apiCall('/api/auth/me');
      state.user = user;
      localStorage.setItem('intellidesk_user', JSON.stringify(user));
      renderApp();
    } catch (err) {
      handleLogout();
    }
  }

  // --- Main View Router ---
  function renderApp() {
    if (!state.token || !state.user) {
      DOM.sectionAuth.style.display = 'block';
      DOM.sectionCustomer.style.display = 'none';
      DOM.sectionAgent.style.display = 'none';
      DOM.navUserArea.style.display = 'none';
      return;
    }

    DOM.sectionAuth.style.display = 'none';
    DOM.navUserArea.style.display = 'flex';
    DOM.navUserName.textContent = state.user.fullName;
    DOM.navUserRole.textContent = state.user.role;
    DOM.navUserRole.className = `role-badge ${state.user.role.toLowerCase()}`;

    if (state.user.role === 'CUSTOMER') {
      DOM.sectionCustomer.style.display = 'block';
      DOM.sectionAgent.style.display = 'none';
      loadCustomerDashboard();
    } else {
      // AGENT or ADMIN
      DOM.sectionCustomer.style.display = 'none';
      DOM.sectionAgent.style.display = 'block';
      loadAgentDashboard();
    }
  }

  // ---------------------------------------------------------------------------
  // Customer Flow
  // ---------------------------------------------------------------------------

  DOM.btnOpenCreateModal.addEventListener('click', () => {
    DOM.formCreateTicket.reset();
    openModal(DOM.modalCreateTicket);
  });

  DOM.formCreateTicket.addEventListener('submit', async (e) => {
    e.preventDefault();
    const catVal = document.getElementById('ticket-category').value;
    const prioVal = document.getElementById('ticket-priority').value;

    const payload = {
      title: document.getElementById('ticket-title').value.trim(),
      description: document.getElementById('ticket-description').value.trim()
    };
    if (catVal) payload.categoryId = parseInt(catVal, 10);
    if (prioVal) payload.priority = prioVal;

    try {
      const ticket = await apiCall('/api/tickets', 'POST', payload);
      closeModal(DOM.modalCreateTicket);
      showToast(`Ticket ${ticket.ticketNumber} created! Classified as ${ticket.category.name} (${ticket.priority})`, 'success');
      loadCustomerDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  async function loadCustomerDashboard() {
    try {
      const res = await apiCall('/api/tickets/my?page=0&size=50&sort=createdAt,desc');
      const tickets = res.content || [];
      renderCustomerTickets(tickets);
      
      // Update stats
      DOM.statCustTotal.textContent = res.totalElements || tickets.length;
      const activeCount = tickets.filter(t => ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED'].includes(t.status)).length;
      const resolvedCount = tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status)).length;
      DOM.statCustActive.textContent = activeCount;
      DOM.statCustResolved.textContent = resolvedCount;
    } catch (err) {
      showToast('Failed to load tickets', 'error');
    }
  }

  function renderCustomerTickets(tickets) {
    if (tickets.length === 0) {
      DOM.custTicketsContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">📨</div>
          <h3>No Support Tickets Raised Yet</h3>
          <p>Click "+ Raise New Ticket" above to submit a support request.</p>
        </div>
      `;
      return;
    }

    DOM.custTicketsContainer.innerHTML = tickets.map(t => `
      <div class="ticket-card" onclick="window.viewTicketDetail(${t.id})">
        <div>
          <div class="ticket-header">
            <span class="ticket-number">${escapeHtml(t.ticketNumber)}</span>
            <span class="badge badge-${t.status.toLowerCase()}">${t.status}</span>
          </div>
          <h3 class="ticket-title">${escapeHtml(t.title)}</h3>
          <p class="ticket-description">${escapeHtml(t.description)}</p>
        </div>
        <div>
          <div class="ticket-meta">
            <span class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-primary);">${escapeHtml(t.category.name)}</span>
            <span class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-primary);">${t.priority}</span>
            <span class="badge badge-sla-${t.sla.status.toLowerCase()}">${t.sla.status.replace('_', ' ')}</span>
            <span style="margin-left: auto;">${formatDate(t.createdAt)}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ---------------------------------------------------------------------------
  // Developer / Agent Flow
  // ---------------------------------------------------------------------------

  if (DOM.tabAgentAll) {
    DOM.tabAgentAll.addEventListener('click', () => {
      DOM.tabAgentAll.classList.add('active');
      DOM.tabAgentAssigned.classList.remove('active');
      DOM.tabAgentEscalated.classList.remove('active');
      state.activeAgentTab = 'all';
      loadAgentDashboard();
    });
  }

  DOM.tabAgentAssigned.addEventListener('click', () => {
    DOM.tabAgentAssigned.classList.add('active');
    if (DOM.tabAgentAll) DOM.tabAgentAll.classList.remove('active');
    DOM.tabAgentEscalated.classList.remove('active');
    state.activeAgentTab = 'assigned';
    loadAgentDashboard();
  });

  DOM.tabAgentEscalated.addEventListener('click', () => {
    DOM.tabAgentEscalated.classList.add('active');
    if (DOM.tabAgentAll) DOM.tabAgentAll.classList.remove('active');
    DOM.tabAgentAssigned.classList.remove('active');
    state.activeAgentTab = 'escalated';
    loadAgentDashboard();
  });

  async function loadAgentDashboard() {
    try {
      // Fetch assigned for counter
      const assignedRes = await apiCall('/api/tickets/assigned?page=0&size=50&sort=createdAt,desc').catch(() => ({ content: [], totalElements: 0 }));
      const assignedTickets = assignedRes.content || [];
      DOM.statAgentAssigned.textContent = assignedRes.totalElements || assignedTickets.length;

      // Fetch escalated (admin/agent view)
      let escalatedTickets = [];
      let allTickets = [];

      if (state.user.role === 'ADMIN') {
        const allRes = await apiCall('/api/tickets?page=0&size=50&sort=createdAt,desc').catch(() => ({ content: [], totalElements: 0 }));
        allTickets = allRes.content || [];

        const escRes = await apiCall('/api/tickets?status=ESCALATED&page=0&size=50').catch(() => ({ content: [], totalElements: 0 }));
        escalatedTickets = escRes.content || [];
        DOM.statAgentEscalated.textContent = escRes.totalElements || escalatedTickets.length;
      } else {
        allTickets = assignedTickets;
        escalatedTickets = assignedTickets.filter(t => t.status === 'ESCALATED');
        DOM.statAgentEscalated.textContent = escalatedTickets.length;
      }

      let ticketsToRender = allTickets;
      if (state.activeAgentTab === 'assigned') ticketsToRender = assignedTickets;
      else if (state.activeAgentTab === 'escalated') ticketsToRender = escalatedTickets;

      renderAgentTickets(ticketsToRender);

    } catch (err) {
      showToast('Failed to load agent console tickets', 'error');
    }
  }

  function renderAgentTickets(tickets) {
    if (tickets.length === 0) {
      DOM.agentTicketsContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">☕</div>
          <h3>Queue is Clean</h3>
          <p>No tickets currently in this view.</p>
        </div>
      `;
      return;
    }

    DOM.agentTicketsContainer.innerHTML = tickets.map(t => `
      <div class="ticket-card" onclick="window.viewTicketDetail(${t.id})">
        <div>
          <div class="ticket-header">
            <span class="ticket-number">${escapeHtml(t.ticketNumber)}</span>
            <span class="badge badge-${t.status.toLowerCase()}">${t.status}</span>
          </div>
          <h3 class="ticket-title">${escapeHtml(t.title)}</h3>
          <p class="ticket-description">${escapeHtml(t.description)}</p>
        </div>
        <div>
          <div class="ticket-meta">
            <span class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-primary);">${escapeHtml(t.category.name)}</span>
            <span class="badge" style="background: rgba(255,255,255,0.08); color: var(--text-primary);">${t.priority}</span>
            <span class="badge badge-sla-${t.sla.status.toLowerCase()}">${t.sla.status.replace('_', ' ')}</span>
            <span style="margin-left: auto;">${t.assignedAgent ? `Agent: ${escapeHtml(t.assignedAgent.fullName)}` : '⚠️ Unassigned'}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // ---------------------------------------------------------------------------
  // Ticket Detail & History Modal
  // ---------------------------------------------------------------------------

  window.viewTicketDetail = async function (ticketId) {
    state.currentTicketDetailId = ticketId;
    try {
      const ticket = await apiCall(`/api/tickets/${ticketId}`);
      const history = await apiCall(`/api/tickets/${ticketId}/history`).catch(() => []);
      
      DOM.detailTicketNumber.textContent = ticket.ticketNumber;
      DOM.detailTitle.textContent = ticket.title;
      DOM.detailStatus.textContent = ticket.status;
      DOM.detailStatus.className = `badge badge-${ticket.status.toLowerCase()}`;
      
      DOM.detailSla.textContent = `SLA: ${ticket.sla.status.replace('_', ' ')}`;
      DOM.detailSla.className = `badge badge-sla-${ticket.sla.status.toLowerCase()}`;
      
      DOM.detailCategory.textContent = ticket.category.name;
      DOM.detailPriority.textContent = `Priority: ${ticket.priority}`;
      DOM.detailDescription.textContent = ticket.description;

      // Resolution text
      if (ticket.resolution) {
        DOM.detailResolutionBox.style.display = 'block';
        DOM.detailResolutionText.textContent = ticket.resolution;
      } else {
        DOM.detailResolutionBox.style.display = 'none';
      }

      // Agent AI Hint
      if (ticket.suggestedResponse) {
        DOM.detailHintBox.style.display = 'block';
        DOM.detailHintText.textContent = ticket.suggestedResponse;
      } else {
        DOM.detailHintBox.style.display = 'none';
      }

      // History Timeline
      DOM.detailHistoryTimeline.innerHTML = history.map(h => `
        <div class="timeline-item">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-meta">
              <span><strong>${escapeHtml(h.changedBy || 'System')}</strong></span>
              <span>${formatDate(h.createdAt)}</span>
            </div>
            <div class="timeline-title">${h.oldStatus ? `${h.oldStatus} ➔ ` : ''}<strong>${h.newStatus}</strong></div>
            ${h.reason ? `<div class="timeline-reason">${escapeHtml(h.reason)}</div>` : ''}
          </div>
        </div>
      `).join('');

      // Dynamic Action Buttons
      renderDetailActions(ticket);

      openModal(DOM.modalTicketDetail);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  function renderDetailActions(ticket) {
    const isCustomer = state.user.role === 'CUSTOMER';
    let buttons = '';

    if (isCustomer) {
      if (ticket.status === 'RESOLVED') {
        buttons += `
          <button class="btn btn-success" onclick="window.customerConfirmClose(${ticket.id})">Confirm Fix & Close Ticket</button>
          <button class="btn btn-warning" onclick="window.customerReopen(${ticket.id})">Reopen Ticket (Not Fixed)</button>
        `;
      } else if (ticket.status === 'CLOSED') {
        buttons += `
          <button class="btn btn-warning" onclick="window.customerReopen(${ticket.id})">Reopen Ticket</button>
        `;
      }
    } else {
      // Developer / Agent / Admin actions
      if (['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED'].includes(ticket.status)) {
        buttons += `
          <button class="btn btn-success" onclick="window.runAiResolutionAgent(${ticket.id})">🤖 Run AI Resolution Agent</button>
        `;
      }

      if (state.user.role === 'ADMIN' && ticket.status === 'OPEN') {
        buttons += `
          <button class="btn btn-primary" onclick="window.assignTicketToBestAgent(${ticket.id})">⚡ Auto-Assign to Best Agent</button>
        `;
      }
      
      if (['ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'ESCALATED'].includes(ticket.status)) {
        buttons += `
          <button class="btn btn-primary" onclick="window.openStatusTransitionModal(${ticket.id})">Update Status / Resolve</button>
        `;
      }
    }

    DOM.detailActions.innerHTML = buttons;
  }

  // --- Specialized AI Resolution Agent Action ---
  window.runAiResolutionAgent = async function(id) {
    try {
      const ticket = await apiCall(`/api/tickets/${id}/auto-resolve`, 'POST');
      closeModal(DOM.modalTicketDetail);
      showToast(`Ticket ${ticket.ticketNumber} auto-resolved by ${ticket.category.name} AI Agent!`, 'success');
      if (state.user.role === 'CUSTOMER') {
        loadCustomerDashboard();
      } else {
        loadAgentDashboard();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- Auto Assign Action ---
  window.assignTicketToBestAgent = async function(id) {
    try {
      const ticket = await apiCall(`/api/tickets/${id}/assign`, 'POST');
      closeModal(DOM.modalTicketDetail);
      showToast(`Ticket ${ticket.ticketNumber} assigned to ${ticket.assignedAgent ? ticket.assignedAgent.fullName : 'Agent'}!`, 'success');
      loadAgentDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- Customer Status Actions ---
  window.customerConfirmClose = async function(id) {
    try {
      await apiCall(`/api/tickets/${id}/status`, 'POST', { target: 'CLOSED', reason: 'Customer confirmed resolution' });
      closeModal(DOM.modalTicketDetail);
      showToast('Ticket marked as CLOSED. Thank you!', 'success');
      loadCustomerDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.customerReopen = async function(id) {
    const reason = prompt('Please enter the reason for reopening this ticket:', 'Issue is still occurring');
    if (!reason) return;

    try {
      await apiCall(`/api/tickets/${id}/status`, 'POST', { target: 'OPEN', reason });
      closeModal(DOM.modalTicketDetail);
      showToast('Ticket reopened successfully.', 'success');
      loadCustomerDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // --- Developer Status Transition Modal ---
  window.openStatusTransitionModal = function(id) {
    closeModal(DOM.modalTicketDetail);
    DOM.transTicketId.value = id;
    DOM.transTargetStatus.value = 'IN_PROGRESS';
    DOM.transResolution.value = '';
    DOM.transReason.value = '';
    DOM.groupResolution.style.display = 'none';
    openModal(DOM.modalStatusTransition);
  };

  DOM.transTargetStatus.addEventListener('change', (e) => {
    if (e.target.value === 'RESOLVED') {
      DOM.groupResolution.style.display = 'block';
      DOM.transResolution.required = true;
    } else {
      DOM.groupResolution.style.display = 'none';
      DOM.transResolution.required = false;
    }
  });

  DOM.formStatusTransition.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = DOM.transTicketId.value;
    const target = DOM.transTargetStatus.value;
    const resolution = DOM.transResolution.value.trim();
    const reason = DOM.transReason.value.trim();

    const payload = { target };
    if (resolution) payload.resolution = resolution;
    if (reason) payload.reason = reason;

    try {
      await apiCall(`/api/tickets/${id}/status`, 'POST', payload);
      closeModal(DOM.modalStatusTransition);
      showToast(`Ticket status updated to ${target}!`, 'success');
      loadAgentDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  // --- Utilities ---
  function formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // --- Initialize Application ---
  checkSession();

})();
