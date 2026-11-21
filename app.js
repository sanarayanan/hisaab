(function () {
  'use strict';

  const HB = window.HisaabCore;
  const STORAGE_KEY = 'hisaab.v1';

  const ICONS = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4"></path><path d="m7.5 8.5 4.5-4.5 4.5 4.5"></path><path d="M4 15.5v2A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-2"></path></svg>',
    arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"></path><path d="m11 18-6-6 6-6"></path></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4.5 4.5"></path></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="2.5" width="17" height="19" rx="2"></rect><path d="M8 7.5h8M8 11.5h8M8 15.5h5"></path></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.4L3 21l2.2-5.3A8.4 8.4 0 1 1 21 11.5Z"></path><path d="M8.6 7.6c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .5.4l.7 1.6c.1.2 0 .4-.1.6l-.5.6c-.1.2-.2.3 0 .6.3.5.7 1 1.2 1.4.5.4 1 .7 1.4.9.2.1.4 0 .5-.1l.6-.7c.2-.2.3-.2.6-.1l1.6.8c.3.1.4.2.4.4 0 .2 0 .9-.5 1.3-.4.4-1 .6-1.7.5-1-.2-2.4-.8-3.8-2.1-1.3-1.2-2-2.5-2.2-3.3-.2-.7 0-1.4.4-1.9z"></path></svg>',
  };

  const els = {
    main: document.getElementById('main'),
    shopChip: document.getElementById('shop-chip'),
    toasts: document.getElementById('toasts'),
    customerDialog: document.getElementById('customer-dialog'),
    customerForm: document.getElementById('customer-form'),
    customerName: document.getElementById('customer-name'),
    customerPhone: document.getElementById('customer-phone'),
    customerNameError: document.getElementById('customer-name-error'),
    customerPhoneError: document.getElementById('customer-phone-error'),
    customerFormError: document.getElementById('customer-form-error'),
    entryDialog: document.getElementById('entry-dialog'),
    entryForm: document.getElementById('entry-form'),
    entryFor: document.getElementById('entry-for'),
    entryAmount: document.getElementById('entry-amount'),
    entryDate: document.getElementById('entry-date'),
    entryNote: document.getElementById('entry-note'),
    entryAmountError: document.getElementById('entry-amount-error'),
    entryDateError: document.getElementById('entry-date-error'),
    entryNoteError: document.getElementById('entry-note-error'),
    entryFormError: document.getElementById('entry-form-error'),
    entrySubmit: document.getElementById('entry-submit'),
    imageField: document.getElementById('image-field'),
    entryImage: document.getElementById('entry-image'),
    imageStatus: document.getElementById('image-status'),
    imagePreview: document.getElementById('image-preview'),
    imagePreviewImg: document.getElementById('image-preview-img'),
    imageRemove: document.getElementById('image-remove'),
    entryImageError: document.getElementById('entry-image-error'),
    importDialog: document.getElementById('import-dialog'),
    importForm: document.getElementById('import-form'),
    importText: document.getElementById('import-text'),
    importFile: document.getElementById('import-file'),
    importFileName: document.getElementById('import-file-name'),
    importErrors: document.getElementById('import-errors'),
    imageDialog: document.getElementById('image-dialog'),
    imageDialogSub: document.getElementById('image-dialog-sub'),
    imageFull: document.getElementById('image-full'),
  };

  const ui = {
    search: '',
    entryPhone: null,
    pendingImage: null,
    imagePreparing: false,
    imageJob: Promise.resolve(),
    importBackup: null,
    loadWarning: '',
  };

  let state = loadState();

  function emptyState() {
    return { version: 1, shop: 'My shop', customers: [], entries: [], images: {} };
  }

  function loadState() {
    let raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      ui.loadWarning = 'This browser is not letting Hisaab save data. Entries will disappear when you reload.';
      return emptyState();
    }
    if (!raw) return emptyState();
    try {
      const normalized = HB.normalizeState(JSON.parse(raw));
      if (!normalized) {
        ui.loadWarning = 'Saved data could not be read, so Hisaab started empty.';
        return emptyState();
      }
      return { version: 1, shop: normalized.shop, customers: normalized.customers, entries: normalized.entries, images: normalized.images };
    } catch (err) {
      ui.loadWarning = 'Saved data could not be read, so Hisaab started empty.';
      return emptyState();
    }
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    const first = parts[0].charAt(0);
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }

  function balanceMeta(paise) {
    if (paise > 0) return { label: 'Balance', longLabel: 'Balance due', amount: HB.formatINR(paise), cls: 'is-due' };
    if (paise < 0) return { label: 'Advance', longLabel: 'Advance with shop', amount: HB.formatINR(paise, { abs: true }), cls: 'is-advance' };
    return { label: 'Settled', longLabel: 'Account settled', amount: HB.formatINR(0), cls: 'is-zero' };
  }

  function isCustomerRoute() {
    return /^#\/c\/\d{10}$/.test(window.location.hash || '');
  }

  function currentPhone() {
    const m = /^#\/c\/(\d{10})$/.exec(window.location.hash || '');
    return m ? m[1] : null;
  }

  function todayValue() {
    return HB.todayISO();
  }

  function render() {
    const phone = currentPhone();
    const customer = phone ? state.customers.find(function (c) { return c.phone === phone; }) : null;

    els.shopChip.textContent = state.shop;
    els.shopChip.title = state.shop;
    document.title = customer ? customer.name + ' · Hisaab' : state.shop + ' · Hisaab';

    if (customer) renderCustomer(customer);
    else if (phone) renderMissing();
    else renderHome();
  }

  function renderHome() {
    const summary = HB.computeSummary(state.customers, state.entries);
    const list = HB.customerList(state.customers, state.entries);
    const customerWord = summary.customers === 1 ? 'customer' : 'customers';
    const entryWord = summary.entries === 1 ? 'entry' : 'entries';

    const sideNote = summary.entries
      ? 'Every balance is worked out from its entries. Nothing is typed in by hand.'
      : 'A balance appears as soon as you add a credit or a payment.';

    els.main.innerHTML =
      '<h1 class="visually-hidden">Hisaab — customers and balances</h1>' +
      '<section class="hero">' +
        '<div class="wrap hero-inner">' +
          '<div class="reveal">' +
            '<p class="eyebrow">Total outstanding</p>' +
            '<p class="total" id="total-outstanding" data-testid="total-outstanding" data-amount="' + (summary.totalPaise / 100) + '">' + esc(HB.formatINR(summary.totalPaise)) + '</p>' +
            '<p class="hero-sub">' + summary.customers + ' ' + customerWord + ' · ' + summary.entries + ' ' + entryWord + ' in the ledger.</p>' +
            '<div class="hero-actions">' +
              '<button type="button" class="btn accent" data-action="add-customer">' + ICONS.plus + 'Add customer</button>' +
              '<button type="button" class="btn ghost-cream" data-action="import">' + ICONS.upload + 'Import JSON</button>' +
            '</div>' +
          '</div>' +
          '<aside class="hero-side reveal" aria-label="Shop summary">' +
            '<div class="hero-stats">' +
              '<div><span class="hero-stat-num">' + summary.withDues + '</span><span class="hero-stat-label">With dues</span></div>' +
              '<div><span class="hero-stat-num">' + summary.entries + '</span><span class="hero-stat-label">Entries</span></div>' +
            '</div>' +
            (summary.advancesPaise > 0
              ? '<p class="hero-advance">' + esc(HB.formatINR(summary.advancesPaise)) + ' is held in advances.</p>'
              : '') +
            '<p class="hero-note">' + esc(sideNote) + '</p>' +
          '</aside>' +
        '</div>' +
      '</section>' +
      '<section class="section">' +
        '<div class="wrap">' +
          '<div class="section-head">' +
            '<h2 class="section-title"><span class="num">' + summary.customers + '</span> ' + customerWord + '</h2>' +
            (summary.customers ? searchMarkup() : '') +
          '</div>' +
          (summary.customers
            ? '<ul class="cust-list" id="customer-list" aria-label="Customers">' + list.map(customerRow).join('') + '</ul>' +
              '<p class="no-match" id="no-match" hidden>No customer matches that search.</p>'
            : emptyMarkup()) +
        '</div>' +
      '</section>';

    bindHome();
  }

  function searchMarkup() {
    return '<label class="search-box" for="customer-search">' +
      ICONS.search +
      '<span class="visually-hidden">Search customers</span>' +
      '<input id="customer-search" type="search" autocomplete="off" placeholder="Search name or phone">' +
      '</label>';
  }

  function customerRow(item) {
    const c = item.customer;
    const meta = balanceMeta(item.paise);
    const link = HB.buildWhatsAppLink(state.shop, c, item.paise);
    const searchKey = (c.name + ' ' + c.phone).toLowerCase();
    return '<li class="cust-row" data-testid="customer-row" data-phone="' + esc(c.phone) + '" data-search="' + esc(searchKey) + '">' +
      '<a class="row-link" href="#/c/' + esc(c.phone) + '">' +
        '<span class="avatar" aria-hidden="true">' + esc(initials(c.name)) + '</span>' +
        '<span class="cust-id">' +
          '<span class="cust-name">' + esc(c.name) + '</span>' +
          '<span class="cust-phone">' + esc(c.phone) + '</span>' +
        '</span>' +
        '<span class="cust-balance ' + meta.cls + '">' +
          '<span class="balance-label">' + esc(meta.label) + '</span>' +
          '<span class="balance-amt" data-testid="customer-balance" data-amount="' + (item.paise / 100) + '">' + esc(meta.amount) + '</span>' +
        '</span>' +
      '</a>' +
      '<a class="wa-mini' + (item.paise <= 0 ? ' is-clear' : '') + '" data-testid="whatsapp-mini" href="' + esc(link) + '" target="_blank" rel="noopener" aria-label="Send WhatsApp reminder to ' + esc(c.name) + '" title="WhatsApp reminder">' + ICONS.whatsapp + '</a>' +
    '</li>';
  }

  function emptyMarkup() {
    return '<div class="empty reveal">' +
      '<span class="empty-mark">' + ICONS.book + '</span>' +
      '<h2>No customers yet</h2>' +
      '<p>Add your first customer, or load the sample JSON to see a full shop with balances.</p>' +
      '<div class="empty-actions">' +
        '<button type="button" class="btn primary" data-action="add-customer">' + ICONS.plus + 'Add customer</button>' +
        '<button type="button" class="btn ghost" data-action="import">' + ICONS.upload + 'Import JSON</button>' +
      '</div>' +
    '</div>';
  }

  function bindHome() {
    const input = document.getElementById('customer-search');
    if (!input) return;
    input.value = ui.search;
    input.addEventListener('input', function () {
      ui.search = input.value;
      applySearch();
    });
    applySearch();
  }

  function applySearch() {
    const q = ui.search.trim().toLowerCase();
    const rows = els.main.querySelectorAll('.cust-row');
    let shown = 0;
    rows.forEach(function (row) {
      const hit = !q || (row.getAttribute('data-search') || '').indexOf(q) !== -1;
      row.hidden = !hit;
      if (hit) shown += 1;
    });
    const none = document.getElementById('no-match');
    if (none) none.hidden = shown > 0 || rows.length === 0;
  }

  function renderCustomer(customer) {
    const entries = HB.entriesForPhone(state.entries, customer.phone);
    const paise = HB.computeBalances([customer], state.entries).get(customer.phone) || 0;
    const meta = balanceMeta(paise);
    const wa = HB.buildWhatsAppLink(state.shop, customer, paise);

    const entriesMarkup = entries.length
      ? '<ul class="entry-list" id="entry-list" aria-label="Entries for ' + esc(customer.name) + '">' + entries.map(function (entry) {
          return entryMarkup(entry, customer);
        }).join('') + '</ul>' +
        '<button type="button" class="btn ghost add-another" data-action="open-entry">' + ICONS.plus + 'Add another entry</button>'
      : '<div class="empty">' +
          '<span class="empty-mark">' + ICONS.book + '</span>' +
          '<h2>No entries yet</h2>' +
          '<p>Add the first credit or payment for ' + esc(customer.name) + '. The balance is worked out for you.</p>' +
          '<div class="empty-actions">' +
            '<button type="button" class="btn primary" data-action="open-entry">' + ICONS.plus + 'Add entry</button>' +
          '</div>' +
        '</div>';

    els.main.innerHTML =
      '<section class="cust-hero">' +
        '<div class="wrap">' +
          '<a class="back-link" href="#/">' + ICONS.arrowLeft + 'All customers</a>' +
          '<div class="cust-hero-inner">' +
            '<div>' +
              '<p class="eyebrow">Customer</p>' +
              '<h1 class="cust-title">' + esc(customer.name) + '</h1>' +
              '<p class="cust-phone-line">' + esc(customer.phone) + '</p>' +
              '<p class="eyebrow">' + esc(meta.longLabel) + '</p>' +
              '<p class="total" id="customer-total" data-testid="customer-total" data-amount="' + (paise / 100) + '">' + esc(meta.amount) + '</p>' +
            '</div>' +
            '<div class="cust-actions">' +
              '<a class="btn accent" data-testid="whatsapp-reminder" href="' + esc(wa) + '" target="_blank" rel="noopener">' + ICONS.whatsapp + 'WhatsApp reminder</a>' +
              '<button type="button" class="btn cream" data-action="open-entry">' + ICONS.plus + 'Add entry</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="section">' +
        '<div class="wrap">' +
          '<div class="section-head">' +
            '<h2 class="section-title">' + entries.length + ' ' + (entries.length === 1 ? 'entry' : 'entries') + '</h2>' +
            '<span class="section-note">Newest first</span>' +
          '</div>' +
          entriesMarkup +
        '</div>' +
      '</section>';
  }

  function entryMarkup(entry, customer) {
    const isPayment = entry.type === 'payment';
    const hasImage = entry.imageId && state.images[entry.imageId];
    const paise = Math.round(entry.amount * 100);
    const when = HB.formatDate(entry.date);
    const thumb = hasImage
      ? '<button type="button" class="thumb" data-action="view-image" data-entry-id="' + esc(entry.id) + '" aria-label="View payment screenshot from ' + esc(when) + '">' +
          '<img src="' + esc(state.images[entry.imageId]) + '" alt="Payment screenshot for ' + esc(customer.name) + ' on ' + esc(when) + '" width="72" height="72" loading="lazy">' +
        '</button>'
      : '';

    return '<li class="entry" data-testid="entry" data-type="' + esc(entry.type) + '" data-date="' + esc(entry.date) + '" data-amount="' + entry.amount + '">' +
      '<div class="entry-main">' +
        '<div class="entry-line">' +
          '<span class="chip ' + (isPayment ? 'payment' : 'credit') + '">' + (isPayment ? 'Payment' : 'Credit') + '</span>' +
          (entry.note ? '<span class="entry-note">' + esc(entry.note) + '</span>' : '<span class="entry-note is-empty">No note</span>') +
        '</div>' +
        '<div class="entry-foot">' +
          '<time class="entry-date" datetime="' + esc(entry.date) + '">' + esc(when) + '</time>' +
          thumb +
        '</div>' +
      '</div>' +
      '<span class="entry-amount' + (isPayment ? ' is-payment' : '') + '" data-testid="entry-amount">' + (isPayment ? '-' : '+') + ' ' + esc(HB.formatINR(paise)) + '</span>' +
    '</li>';
  }

  function renderMissing() {
    els.main.innerHTML =
      '<section class="section">' +
        '<div class="wrap">' +
          '<div class="empty">' +
            '<span class="empty-mark">' + ICONS.book + '</span>' +
            '<h2>Customer not found</h2>' +
            '<p>That phone number is not in this shop’s ledger.</p>' +
            '<div class="empty-actions"><a class="btn primary" href="#/">Back to all customers</a></div>' +
          '</div>' +
        '</div>' +
      '</section>';
  }

  function persistState(next) {
    const payload = {
      version: 1,
      shop: next.shop,
      customers: next.customers,
      entries: next.entries,
      images: next.images || {},
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      return { ok: false, error: err };
    }
    return { ok: true, state: payload };
  }

  function commit(next, message, options) {
    const saved = persistState(next);
    if (!saved.ok) {
      const quota = saved.error && (saved.error.name === 'QuotaExceededError' || saved.error.code === 22 || saved.error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
      toast(quota
        ? 'This browser’s storage is full. Remove the picture or choose a smaller one.'
        : 'Hisaab could not save to this browser. Nothing was changed.');
      return false;
    }
    state = saved.state;
    render();
    if (message) toast(message, options);
    return true;
  }

  let toastTimer = 0;

  function toast(message, options) {
    const opts = options || {};
    window.clearTimeout(toastTimer);
    const action = opts.action
      ? '<button type="button" class="toast-action" data-toast-action>' + esc(opts.action.label) + '</button>'
      : '';
    els.toasts.innerHTML = '<div class="toast"><span>' + esc(message) + '</span>' + action + '</div>';
    if (opts.action) {
      const button = els.toasts.querySelector('[data-toast-action]');
      if (button) {
        button.addEventListener('click', function () {
          els.toasts.innerHTML = '';
          window.clearTimeout(toastTimer);
          opts.action.run();
        });
      }
    }
    toastTimer = window.setTimeout(function () {
      els.toasts.innerHTML = '';
    }, opts.duration || 4200);
  }

  function openDialog(dialog, focusTarget) {
    if (!dialog.open) dialog.showModal();
    window.requestAnimationFrame(function () {
      if (focusTarget) focusTarget.focus();
    });
  }

  function clearFieldError(input, errorEl) {
    if (errorEl) errorEl.textContent = '';
    if (input) input.removeAttribute('aria-invalid');
  }

  function setFieldError(input, errorEl, message) {
    if (errorEl) errorEl.textContent = message || '';
    if (input) {
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }
  }

  function openCustomerDialog() {
    els.customerForm.reset();
    clearFieldError(els.customerName, els.customerNameError);
    clearFieldError(els.customerPhone, els.customerPhoneError);
    els.customerFormError.textContent = '';
    openDialog(els.customerDialog, els.customerName);
  }

  function onCustomerSubmit(event) {
    event.preventDefault();
    const result = HB.validateCustomerInput(
      { name: els.customerName.value, phone: els.customerPhone.value },
      state.customers
    );
    setFieldError(els.customerName, els.customerNameError, result.errors.name);
    setFieldError(els.customerPhone, els.customerPhoneError, result.errors.phone);
    els.customerFormError.textContent = '';

    if (!result.ok) {
      if (result.errors.name) els.customerName.focus();
      else els.customerPhone.focus();
      return;
    }

    const customer = {
      id: HB.uid('c'),
      name: result.value.name,
      phone: result.value.phone,
      createdAt: Date.now(),
    };
    const next = Object.assign({}, state, { customers: state.customers.concat(customer) });
    if (commit(next, customer.name + ' added.')) {
      els.customerDialog.close();
      els.customerForm.reset();
    }
  }

  function openEntryDialog() {
    const phone = currentPhone();
    const customer = state.customers.find(function (c) { return c.phone === phone; });
    if (!customer) return;

    ui.entryPhone = customer.phone;
    resetEntryImage();
    clearEntryErrors();
    els.entryForm.reset();
    els.entryDate.value = todayValue();
    const paise = HB.computeBalances([customer], state.entries).get(customer.phone) || 0;
    els.entryFor.textContent = 'For ' + customer.name + ' · balance ' + HB.formatINR(paise);
    setEntryType('credit');
    openDialog(els.entryDialog, els.entryAmount);
  }

  function setEntryType(type) {
    const isPayment = type === 'payment';
    els.imageField.hidden = !isPayment;
    els.entrySubmit.textContent = isPayment ? 'Save payment' : 'Save credit';
    if (!isPayment) {
      clearFieldError(els.entryImage, els.entryImageError);
      els.entryImageError.textContent = '';
    }
  }

  function clearEntryErrors() {
    clearFieldError(els.entryAmount, els.entryAmountError);
    clearFieldError(els.entryDate, els.entryDateError);
    clearFieldError(els.entryNote, els.entryNoteError);
    clearFieldError(els.entryImage, els.entryImageError);
    els.entryImageError.textContent = '';
    els.entryFormError.textContent = '';
  }

  async function onEntrySubmit(event) {
    event.preventDefault();
    const customer = state.customers.find(function (c) { return c.phone === ui.entryPhone; });
    if (!customer) {
      els.entryDialog.close();
      return;
    }

    if (ui.imagePreparing) {
      await ui.imageJob;
    }

    const checked = els.entryForm.querySelector('input[name="type"]:checked');
    const type = checked ? checked.value : '';
    const result = HB.validateEntryInput({
      type: type,
      amount: els.entryAmount.value,
      date: els.entryDate.value,
      note: els.entryNote.value,
    });

    clearFieldError(els.entryAmount, els.entryAmountError);
    clearFieldError(els.entryDate, els.entryDateError);
    clearFieldError(els.entryNote, els.entryNoteError);
    els.entryFormError.textContent = '';

    setFieldError(els.entryAmount, els.entryAmountError, result.errors.amount);
    setFieldError(els.entryDate, els.entryDateError, result.errors.date);
    setFieldError(els.entryNote, els.entryNoteError, result.errors.note);
    if (result.errors.type) els.entryFormError.textContent = result.errors.type;

    if (!result.ok) {
      if (result.errors.amount) els.entryAmount.focus();
      else if (result.errors.date) els.entryDate.focus();
      else if (result.errors.note) els.entryNote.focus();
      return;
    }

    if (type === 'payment' && els.entryImageError.textContent) {
      els.entryFormError.textContent = 'Fix the screenshot first, or remove it.';
      return;
    }

    const entry = {
      id: HB.uid('e'),
      phone: customer.phone,
      type: type,
      amount: result.value.amount,
      date: result.value.date,
      note: result.value.note,
      createdAt: Date.now(),
    };
    const images = Object.assign({}, state.images);
    if (type === 'payment' && ui.pendingImage) {
      entry.imageId = HB.uid('img');
      images[entry.imageId] = ui.pendingImage;
    }

    const next = Object.assign({}, state, { entries: state.entries.concat(entry), images: images });
    const label = type === 'payment' ? 'Payment' : 'Credit';
    const message = label + ' of ' + HB.formatINR(Math.round(result.value.amount * 100)) + ' added for ' + customer.name + '.';
    if (commit(next, message)) {
      els.entryDialog.close();
      els.entryForm.reset();
      resetEntryImage();
    } else {
      els.entryFormError.textContent = 'Hisaab could not save this entry. Try a smaller picture, or remove it.';
    }
  }

  function resetEntryImage() {
    ui.pendingImage = null;
    ui.imagePreparing = false;
    ui.imageJob = Promise.resolve();
    els.entryImage.value = '';
    els.imagePreview.hidden = true;
    els.imagePreviewImg.removeAttribute('src');
    els.imageStatus.textContent = 'JPG or PNG. It is shrunk to fit this browser’s storage.';
    els.entryImageError.textContent = '';
    clearFieldError(els.entryImage, els.entryImageError);
  }

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(new Error('That file could not be read. Try another picture.')); };
      reader.readAsDataURL(file);
    });
  }

  function loadImageElement(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('That picture could not be opened. Try a JPG or PNG.')); };
      img.src = src;
    });
  }

  async function compressImage(file) {
    if (!/^image\//.test(file.type)) throw new Error('Choose an image file, like a JPG or PNG.');
    if (file.size > 10 * 1024 * 1024) throw new Error('That picture is over 10 MB. Choose a smaller one.');

    const source = await readFileAsDataURL(file);
    const img = await loadImageElement(source);
    let maxEdge = 900;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const width = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
      const height = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const quality = [0.76, 0.64, 0.52][attempt];
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= 320000) return dataUrl;
      maxEdge = 760;
      if (attempt === 2) {
        if (dataUrl.length <= 720000) return dataUrl;
        throw new Error('That picture is too detailed to store. Try a smaller screenshot.');
      }
    }
    throw new Error('That picture could not be prepared. Try another one.');
  }

  function onImageChosen(event) {
    const file = event.target.files && event.target.files[0];
    els.entryImageError.textContent = '';
    els.entryImage.removeAttribute('aria-invalid');
    if (!file) return;

    ui.pendingImage = null;
    ui.imagePreparing = true;
    ui.imageJob = (async function () {
      els.imageStatus.textContent = 'Preparing picture…';
      try {
        const dataUrl = await compressImage(file);
        ui.pendingImage = dataUrl;
        els.imagePreview.hidden = false;
        els.imagePreviewImg.src = dataUrl;
        els.imageStatus.textContent = 'Picture ready. It will be saved with this payment.';
      } catch (err) {
        ui.pendingImage = null;
        els.imagePreview.hidden = true;
        els.imagePreviewImg.removeAttribute('src');
        els.entryImage.value = '';
        els.entryImageError.textContent = err && err.message ? err.message : 'That picture could not be used.';
        els.imageStatus.textContent = 'JPG or PNG. It is shrunk to fit this browser’s storage.';
      } finally {
        ui.imagePreparing = false;
      }
    })();
  }

  function removeImage() {
    ui.pendingImage = null;
    ui.imagePreparing = false;
    ui.imageJob = Promise.resolve();
    els.entryImage.value = '';
    els.imagePreview.hidden = true;
    els.imagePreviewImg.removeAttribute('src');
    els.entryImageError.textContent = '';
    els.imageStatus.textContent = 'JPG or PNG. It is shrunk to fit this browser’s storage.';
  }

  function viewImage(entryId) {
    const entry = state.entries.find(function (e) { return e.id === entryId; });
    if (!entry || !entry.imageId) return;
    const src = state.images[entry.imageId];
    if (!src) return;
    const customer = state.customers.find(function (c) { return c.phone === entry.phone; });
    const when = HB.formatDate(entry.date);
    els.imageFull.src = src;
    els.imageFull.alt = 'Payment screenshot from ' + when;
    els.imageDialogSub.textContent = (customer ? customer.name + ' · ' : '') + when;
    openDialog(els.imageDialog, null);
  }

  function showImportErrors(errors) {
    const shown = errors.slice(0, 8);
    let html = '<strong>That file was not loaded.</strong><ul>' + shown.map(function (error) {
      return '<li>' + esc(error) + '</li>';
    }).join('') + '</ul>';
    if (errors.length > shown.length) {
      html += '<p>And ' + (errors.length - shown.length) + ' more issue' + (errors.length - shown.length === 1 ? '' : 's') + '.</p>';
    }
    els.importErrors.innerHTML = html;
    els.importText.setAttribute('aria-invalid', 'true');
  }

  function clearImportErrors() {
    els.importErrors.textContent = '';
    els.importText.removeAttribute('aria-invalid');
  }

  function openImportDialog() {
    els.importForm.reset();
    els.importFileName.textContent = 'No file chosen';
    clearImportErrors();
    openDialog(els.importDialog, els.importText);
  }

  async function onImportFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    clearImportErrors();
    els.importFileName.textContent = file.name;
    if (file.size > 2 * 1024 * 1024) {
      showImportErrors(['That file is larger than 2 MB. A small JSON file should be enough.']);
      els.importFile.value = '';
      return;
    }
    try {
      const text = await file.text();
      els.importText.value = text;
      clearImportErrors();
    } catch (err) {
      showImportErrors(['That file could not be read. Paste the JSON instead.']);
    }
  }

  function onImportSubmit(event) {
    event.preventDefault();
    const text = els.importText.value.trim();
    if (!text) {
      showImportErrors(['Paste the JSON or choose a file first.']);
      els.importText.focus();
      return;
    }
    const result = HB.parseImport(text);
    if (!result.ok) {
      showImportErrors(result.errors);
      els.importText.focus();
      return;
    }

    const backup = state;
    const next = {
      version: 1,
      shop: result.data.shop,
      customers: result.data.customers,
      entries: result.data.entries,
      images: {},
    };
    const saved = persistState(next);
    if (!saved.ok) {
      showImportErrors(['Hisaab could not save this import. The browser’s storage may be full.']);
      return;
    }

    state = saved.state;
    ui.importBackup = backup;
    ui.search = '';
    els.importDialog.close();
    els.importForm.reset();
    if (isCustomerRoute()) window.location.hash = '#/';
    render();
    const count = state.customers.length;
    toast('Loaded ' + count + ' ' + (count === 1 ? 'customer' : 'customers') + ' and ' + state.entries.length + ' ' + (state.entries.length === 1 ? 'entry' : 'entries') + ' from ' + state.shop + '.', {
      action: { label: 'Undo', run: undoImport },
      duration: 12000,
    });
  }

  function undoImport() {
    if (!ui.importBackup) {
      toast('There is nothing to undo.');
      return;
    }
    const backup = ui.importBackup;
    if (commit(backup, 'Import undone. Previous ledger restored.')) {
      ui.importBackup = null;
    }
  }

  function handleAction(action, target) {
    if (action === 'add-customer') openCustomerDialog();
    else if (action === 'import') openImportDialog();
    else if (action === 'open-entry') openEntryDialog();
    else if (action === 'view-image') viewImage(target.getAttribute('data-entry-id'));
  }

  document.addEventListener('click', function (event) {
    const actionEl = event.target.closest('[data-action]');
    if (actionEl) {
      handleAction(actionEl.getAttribute('data-action'), actionEl);
      return;
    }
    const closer = event.target.closest('[data-close]');
    if (closer) {
      const dialog = closer.closest('dialog');
      if (dialog) dialog.close();
    }
  });

  [els.customerDialog, els.entryDialog, els.importDialog, els.imageDialog].forEach(function (dialog) {
    if (!dialog) return;
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog) dialog.close();
    });
  });

  els.customerForm.addEventListener('submit', onCustomerSubmit);
  els.entryForm.addEventListener('submit', onEntrySubmit);
  els.entryForm.addEventListener('change', function (event) {
    if (event.target && event.target.name === 'type') setEntryType(event.target.value);
  });
  els.entryImage.addEventListener('change', onImageChosen);
  els.imageRemove.addEventListener('click', removeImage);
  els.importForm.addEventListener('submit', onImportSubmit);
  els.importFile.addEventListener('change', onImportFile);
  els.importText.addEventListener('input', clearImportErrors);

  els.customerName.addEventListener('input', function () {
    clearFieldError(els.customerName, els.customerNameError);
  });
  els.customerPhone.addEventListener('input', function () {
    clearFieldError(els.customerPhone, els.customerPhoneError);
  });
  [els.entryAmount, els.entryDate, els.entryNote].forEach(function (input) {
    input.addEventListener('input', function () {
      input.removeAttribute('aria-invalid');
      const err = els.entryForm.querySelector('#' + input.id + '-error');
      if (err) err.textContent = '';
    });
  });

  window.addEventListener('hashchange', function () {
    window.scrollTo(0, 0);
    render();
  });

  window.addEventListener('storage', function (event) {
    if (event.key !== STORAGE_KEY) return;
    state = loadState();
    render();
  });

  render();

  if (ui.loadWarning) {
    toast(ui.loadWarning, { duration: 7000 });
    ui.loadWarning = '';
  }
})();
