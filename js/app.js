// ── Theme ─────────────────────────────────────────────────────────────────
function getThemeName() {
  return localStorage.getItem('svp-theme') || 'light';
}

function applyTheme(name) {
  if (name === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem('svp-theme', name);

  const btn = document.getElementById('btn-theme-toggle');
  if (btn) btn.innerHTML = name === 'dark' ? '&#9788;' : '&#9790;';
}

function toggleTheme() {
  applyTheme(getThemeName() === 'dark' ? 'light' : 'dark');
}

document.getElementById('btn-theme-toggle')
  .addEventListener('click', toggleTheme);

applyTheme(getThemeName());

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  op:               'insert',  // 'insert' | 'update'
  writeValidity:    'valid',   // 'valid' | 'invalid'
  existingValidity: 'valid',   // 'valid' | 'invalid' (only for update)
  level:            'strict',  // 'strict' | 'moderate'
  action:           'error',   // 'error'  | 'warn'
};

// ── Outcome definitions ────────────────────────────────────────────────────
// r:           'accepted' | 'bypassed' | 'warned' | 'rejected'
// msg:         main explanation
// consequence: application-layer impact
// insight:     '' or a powerful-behavior callout
//
// Key: `${op}|${writeValidity}|${existingValidity}|${level}|${action}`
// For insert, existingValidity is ignored — we normalise it to 'any' in the key.

const outcomes = {

  // ── INSERT — valid write ────────────────────────────────────────────────
  'insert|valid|strict|error': {
    r: 'accepted',
    msg: 'A <strong>valid document</strong> passes every rule in the schema. With <strong>strict + error</strong> the write is fully validated and accepted.',
    consequence: '<strong>Application:</strong> receives a success response. Document is stored.',
    insight: '',
  },
  'insert|valid|strict|warn': {
    r: 'accepted',
    msg: 'A <strong>valid document</strong> passes the schema. <strong>warn</strong> mode only triggers a log entry when a violation occurs — nothing to log here.',
    consequence: '<strong>Application:</strong> receives a success response. Document is stored.',
    insight: '',
  },
  'insert|valid|moderate|error': {
    r: 'accepted',
    msg: 'A <strong>valid document</strong> passes the schema. Inserts are always fully validated under <strong>moderate</strong>, and this one passes cleanly.',
    consequence: '<strong>Application:</strong> receives a success response. Document is stored.',
    insight: '',
  },
  'insert|valid|moderate|warn': {
    r: 'accepted',
    msg: 'A <strong>valid document</strong> passes the schema. Validator configuration has no effect on a write that satisfies all rules.',
    consequence: '<strong>Application:</strong> receives a success response. Document is stored.',
    insight: '',
  },

  // ── INSERT — invalid write ──────────────────────────────────────────────
  'insert|invalid|strict|error': {
    r: 'rejected',
    msg: '<strong>strict + error</strong>: Every insert is validated. The document violates the schema — the write is <strong>rejected</strong> and a <code>WriteError</code> is returned.',
    consequence: '<strong>Application:</strong> receives a WriteError and must handle it (retry with a valid document, surface the error, etc.).',
    insight: '',
  },
  'insert|invalid|strict|warn': {
    r: 'warned',
    msg: '<strong>strict + warn</strong>: The insert is validated and fails the schema. Instead of rejecting, MongoDB <strong>stores the document</strong> and writes a warning to the server log. The application receives a success response.',
    consequence: '<strong>Application:</strong> receives a success response — it has no way to know a violation occurred without inspecting the MongoDB log.',
    insight: 'The write IS stored. warn mode never blocks writes — it only logs. Use this when you need visibility into violations without impacting write availability.',
  },
  'insert|invalid|moderate|error': {
    r: 'rejected',
    msg: '<strong>moderate + error</strong>: Inserts are <em>always</em> fully validated under <strong>moderate</strong> — just like strict. The document violates the schema and is <strong>rejected</strong>.',
    consequence: '<strong>Application:</strong> receives a WriteError and must handle it.',
    insight: 'moderate does not bypass validation for inserts. The bypass capability of moderate applies exclusively to <em>updates of already-invalid documents</em>.',
  },
  'insert|invalid|moderate|warn': {
    r: 'warned',
    msg: '<strong>moderate + warn</strong>: Inserts are <em>always</em> fully validated under <strong>moderate</strong>. The document violates the schema, but <strong>warn</strong> action stores it and logs a warning instead of rejecting.',
    consequence: '<strong>Application:</strong> receives a success response — violation is only visible in the MongoDB server log.',
    insight: 'moderate does not bypass validation for inserts. Only updates to already-invalid documents are bypassed. The combination of moderate + warn is useful for observing violations during a migration without blocking any writes.',
  },

  // ── UPDATE — valid write + valid existing ───────────────────────────────
  'update|valid|valid|strict|error': {
    r: 'accepted',
    msg: 'A <strong>valid update</strong> to a <strong>valid existing document</strong> — the cleanest path. <strong>strict</strong> validates the write and it passes.',
    consequence: '<strong>Application:</strong> receives a success response. Document is updated.',
    insight: '',
  },
  'update|valid|valid|strict|warn': {
    r: 'accepted',
    msg: 'A <strong>valid update</strong> to a <strong>valid existing document</strong>. <strong>warn</strong> mode only fires when there is a violation — nothing to log here.',
    consequence: '<strong>Application:</strong> receives a success response. Document is updated.',
    insight: '',
  },
  'update|valid|valid|moderate|error': {
    r: 'accepted',
    msg: 'A <strong>valid update</strong> to a <strong>valid existing document</strong>. Under <strong>moderate</strong>, the existing doc is valid, so validation is applied — and the update passes it.',
    consequence: '<strong>Application:</strong> receives a success response. Document is updated.',
    insight: '',
  },
  'update|valid|valid|moderate|warn': {
    r: 'accepted',
    msg: 'A <strong>valid update</strong> to a <strong>valid existing document</strong>. Under <strong>moderate</strong>, the existing doc is valid so validation runs — the update passes cleanly.',
    consequence: '<strong>Application:</strong> receives a success response. Document is updated.',
    insight: '',
  },

  // ── UPDATE — invalid write + valid existing ─────────────────────────────
  'update|invalid|valid|strict|error': {
    r: 'rejected',
    msg: '<strong>strict + error</strong>: The existing document was valid, so validation is applied to this update. The write violates the schema — <strong>rejected</strong>.',
    consequence: '<strong>Application:</strong> receives a WriteError. The existing document is unchanged.',
    insight: '',
  },
  'update|invalid|valid|strict|warn': {
    r: 'warned',
    msg: '<strong>strict + warn</strong>: The update is validated (existing doc was valid) and fails the schema. <strong>warn</strong> action stores the update and logs the violation — the document is now technically invalid.',
    consequence: '<strong>Application:</strong> receives a success response. The document is updated but now violates the schema. Violation is visible in the MongoDB server log.',
    insight: 'After this write, the collection contains a document that fails validation. If you later switch to strict + error, updates to that document will be blocked until it is remediated.',
  },
  'update|invalid|valid|moderate|error': {
    r: 'rejected',
    msg: '<strong>moderate + error</strong>: The existing document was valid, so <strong>moderate</strong> applies full validation to this update. The write violates the schema — <strong>rejected</strong>.',
    consequence: '<strong>Application:</strong> receives a WriteError. The existing document is unchanged.',
    insight: '',
  },
  'update|invalid|valid|moderate|warn': {
    r: 'warned',
    msg: '<strong>moderate + warn</strong>: The existing document was valid, so validation is applied. The write violates the schema — <strong>warn</strong> action stores it and logs a warning.',
    consequence: '<strong>Application:</strong> receives a success response. The document is updated but now violates the schema.',
    insight: '',
  },

  // ── UPDATE — valid write + invalid existing ─────────────────────────────
  'update|valid|invalid|strict|error': {
    r: 'accepted',
    msg: '<strong>strict + error</strong>: Under <strong>strict</strong>, all updates are validated regardless of the existing document\'s state. The write is valid — it passes and the document is improved.',
    consequence: '<strong>Application:</strong> receives a success response. The document is updated and now conforms to the schema.',
    insight: '',
  },
  'update|valid|invalid|strict|warn': {
    r: 'accepted',
    msg: '<strong>strict + warn</strong>: All updates are validated under <strong>strict</strong>. The write is valid — no violation to warn about.',
    consequence: '<strong>Application:</strong> receives a success response. The document is updated and now conforms to the schema.',
    insight: '',
  },
  'update|valid|invalid|moderate|error': {
    r: 'accepted',
    msg: '<strong>moderate</strong>: The existing document was already invalid, so validation is skipped for this update. The write goes through — and since it is also valid, the outcome is the same as under strict: <strong>accepted</strong>.',
    consequence: '<strong>Application:</strong> receives a success response. Document is updated.',
    insight: '',
  },
  'update|valid|invalid|moderate|warn': {
    r: 'accepted',
    msg: '<strong>moderate</strong>: The existing document was already invalid, so validation is skipped. The write is valid regardless, so both strict and moderate accept it — no warning is logged because no violation occurred.',
    consequence: '<strong>Application:</strong> receives a success response. Document is updated.',
    insight: '',
  },

  // ── UPDATE — invalid write + invalid existing ───────────────────────────
  'update|invalid|invalid|strict|error': {
    r: 'rejected',
    msg: '<strong>strict + error</strong>: Under <strong>strict</strong>, ALL updates are validated regardless of the existing document\'s state. The write violates the schema — <strong>rejected</strong>.',
    consequence: '<strong>Application:</strong> receives a WriteError. The existing document is unchanged.',
    insight: '',
  },
  'update|invalid|invalid|strict|warn': {
    r: 'warned',
    msg: '<strong>strict + warn</strong>: All updates are validated under <strong>strict</strong>. The write violates the schema — <strong>warn</strong> action stores it and logs the violation.',
    consequence: '<strong>Application:</strong> receives a success response. Document is updated, still invalid. Violation is visible in the MongoDB server log.',
    insight: '',
  },
  'update|invalid|invalid|moderate|error': {
    r: 'bypassed',
    msg: '<strong>moderate</strong>: The existing document was already invalid, so validation is <em>intentionally bypassed</em>. The write goes through — even though both the existing document and the incoming write violate the schema.',
    consequence: '<strong>Application:</strong> receives a success response. Document is updated and remains schema-invalid.',
    insight: 'This is moderate\'s most powerful behaviour: it gives you <strong>unconditional write availability</strong> for documents with pre-existing schema violations. During a schema migration this means your application never gets blocked by legacy invalid data — you can remediate on your own schedule.',
  },
  'update|invalid|invalid|moderate|warn': {
    r: 'bypassed',
    msg: '<strong>moderate</strong>: The existing document was already invalid, so validation is <em>intentionally bypassed</em>. No check runs, so no warning is generated either.',
    consequence: '<strong>Application:</strong> receives a success response. Document is updated and remains schema-invalid. No log entry is written.',
    insight: 'With moderate + warn, bypass takes precedence over warn — the write is never checked, so warn has nothing to act on. This is the most permissive combination: full write availability for pre-existing invalid data, with zero log noise.',
  },

};

// ── DOM refs ───────────────────────────────────────────────────────────────
const svg              = document.getElementById('flow-svg');
const statusBadge      = document.getElementById('status-badge');
const statusExpl       = document.getElementById('status-expl');
const statusConsequence= document.getElementById('status-consequence');
const insightEl        = document.getElementById('insight-badge');
const capWriteType     = document.getElementById('cap-write-type');
const capWriteSub      = document.getElementById('cap-write-sub');
const docOpLabel       = document.getElementById('doc-op-label');
const docVersionText   = document.getElementById('doc-version-text');
const ctrlColRight     = document.getElementById('ctrl-col-right');
const cmdSnippet       = document.getElementById('cmd-snippet');

// ── Render ─────────────────────────────────────────────────────────────────
function render() {
  const { op, writeValidity, existingValidity, level, action } = state;

  // Build lookup key — existingValidity only relevant for update
  const key = op === 'insert'
    ? `insert|${writeValidity}|${level}|${action}`
    : `update|${writeValidity}|${existingValidity}|${level}|${action}`;

  const o = outcomes[key];
  if (!o) return;

  // SVG classes: state + write-type + existing-validity
  svg.className.baseVal =
    `flow-svg s-${o.r} wt-${op} ev-${existingValidity} wv-${writeValidity}`;

  // Status badge
  const labels = {
    accepted: 'Accepted \u2713',
    bypassed: 'Accepted \u2014 Bypassed \u2933',
    warned:   'Accepted with Warning \u26A0',
    rejected: 'Rejected \u2717',
  };
  statusBadge.textContent = labels[o.r];
  statusBadge.className   = `status-badge ${o.r}`;

  // Explanation + consequence
  statusExpl.innerHTML        = o.msg;
  statusConsequence.innerHTML = o.consequence;

  // Insight badge
  if (o.insight) {
    insightEl.innerHTML = o.insight;
    insightEl.classList.add('visible');
  } else {
    insightEl.innerHTML = '';
    insightEl.classList.remove('visible');
  }

  // MongoDB command snippet
  cmdSnippet.innerHTML = buildCmd(level, action);

  // Write-attempt doc label, caption and version text
  const isUpdate = op === 'update';
  capWriteType.textContent = isUpdate ? 'Update'            : 'Insert';
  capWriteSub.textContent  = isUpdate ? 'modified document' : 'new document';
  docOpLabel.textContent   = isUpdate ? '{ update }'        : '{ insert }';
  docVersionText.textContent = isUpdate ? 'V2' : 'V1';

  // Right column: disabled for insert
  ctrlColRight.classList.toggle('disabled', !isUpdate);
}

// ── MongoDB command builder ────────────────────────────────────────────────
function buildCmd(level, action) {
  return [
    `<span class="cmd-comment">// Apply validator settings to an existing collection</span>`,
    `db.runCommand({`,
    `  collMod:          <span class="cmd-str">"myCollection"</span>,`,
    `  validator:        { <span class="cmd-str">$jsonSchema</span>: { <span class="cmd-comment">/* your schema */</span> } },`,
    `  <span class="cmd-key">validationLevel</span>:  <span class="cmd-str">"${level}"</span>,`,
    `  <span class="cmd-key">validationAction</span>: <span class="cmd-str">"${action}"</span>,`,
    `})`,
    ``,
    `<span class="cmd-comment">// Or set it at collection creation time</span>`,
    `db.createCollection(<span class="cmd-str">"myCollection"</span>, {`,
    `  validator:        { <span class="cmd-str">$jsonSchema</span>: { <span class="cmd-comment">/* your schema */</span> } },`,
    `  <span class="cmd-key">validationLevel</span>:  <span class="cmd-str">"${level}"</span>,`,
    `  <span class="cmd-key">validationAction</span>: <span class="cmd-str">"${action}"</span>,`,
    `})`,
  ].join('\n');
}

// ── Tooltip ────────────────────────────────────────────────────────────────
const tooltipEl = document.getElementById('tooltip');

function badge(v) {
  return v === 'valid'
    ? '<span style="color:var(--green);font-weight:700">\u2713 valid</span>'
    : '<span style="color:var(--amber);font-weight:700">\u26A0 invalid</span>';
}

function getTooltipHTML(tipId) {
  const { op, writeValidity, existingValidity, level, action } = state;

  const levelDesc = {
    strict:   'All inserts and all updates are validated, regardless of existing document state.',
    moderate: 'Inserts and updates to currently-valid documents are validated. Updates to already-invalid documents bypass validation entirely.',
  };
  const actionDesc = {
    error: 'A violating write is <strong>rejected</strong> — a WriteError is returned to the application.',
    warn:  'A violating write is <strong>stored</strong> but a warning is written to the MongoDB server log. The application receives a success response.',
  };

  switch (tipId) {
    case 'doc':
      return `
        <strong>${op === 'insert' ? 'Insert' : 'Update'} — Write Attempt</strong>
        <div class="tip-row"><span class="tip-label">operation</span>${op === 'insert' ? 'New document, never stored before' : 'Modifying an existing document'}</div>
        <div class="tip-row"><span class="tip-label">write doc</span>${badge(writeValidity)} against current schema</div>
      `;

    case 'validator':
      return `
        <strong>Active $jsonSchema Validator</strong>
        <div class="tip-row"><span class="tip-label">validationLevel</span><code>${level}</code></div>
        <div class="tip-desc">${levelDesc[level]}</div>
        <div class="tip-row" style="margin-top:8px"><span class="tip-label">validationAction</span><code>${action}</code></div>
        <div class="tip-desc">${actionDesc[action]}</div>
      `;

    case 'collection':
      if (op === 'insert') {
        return `
          <strong>MongoDB Collection</strong>
          <div class="tip-desc">No existing document — this is a new insert. The existing document state is irrelevant.</div>
        `;
      }
      return `
        <strong>MongoDB Collection</strong>
        <div class="tip-row"><span class="tip-label">existing doc</span>${badge(existingValidity)} against current schema</div>
        <div class="tip-desc">${existingValidity === 'invalid'
          ? 'This document was written before validation was enforced (or under looser rules). It currently violates the schema.'
          : 'This document conforms to the current schema rules.'}</div>
      `;

    case 'existing-doc': {
      const lookupKey = `update|${writeValidity}|${existingValidity}|${level}|${action}`;
      const thisOutcome = outcomes[lookupKey];
      const result = thisOutcome ? thisOutcome.r : null;

      let existDesc;
      if (existingValidity === 'invalid') {
        if (level === 'moderate') {
          existDesc = 'Already stored but violates the current schema. Under <strong>moderate</strong>, updates to this document <em>bypass validation entirely</em> — MongoDB intentionally skips the check to give you write availability for legacy data during migrations.';
        } else {
          existDesc = 'Already stored but violates the current schema. Under <strong>strict</strong>, every write is validated regardless of the existing document\'s state — this update will still be checked against the schema and '
            + (action === 'error' ? '<strong>rejected</strong> if the new version violates it.' : '<strong>stored with a server-log warning</strong> if the new version violates it.');
        }
      } else {
        existDesc = 'Conforms to the current schema. Under <strong>' + level + '</strong>, updates to a valid document are always validated — the incoming write must also conform to pass.';
      }

      let outcomeDesc = '';
      if (result === 'bypassed') {
        outcomeDesc = writeValidity === 'invalid'
          ? 'V1 <strong>will be overwritten</strong> by V2. Validation is bypassed — no check runs. V2 is stored and the document <strong>remains schema-invalid</strong> in the collection.'
          : 'V1 <strong>will be overwritten</strong> by V2. Validation is bypassed, but V2 happens to be valid — the collection ends up with a conforming document.';
      } else if (result === 'accepted') {
        outcomeDesc = 'V1 <strong>will be overwritten</strong> by a valid V2. The collection will hold a schema-conforming document.';
      } else if (result === 'warned') {
        outcomeDesc = writeValidity === 'invalid'
          ? 'V1 <strong>will be overwritten</strong> by V2. Despite the violation, the write is stored — V2 is now in the collection and <strong>is schema-invalid</strong>. A warning is written to the server log.'
          : 'V1 <strong>will be overwritten</strong> by a valid V2. The write passes — V2 is stored cleanly.';
      } else if (result === 'rejected') {
        outcomeDesc = 'V1 <strong>will NOT be overwritten</strong>. The write is blocked — V1 stays unchanged in the collection.';
      }

      return `
        <strong>Existing Document in Collection (V1)</strong>
        <div class="tip-row"><span class="tip-label">state</span>${badge(existingValidity)}</div>
        <div class="tip-desc">${existDesc}</div>
        ${outcomeDesc ? `<div class="tip-desc" style="margin-top:6px;border-top:1px solid var(--borderSubtle);padding-top:6px"><span style="font-size:0.72rem;font-weight:700;color:var(--svgNodeCap);text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px">outcome \u2192</span>${outcomeDesc}</div>` : ''}
      `;
    }

    case 'warn-badge':
      return `
        <strong>Write Stored — Validation Warning</strong>
        <div class="tip-desc">The document <em>was</em> stored despite violating the schema. MongoDB writes a structured warning entry to the <strong>server log</strong> (not returned to the application).</div>
        <div class="tip-desc" style="margin-top:6px;border-top:1px solid var(--borderSubtle);padding-top:6px">
          <div class="tip-row"><span class="tip-label">app sees</span><span style="color:var(--green);font-weight:700">success</span> — no error, no hint of the violation</div>
          <div class="tip-row"><span class="tip-label">log entry</span>MongoDB server log, e.g. via:</div>
          <div style="margin-top:3px;padding-left:4px"><code style="word-break:break-all">db.adminCommand({getLog:"global"})</code></div>
          <div class="tip-row"><span class="tip-label">document</span>stored as-is, schema-invalid, queryable like any other document</div>
        </div>
      `;

    case 'error':
      return `
        <strong>Write Rejected</strong>
        <div class="tip-desc">A <code>WriteError</code> is returned to the application. The document is <em>not</em> stored.${op === 'update' ? ' The existing document in the collection is left unchanged.' : ''}</div>
      `;
  }
  return '';
}

function positionTooltip(x, y) {
  const tw = tooltipEl.offsetWidth;
  const th = tooltipEl.offsetHeight;
  let left = x + 16;
  let top  = y + 16;
  if (left + tw > window.innerWidth  - 12) left = x - tw - 16;
  if (top  + th > window.innerHeight - 12) top  = y - th - 16;
  tooltipEl.style.left = left + 'px';
  tooltipEl.style.top  = top  + 'px';
}

// Attach tooltip listeners to all [data-tip] SVG groups
document.querySelectorAll('[data-tip]').forEach(el => {
  el.addEventListener('mousemove', e => {
    tooltipEl.innerHTML = getTooltipHTML(el.dataset.tip);
    tooltipEl.classList.add('visible');
    positionTooltip(e.clientX, e.clientY);
  });
  el.addEventListener('mouseleave', () => {
    tooltipEl.classList.remove('visible');
  });
});

// ── Toggle handlers ────────────────────────────────────────────────────────
document.querySelectorAll('.toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const { group, value } = btn.dataset;
    document.querySelectorAll(`.toggle[data-group="${group}"]`)
      .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state[group] = value;
    render();
  });
});

render();
