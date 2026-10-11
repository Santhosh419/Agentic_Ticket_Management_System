/* ==========================================================================
   IntelliDesk Application JS - Full Featured Client & Developer Portal
   ========================================================================== */

(function () {
  'use strict';

  // --- State Management ---
  const state = {
    token: localStorage.getItem('intellidesk_token') || null,
    user: JSON.parse(localStorage.getItem('intellidesk_user') || 'null'),
    activeView: 'tickets', // 'tickets' | 'ecommerce'
    activeEcomTab: 'orders', // 'orders' | 'products'
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

  // --- SVG Vector Icons & 3D Mocks ---
  const SVG_ICONS = {
    package: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`,
    truck: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
    sparkles: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
    cpu: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2"/><path d="M15 20v2"/><path d="M2 15h2"/><path d="M2 9h2"/><path d="M20 15h2"/><path d="M20 9h2"/><path d="M9 2v2"/><path d="M9 20v2"/></svg>`,
    userCheck: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>`,
    user: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>`,
    check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><polyline points="20 6 9 17 4 12"/></svg>`,
    x: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="svg-icon"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    emptyInbox: `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); margin-bottom: 0.75rem;"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
    emptyCheck: `<svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted); margin-bottom: 0.75rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
  };

  // --- DOM Element References ---
  const DOM = {
    // Nav
    navViews: document.getElementById('nav-views'),
    navBtnTickets: document.getElementById('nav-btn-tickets'),
    navBtnEcommerce: document.getElementById('nav-btn-ecommerce'),
    navUserArea: document.getElementById('nav-user-area'),
    navUserRole: document.getElementById('nav-user-role'),
    navUserName: document.getElementById('nav-user-name'),
    btnLogout: document.getElementById('btn-logout'),

    // Sections
    sectionAuth: document.getElementById('section-auth'),
    sectionCustomer: document.getElementById('section-customer'),
    sectionAgent: document.getElementById('section-agent'),
    sectionEcommerce: document.getElementById('section-ecommerce'),

    // E-Commerce Elements
    tabEcomOrders: document.getElementById('tab-ecom-orders'),
    tabEcomProducts: document.getElementById('tab-ecom-products'),
    ecomOrdersView: document.getElementById('ecom-orders-view'),
    ecomProductsView: document.getElementById('ecom-products-view'),
    ecomOrdersContainer: document.getElementById('ecom-orders-container'),
    ecomProductsContainer: document.getElementById('ecom-products-container'),

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
    regPhone: document.getElementById('reg-phone'),
    linkToRegister: document.getElementById('link-to-register'),
    linkToLogin: document.getElementById('link-to-login'),

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
    detailOrderBox: document.getElementById('detail-order-box'),
    detailOrderNumber: document.getElementById('detail-order-number'),
    detailOrderContent: document.getElementById('detail-order-content'),
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
      
      const contentType = res.headers.get('content-type');
      let data = null;
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      }

      if (res.status === 401 && !endpoint.startsWith('/api/auth/')) {
        // Token invalid / expired for authenticated endpoint
        handleLogout();
        showToast('Session expired. Please sign in again.', 'error');
        throw new Error('Unauthorized');
      }

      if (!res.ok) {
        let errorMsg = '';
        if (data?.fieldErrors && typeof data.fieldErrors === 'object' && Object.keys(data.fieldErrors).length > 0) {
          errorMsg = Object.values(data.fieldErrors).join('. ');
        } else {
          errorMsg = data?.message || data?.error || `Request failed with status ${res.status}`;
        }
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
    const iconHtml = type === 'success' ? SVG_ICONS.check : type === 'error' ? SVG_ICONS.x : SVG_ICONS.info;
    toast.innerHTML = `
      <span style="display: flex; align-items: center;">${iconHtml}</span>
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
  function switchToLogin() {
    DOM.tabLogin.classList.add('active');
    DOM.tabRegister.classList.remove('active');
    DOM.formLogin.style.display = 'block';
    DOM.formRegister.style.display = 'none';
  }

  function switchToRegister() {
    DOM.tabRegister.classList.add('active');
    DOM.tabLogin.classList.remove('active');
    DOM.formRegister.style.display = 'block';
    DOM.formLogin.style.display = 'none';
  }

  DOM.tabLogin.addEventListener('click', switchToLogin);
  DOM.tabRegister.addEventListener('click', switchToRegister);
  if (DOM.linkToRegister) DOM.linkToRegister.addEventListener('click', (e) => { e.preventDefault(); switchToRegister(); });
  if (DOM.linkToLogin) DOM.linkToLogin.addEventListener('click', (e) => { e.preventDefault(); switchToLogin(); });

  DOM.formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = DOM.formLogin.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Sign In';
    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
      }
      const data = await apiCall('/api/auth/login', 'POST', {
        email: DOM.loginEmail.value.trim(),
        password: DOM.loginPassword.value
      });
      DOM.formLogin.reset();
      setSession(data.token, data.user);
      showToast(`Welcome back, ${data.user.fullName}!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    }
  });

  DOM.formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = DOM.formRegister.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Register Account';
    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account...';
      }
      const payload = {
        fullName: DOM.regName.value.trim(),
        email: DOM.regEmail.value.trim(),
        password: DOM.regPassword.value
      };
      if (DOM.regPhone && DOM.regPhone.value.trim()) {
        payload.phone = DOM.regPhone.value.trim();
      }
      const data = await apiCall('/api/auth/register', 'POST', payload);
      DOM.formRegister.reset();
      setSession(data.token, data.user);
      showToast('Registration successful! Welcome to IntelliDesk.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
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
    switchToLogin();
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
      DOM.sectionEcommerce.style.display = 'none';
      DOM.navUserArea.style.display = 'none';
      if (DOM.navViews) DOM.navViews.style.display = 'none';
      return;
    }

    DOM.sectionAuth.style.display = 'none';
    DOM.navUserArea.style.display = 'flex';
    if (DOM.navViews) DOM.navViews.style.display = 'flex';
    DOM.navUserName.textContent = state.user.fullName;
    DOM.navUserRole.textContent = state.user.role;
    DOM.navUserRole.className = `role-badge ${state.user.role.toLowerCase()}`;

    if (state.activeView === 'ecommerce') {
      DOM.sectionCustomer.style.display = 'none';
      DOM.sectionAgent.style.display = 'none';
      DOM.sectionEcommerce.style.display = 'block';
      if (DOM.navBtnTickets) DOM.navBtnTickets.classList.remove('active');
      if (DOM.navBtnEcommerce) DOM.navBtnEcommerce.classList.add('active');
      loadEcommerceView();
    } else {
      DOM.sectionEcommerce.style.display = 'none';
      if (DOM.navBtnTickets) DOM.navBtnTickets.classList.add('active');
      if (DOM.navBtnEcommerce) DOM.navBtnEcommerce.classList.remove('active');
      if (state.user.role === 'CUSTOMER') {
        DOM.sectionCustomer.style.display = 'block';
        DOM.sectionAgent.style.display = 'none';
        loadCustomerDashboard();
      } else {
        DOM.sectionCustomer.style.display = 'none';
        DOM.sectionAgent.style.display = 'block';
        loadAgentDashboard();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Customer Flow
  // ---------------------------------------------------------------------------

  DOM.btnOpenCreateModal.addEventListener('click', async () => {
    DOM.formCreateTicket.reset();
    const orderSelect = document.getElementById('ticket-order');
    if (orderSelect) {
      orderSelect.innerHTML = '<option value="">None / Not Order Related</option>';
      try {
        const orders = await apiCall('/api/ecommerce/orders/my').catch(() => []);
        if (Array.isArray(orders) && orders.length > 0) {
          orderSelect.innerHTML += orders.map(o =>
            `<option value="${o.id}">${escapeHtml(o.orderNumber)} ($${o.totalAmount != null ? o.totalAmount.toFixed(2) : '0.00'} - ${o.status})</option>`
          ).join('');
        }
      } catch (err) {}
    }
    openModal(DOM.modalCreateTicket);
  });

  DOM.formCreateTicket.addEventListener('submit', async (e) => {
    e.preventDefault();
    const catVal = document.getElementById('ticket-category').value;
    const prioVal = document.getElementById('ticket-priority').value;
    const orderVal = document.getElementById('ticket-order') ? document.getElementById('ticket-order').value : null;

    const payload = {
      title: document.getElementById('ticket-title').value.trim(),
      description: document.getElementById('ticket-description').value.trim()
    };
    if (catVal) payload.categoryId = parseInt(catVal, 10);
    if (prioVal) payload.priority = prioVal;
    if (orderVal) payload.orderId = parseInt(orderVal, 10);

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
          <div class="empty-icon">${SVG_ICONS.emptyInbox}</div>
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
            ${t.order ? `<span class="badge badge-order-tag" style="display: inline-flex; align-items: center; gap: 0.35rem;">${SVG_ICONS.package} ${escapeHtml(t.order.orderNumber)} (${t.order.status})</span>` : ''}
            <span class="badge badge-${t.status.toLowerCase()}">${t.status}</span>
          </div>
          <h3 class="ticket-title">${escapeHtml(t.title)}</h3>
          <p class="ticket-description">${escapeHtml(t.description)}</p>
        </div>
        <div>
          <div class="ticket-meta">
            <span class="badge badge-subtle">${escapeHtml(t.category.name)}</span>
            <span class="badge badge-subtle">${t.priority}</span>
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
          <div class="empty-icon">${SVG_ICONS.emptyCheck}</div>
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
            ${t.order ? `<span class="badge badge-order-tag" style="display: inline-flex; align-items: center; gap: 0.35rem;">${SVG_ICONS.package} ${escapeHtml(t.order.orderNumber)} (${t.order.status})</span>` : ''}
            <span class="badge badge-${t.status.toLowerCase()}">${t.status}</span>
          </div>
          <h3 class="ticket-title">${escapeHtml(t.title)}</h3>
          <p class="ticket-description">${escapeHtml(t.description)}</p>
        </div>
        <div>
          <div class="ticket-meta">
            <span class="badge badge-subtle">${escapeHtml(t.category.name)}</span>
            <span class="badge badge-subtle">${t.priority}</span>
            <span class="badge badge-sla-${t.sla.status.toLowerCase()}">${t.sla.status.replace('_', ' ')}</span>
            <span style="margin-left: auto;">${t.assignedAgent ? `Agent: ${escapeHtml(t.assignedAgent.fullName)}` : `<span style="display: inline-flex; align-items: center; gap: 0.25rem;">${SVG_ICONS.user} Unassigned</span>`}</span>
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

      // Linked E-Commerce Order
      if (ticket.order) {
        DOM.detailOrderBox.style.display = 'block';
        DOM.detailOrderNumber.textContent = ticket.order.orderNumber;
        DOM.detailOrderContent.innerHTML = `
          <div><strong>Status:</strong> <span class="badge badge-${ticket.order.status.toLowerCase()}">${ticket.order.status}</span> &nbsp;|&nbsp; <strong>Payment:</strong> <span class="badge">${ticket.order.paymentStatus}</span> &nbsp;|&nbsp; <strong>Amount:</strong> $${ticket.order.totalAmount != null ? ticket.order.totalAmount.toFixed(2) : '0.00'}</div>
          ${ticket.order.trackingNumber ? `<div style="margin-top: 0.35rem;"><strong>Tracking:</strong> <code>${escapeHtml(ticket.order.trackingNumber)}</code></div>` : ''}
        `;
      } else {
        DOM.detailOrderBox.style.display = 'none';
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
            <div class="timeline-title">${h.oldStatus ? `${h.oldStatus} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="svg-icon" style="margin: 0 4px;"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg> ` : ''}<strong>${h.newStatus}</strong></div>
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
          <button class="btn btn-success" onclick="window.runAiResolutionAgent(${ticket.id})">${SVG_ICONS.cpu} Run AI Resolution Agent</button>
        `;
      }

      if (state.user.role === 'ADMIN' && ticket.status === 'OPEN') {
        buttons += `
          <button class="btn btn-primary" onclick="window.assignTicketToBestAgent(${ticket.id})">${SVG_ICONS.userCheck} Auto-Assign to Best Agent</button>
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
      showToast('AI Resolution Agent is analyzing issue and e-commerce records...', 'info');
      const ticket = await apiCall(`/api/tickets/${id}/auto-resolve`, 'POST');
      showToast(`Ticket ${ticket.ticketNumber} successfully resolved with automated remediation!`, 'success');
      window.viewTicketDetail(id);
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

  // ---------------------------------------------------------------------------
  // E-Commerce View & Handlers
  // ---------------------------------------------------------------------------

  if (DOM.navBtnTickets) {
    DOM.navBtnTickets.addEventListener('click', () => {
      state.activeView = 'tickets';
      renderApp();
    });
  }

  if (DOM.navBtnEcommerce) {
    DOM.navBtnEcommerce.addEventListener('click', () => {
      state.activeView = 'ecommerce';
      renderApp();
    });
  }

  if (DOM.tabEcomOrders) {
    DOM.tabEcomOrders.addEventListener('click', () => {
      state.activeEcomTab = 'orders';
      DOM.tabEcomOrders.classList.add('active');
      DOM.tabEcomProducts.classList.remove('active');
      DOM.ecomOrdersView.style.display = 'block';
      DOM.ecomProductsView.style.display = 'none';
      loadEcommerceOrders();
    });
  }

  if (DOM.tabEcomProducts) {
    DOM.tabEcomProducts.addEventListener('click', () => {
      state.activeEcomTab = 'products';
      DOM.tabEcomProducts.classList.add('active');
      DOM.tabEcomOrders.classList.remove('active');
      DOM.ecomProductsView.style.display = 'block';
      DOM.ecomOrdersView.style.display = 'none';
      loadEcommerceProducts();
    });
  }

  function loadEcommerceView() {
    if (state.activeEcomTab === 'products') {
      loadEcommerceProducts();
    } else {
      loadEcommerceOrders();
    }
  }

  async function loadEcommerceOrders() {
    if (!DOM.ecomOrdersContainer) return;
    DOM.ecomOrdersContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 2rem;">Loading orders...</div>';
    try {
      const endpoint = state.user.role === 'CUSTOMER' ? '/api/ecommerce/orders/my' : '/api/ecommerce/orders';
      const orders = await apiCall(endpoint);
      if (!orders || orders.length === 0) {
        DOM.ecomOrdersContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 2rem;">No orders found for this account.</div>';
        return;
      }
      DOM.ecomOrdersContainer.innerHTML = orders.map(order => {
        const itemsSummary = (order.items || []).map(i => `${escapeHtml(i.productName)} (x${i.quantity})`).join(', ') || 'N/A';
        const trackingInfo = order.trackingNumber 
          ? `<span style="display: inline-flex; align-items: center; gap: 0.35rem;">${SVG_ICONS.truck} <strong style="color: var(--text-primary);">${escapeHtml(order.carrierName || 'Carrier')}</strong>: <code style="background: var(--bg-subtle); border: 1px solid var(--border-color); padding: 2px 6px; border-radius: var(--radius-xs); font-family: var(--font-mono); color: var(--text-primary); font-size: 0.78rem;">${escapeHtml(order.trackingNumber)}</code></span>` 
          : `<span style="display: inline-flex; align-items: center; gap: 0.35rem;">${SVG_ICONS.package} Standard Ground Dispatch</span>`;
        
        return `
          <div class="ticket-card" style="border-left: 3px solid ${getOrderStatusColor(order.status)};">
            <div class="ticket-card-header">
              <span class="ticket-number">${escapeHtml(order.orderNumber)}</span>
              <div style="display: flex; gap: 0.4rem; align-items: center;">
                <span class="badge badge-${order.status.toLowerCase()}">${escapeHtml(order.status)}</span>
                <span class="badge" style="${getPaymentStatusBg(order.paymentStatus)}">${escapeHtml(order.paymentStatus)}</span>
              </div>
            </div>
            <div style="font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em; margin: 0.5rem 0 0.25rem 0; color: var(--text-primary);">
              $${order.totalAmount != null ? order.totalAmount.toFixed(2) : '0.00'}
            </div>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.5rem; line-height: 1.45;">
              <strong style="color: var(--text-primary);">Items:</strong> ${itemsSummary}
            </p>
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1.25rem;">
              ${trackingInfo}
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 0.5rem;">
              <button class="btn btn-secondary btn-sm" onclick="window.raiseTicketForOrder('${order.id}', '${escapeHtml(order.orderNumber)}')">
                ${SVG_ICONS.sparkles} Raise Issue / Auto-Remediate
              </button>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      DOM.ecomOrdersContainer.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Failed to load orders: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function loadEcommerceProducts() {
    if (!DOM.ecomProductsContainer) return;
    DOM.ecomProductsContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 2rem;">Loading products catalog...</div>';
    try {
      const products = await apiCall('/api/ecommerce/products');
      if (!products || products.length === 0) {
        DOM.ecomProductsContainer.innerHTML = '<div style="color: var(--text-secondary); padding: 2rem;">No products found in catalog.</div>';
        return;
      }
      DOM.ecomProductsContainer.innerHTML = products.map(p => `
        <div class="ticket-card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="ticket-card-header">
              <span class="badge badge-subtle" style="font-family: var(--font-mono); font-weight: 700;">${escapeHtml(p.sku)}</span>
              <span class="badge badge-resolved">${p.stockQuantity} in stock</span>
            </div>
            <h3 style="font-size: 1.1rem; font-weight: 800; letter-spacing: -0.02em; margin: 0.75rem 0 0.4rem 0; color: var(--text-primary);">${escapeHtml(p.name)}</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.25rem; line-height: 1.5;">${escapeHtml(p.description || '')}</p>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 0.9rem; border-top: 1px solid var(--border-color);">
            <div style="font-size: 1.35rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text-primary);">$${p.price != null ? p.price.toFixed(2) : '0.00'}</div>
            <span class="badge badge-subtle" style="font-size: 0.7rem;">Verified SKU</span>
          </div>
        </div>
      `).join('');
    } catch (err) {
      DOM.ecomProductsContainer.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Failed to load catalog: ${escapeHtml(err.message)}</div>`;
    }
  }

  window.raiseTicketForOrder = function (orderId, orderNumber) {
    state.activeView = 'tickets';
    renderApp();
    if (DOM.btnOpenCreateModal) {
      DOM.btnOpenCreateModal.click();
      setTimeout(() => {
        const orderSelect = document.getElementById('ticket-order');
        if (orderSelect) orderSelect.value = orderId;
        const titleInput = document.getElementById('ticket-title');
        if (titleInput) titleInput.value = `Payment / Order issue for ${orderNumber}`;
        const descInput = document.getElementById('ticket-description');
        if (descInput) descInput.value = `I am facing an issue with my order ${orderNumber}. Please investigate and process a refund or order cancellation.`;
      }, 250);
    }
  };

  function getOrderStatusColor(status) {
    switch (status) {
      case 'DELIVERED': return '#15803d';
      case 'SHIPPED': return '#2563eb';
      case 'CONFIRMED': return '#4f46e5';
      case 'PENDING': return '#d97706';
      case 'CANCELLED': return '#71717a';
      case 'REFUNDED': return '#db2777';
      default: return '#a1a1aa';
    }
  }

  function getPaymentStatusBg(status) {
    switch (status) {
      case 'PAID': return 'background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0;';
      case 'PENDING': return 'background: #fffbeb; color: #b45309; border: 1px solid #fde68a;';
      case 'REFUNDED': return 'background: #faf5ff; color: #7e22ce; border: 1px solid #e9d5ff;';
      case 'FAILED': return 'background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca;';
      default: return 'background: #f4f4f5; color: #52525b; border: 1px solid #e4e4e7;';
    }
  }

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
