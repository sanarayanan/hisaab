/*
 * Hisaab core: pure functions shared by the browser app and the Node tests.
 * No DOM, no storage, no network.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HisaabCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PHONE_RE = /^\d{10}$/;
  const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const AMOUNT_RE = /^\d+(\.\d{1,2})?$/;
  const MAX_AMOUNT_RUPEES = 10000000;
  const MAX_NAME = 60;
  const MAX_NOTE = 120;
  const MAX_CUSTOMERS = 2000;
  const MAX_ENTRIES = 20000;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function uid(prefix) {
    const c = typeof crypto !== 'undefined' ? crypto : null;
    if (c && typeof c.randomUUID === 'function') return prefix + '_' + c.randomUUID();
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function cleanPhone(value) {
    return String(value == null ? '' : value).replace(/[\s-]/g, '');
  }

  function isValidPhone(value) {
    return PHONE_RE.test(cleanPhone(value));
  }

  function cleanName(value) {
    return String(value == null ? '' : value).trim().replace(/\s+/g, ' ');
  }

  function toPaise(rupees) {
    const n = Number(rupees);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100);
  }

  function formatINR(paise, options) {
    const opts = options || {};
    const value = Math.round(Number(paise) || 0);
    const n = Math.abs(value) / 100;
    const hasFraction = Math.round(n * 100) % 100 !== 0;
    const text = (hasFraction ? n.toFixed(2) : String(n));
    let sign = '';
    if (value < 0 && !opts.abs) sign = '-';
    else if (value > 0 && opts.signed) sign = '+';
    return sign + (opts.symbol === false ? '' : 'Rs ') + text;
  }

  function isValidDateString(value) {
    const m = DATE_RE.exec(String(value || ''));
    if (!m) return false;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    const probe = new Date(Date.UTC(y, mo - 1, d));
    return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
  }

  function formatDate(value) {
    const m = DATE_RE.exec(String(value || ''));
    if (!m) return String(value || '');
    return Number(m[3]) + ' ' + MONTHS[Number(m[2]) - 1] + ' ' + m[1];
  }

  function todayISO(now) {
    const d = now ? new Date(now) : new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function parseAmount(value) {
    const raw = String(value == null ? '' : value)
      .trim()
      .replace(/^rs\.?/i, '')
      .replace(/[,\s₹]/g, '');
    if (!raw) return { ok: false, message: 'Enter an amount greater than 0.' };
    if (!AMOUNT_RE.test(raw)) {
      if (/^\d+\.\d{3,}$/.test(raw)) return { ok: false, message: 'Amount can have at most 2 decimal places.' };
      return { ok: false, message: 'Enter the amount in numbers, like 250 or 250.50.' };
    }
    const rupees = Number(raw);
    if (!Number.isFinite(rupees) || rupees <= 0) return { ok: false, message: 'Enter an amount greater than 0.' };
    if (rupees > MAX_AMOUNT_RUPEES) return { ok: false, message: 'Amount must be Rs ' + MAX_AMOUNT_RUPEES + ' or less.' };
    return { ok: true, amount: Math.round(rupees * 100) / 100, paise: Math.round(rupees * 100) };
  }

  function validateCustomerInput(input, customers) {
    const errors = {};
    const name = cleanName(input && input.name);
    const phone = cleanPhone(input && input.phone);
    if (!name) errors.name = 'Enter the customer name.';
    else if (name.length > MAX_NAME) errors.name = 'Name must be ' + MAX_NAME + ' characters or fewer.';
    if (!phone) errors.phone = 'Enter a 10 digit phone number.';
    else if (!PHONE_RE.test(phone)) errors.phone = 'Phone must be exactly 10 digits, numbers only.';
    else if (Array.isArray(customers)) {
      const dup = customers.find((c) => c.phone === phone);
      if (dup) errors.phone = dup.name + ' already uses this phone number.';
    }
    return { ok: Object.keys(errors).length === 0, errors: errors, value: { name: name, phone: phone } };
  }

  function validateEntryInput(input) {
    const errors = {};
    const type = input && input.type;
    const amount = parseAmount(input && input.amount);
    const date = String((input && input.date) || '').trim();
    const note = String((input && input.note) || '').trim();

    if (type !== 'credit' && type !== 'payment') errors.type = 'Choose credit or payment.';
    if (!amount.ok) errors.amount = amount.message;
    if (!date) errors.date = 'Choose a date.';
    else if (!isValidDateString(date)) errors.date = 'Enter a real calendar date.';
    if (note.length > MAX_NOTE) errors.note = 'Note must be ' + MAX_NOTE + ' characters or fewer.';

    return {
      ok: Object.keys(errors).length === 0,
      errors: errors,
      value: {
        type: type,
        amount: amount.ok ? amount.amount : 0,
        date: date,
        note: note,
      },
    };
  }

  function computeBalances(customers, entries) {
    const balances = new Map();
    (customers || []).forEach((c) => balances.set(c.phone, 0));
    (entries || []).forEach((e) => {
      if (!balances.has(e.phone)) return;
      const sign = e.type === 'payment' ? -1 : 1;
      balances.set(e.phone, balances.get(e.phone) + toPaise(e.amount) * sign);
    });
    return balances;
  }

  function computeSummary(customers, entries) {
    const balances = computeBalances(customers, entries);
    let totalPaise = 0;
    let advancesPaise = 0;
    let withDues = 0;
    balances.forEach((paise) => {
      if (paise > 0) {
        totalPaise += paise;
        withDues += 1;
      } else if (paise < 0) {
        advancesPaise += -paise;
      }
    });
    return {
      balances: balances,
      totalPaise: totalPaise,
      advancesPaise: advancesPaise,
      withDues: withDues,
      customers: (customers || []).length,
      entries: (entries || []).length,
    };
  }

  function sortEntriesNewest(entries) {
    return (entries || []).slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      const ac = Number(a.createdAt) || 0;
      const bc = Number(b.createdAt) || 0;
      if (ac !== bc) return bc - ac;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }

  function entriesForPhone(entries, phone) {
    return sortEntriesNewest((entries || []).filter((e) => e.phone === phone));
  }

  function customerList(customers, entries) {
    const summary = computeSummary(customers, entries);
    return (customers || [])
      .map((c) => ({ customer: c, paise: summary.balances.get(c.phone) || 0 }))
      .sort((a, b) => {
        if (b.paise !== a.paise) return b.paise - a.paise;
        return cleanName(a.customer.name).localeCompare(cleanName(b.customer.name));
      });
  }

  function buildWhatsAppMessage(shopName, customer, balancePaise) {
    const shop = cleanName(shopName) || 'your shop';
    const name = cleanName(customer && customer.name) || 'customer';
    if (balancePaise > 0) {
      return 'Namaste ' + name + ' ji, a gentle reminder from ' + shop + '. Your balance is ' +
        formatINR(balancePaise) + '. Please settle when convenient. Thank you.';
    }
    if (balancePaise < 0) {
      return 'Namaste ' + name + ' ji, this is ' + shop + '. Your account is settled, with ' +
        formatINR(-balancePaise) + ' in advance. Thank you.';
    }
    return 'Namaste ' + name + ' ji, this is ' + shop + '. Your account is settled — balance ' +
      formatINR(0) + '. Thank you.';
  }

  function buildWhatsAppLink(shopName, customer, balancePaise) {
    const phone = cleanPhone(customer && customer.phone);
    const message = buildWhatsAppMessage(shopName, customer, balancePaise);
    return 'https://wa.me/91' + phone + '?text=' + encodeURIComponent(message);
  }

  function parseImport(text) {
    const errors = [];
    let raw;
    try {
      const source = typeof text === 'string' ? text.replace(/^\uFEFF/, '') : text;
      raw = typeof source === 'string' ? JSON.parse(source) : source;
    } catch (err) {
      return { ok: false, errors: ['That is not valid JSON. ' + (err && err.message ? err.message : '')].map((s) => s.trim()) };
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, errors: ['The file must contain one JSON object with a shop and a customers list.'] };
    }
    if (typeof raw.shop !== 'undefined' && (typeof raw.shop !== 'string' || !raw.shop.trim())) {
      errors.push('shop must be a non-empty name.');
    }
    if (!Array.isArray(raw.customers)) {
      return { ok: false, errors: ['The file needs a "customers" list.'] };
    }
    if (raw.customers.length > MAX_CUSTOMERS) {
      return { ok: false, errors: ['Too many customers. The limit is ' + MAX_CUSTOMERS + '.'] };
    }
    if (typeof raw.entries !== 'undefined' && !Array.isArray(raw.entries)) {
      return { ok: false, errors: ['"entries" must be a list.'] };
    }
    const rawEntries = Array.isArray(raw.entries) ? raw.entries : [];
    if (rawEntries.length > MAX_ENTRIES) {
      return { ok: false, errors: ['Too many entries. The limit is ' + MAX_ENTRIES + '.'] };
    }

    const seen = new Set();
    const customers = [];
    raw.customers.forEach((c, i) => {
      const where = 'Customer ' + (i + 1);
      if (!c || typeof c !== 'object' || Array.isArray(c)) {
        errors.push(where + ' must be an object with a name and phone.');
        return;
      }
      const name = cleanName(c.name);
      const phone = cleanPhone(c.phone);
      if (!name) errors.push(where + ': name is missing.');
      else if (name.length > MAX_NAME) errors.push(where + ': name is longer than ' + MAX_NAME + ' characters.');
      if (!phone) errors.push(where + ': phone is missing.');
      else if (!PHONE_RE.test(phone)) errors.push(where + ': phone "' + String(c.phone) + '" must be exactly 10 digits.');
      else if (seen.has(phone)) errors.push(where + ': phone ' + phone + ' is listed twice.');
      if (seen.has(phone)) return;
      if (name && PHONE_RE.test(phone)) {
        seen.add(phone);
        customers.push({ id: uid('c'), name: name, phone: phone, createdAt: Date.now() + customers.length });
      }
    });

    const entries = [];
    rawEntries.forEach((e, i) => {
      const where = 'Entry ' + (i + 1);
      if (!e || typeof e !== 'object' || Array.isArray(e)) {
        errors.push(where + ' must be an object.');
        return;
      }
      const phone = cleanPhone(e.phone);
      if (!phone) errors.push(where + ': phone is missing.');
      else if (!seen.has(phone)) errors.push(where + ': phone ' + phone + ' is not one of the customers.');
      if (e.type !== 'credit' && e.type !== 'payment') {
        errors.push(where + ': type must be "credit" or "payment".');
      }
      const amount = parseAmount(e.amount);
      if (!amount.ok) errors.push(where + ': ' + amount.message);
      if (!isValidDateString(e.date)) {
        errors.push(where + ': date "' + String(e.date == null ? '' : e.date) + '" must be a real date like 2026-10-25.');
      }
      const note = e.note == null ? '' : String(e.note).trim();
      if (note.length > MAX_NOTE) errors.push(where + ': note is longer than ' + MAX_NOTE + ' characters.');
      if (seen.has(phone) && (e.type === 'credit' || e.type === 'payment') && amount.ok && isValidDateString(e.date)) {
        entries.push({
          id: uid('e'),
          phone: phone,
          type: e.type,
          amount: amount.amount,
          date: String(e.date),
          note: note.slice(0, MAX_NOTE),
          createdAt: Date.now() + entries.length,
        });
      }
    });

    if (errors.length) return { ok: false, errors: errors };
    return {
      ok: true,
      errors: [],
      data: {
        shop: (typeof raw.shop === 'string' && raw.shop.trim()) || 'My shop',
        customers: customers,
        entries: entries,
      },
    };
  }

  function normalizeState(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (!Array.isArray(value.customers) || !Array.isArray(value.entries)) return null;
    const customers = [];
    const seen = new Set();
    value.customers.forEach((c) => {
      if (!c || typeof c !== 'object') return;
      const name = cleanName(c.name);
      const phone = cleanPhone(c.phone);
      if (!name || !PHONE_RE.test(phone) || seen.has(phone)) return;
      seen.add(phone);
      customers.push({ id: String(c.id || uid('c')), name: name, phone: phone, createdAt: Number(c.createdAt) || 0 });
    });
    const entries = [];
    value.entries.forEach((e) => {
      if (!e || typeof e !== 'object' || !seen.has(cleanPhone(e.phone))) return;
      if (e.type !== 'credit' && e.type !== 'payment') return;
      const amount = parseAmount(e.amount);
      if (!amount.ok || !isValidDateString(e.date)) return;
      const entry = {
        id: String(e.id || uid('e')),
        phone: cleanPhone(e.phone),
        type: e.type,
        amount: amount.amount,
        date: String(e.date),
        note: String(e.note == null ? '' : e.note).trim().slice(0, MAX_NOTE),
        createdAt: Number(e.createdAt) || 0,
      };
      if (e.imageId && value.images && typeof value.images[e.imageId] === 'string') entry.imageId = String(e.imageId);
      entries.push(entry);
    });
    const images = {};
    if (value.images && typeof value.images === 'object') {
      Object.keys(value.images).forEach((key) => {
        if (typeof value.images[key] === 'string' && value.images[key].indexOf('data:image/') === 0) {
          images[key] = value.images[key];
        }
      });
    }
    return {
      shop: cleanName(value.shop) || 'My shop',
      customers: customers,
      entries: entries,
      images: images,
    };
  }

  return {
    MAX_AMOUNT_RUPEES: MAX_AMOUNT_RUPEES,
    MAX_NAME: MAX_NAME,
    MAX_NOTE: MAX_NOTE,
    uid: uid,
    cleanPhone: cleanPhone,
    cleanName: cleanName,
    isValidPhone: isValidPhone,
    isValidDateString: isValidDateString,
    formatDate: formatDate,
    formatINR: formatINR,
    todayISO: todayISO,
    parseAmount: parseAmount,
    validateCustomerInput: validateCustomerInput,
    validateEntryInput: validateEntryInput,
    computeBalances: computeBalances,
    computeSummary: computeSummary,
    sortEntriesNewest: sortEntriesNewest,
    entriesForPhone: entriesForPhone,
    customerList: customerList,
    buildWhatsAppMessage: buildWhatsAppMessage,
    buildWhatsAppLink: buildWhatsAppLink,
    parseImport: parseImport,
    normalizeState: normalizeState,
  };
});
