(function () {
  "use strict";
  var S = window.Store, C = window.SITE_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  // Todo texto vindo do formulário é de terceiros: sempre escapar antes de pôr no HTML.
  function esc(v) { return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  var STATUS = S.OPTIONS.status;
  var state = { leads: [], days: 30, view: "list", openId: null };

  /* ---------------- util ---------------- */
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("on"); }, 2200); }
  function fmtDate(iso, withTime) {
    var d = new Date(iso);
    var s = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    return withTime ? s + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : s;
  }
  function ago(iso) {
    var m = Math.round((Date.now() - new Date(iso)) / 6e4);
    if (m < 60) return m + " min";
    var h = Math.round(m / 60); if (h < 24) return h + " h";
    var d = Math.round(h / 24); return d + " d";
  }
  function stColor(k) { return "var(--s-" + k + ")"; }
  function digits(p) { var d = String(p || "").replace(/\D/g, ""); return d.length <= 11 ? "55" + d : d; }
  function waLink(l) {
    var first = (l.name || "").split(" ")[0];
    var msg = l.interest === "mentoria"
      ? "Oi " + first + ", aqui é o Mateus. Vi sua aplicação para a Mentoria Stark e queria entender melhor sua operação. Tem 15 minutos hoje?"
      : "Oi " + first + ", aqui é o Mateus, da Hollmind. Recebi seu pedido de diagnóstico" + (l.company ? " da " + l.company : "") + ". Posso te fazer umas perguntas rápidas por aqui?";
    return "https://wa.me/" + digits(l.whatsapp) + "?text=" + encodeURIComponent(msg);
  }
  function enrich(l) { l._score = S.score(l); l._tier = S.tier(l._score); return l; }

  /* ---------------- auth ---------------- */
  function boot() {
    $("#modeBadge").textContent = S.remote ? "Ao vivo" : "Demonstração";
    $("#modeBadge").classList.toggle("live", S.remote);
    $("#demoNote").hidden = S.remote;
    if (!S.remote) { $("#emailField").hidden = true; $("#loginHint").textContent = "Modo demonstração: senha definida em config.js."; }
    if (S.isLogged()) showApp(); else showLogin();
  }
  function showLogin() { $("#login").hidden = false; $("#app").hidden = true; }
  function showApp() { $("#login").hidden = true; $("#app").hidden = false; load(); }
  $("#loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, btn = $("button", f);
    btn.disabled = true; $("#loginErr").textContent = "";
    S.login(f.email.value.trim(), f.password.value).then(showApp).catch(function (ex) {
      $("#loginErr").textContent = /invalid/i.test(ex.message) ? "E-mail ou senha incorretos." : ex.message;
    }).then(function () { btn.disabled = false; });
  });
  $("#btnLogout").addEventListener("click", function () { S.logout(); showLogin(); });

  /* ---------------- dados ---------------- */
  function load() {
    $("#btnRefresh").classList.add("spin");
    S.listLeads().then(function (rows) {
      state.leads = (rows || []).map(enrich);
      render();
    }).catch(function (ex) {
      if (/JWT|401|expired/i.test(ex.message)) { S.logout(); showLogin(); return; }
      toast("Erro ao carregar: " + ex.message.slice(0, 80));
    });
  }
  $("#btnRefresh").addEventListener("click", function () { load(); toast("Atualizado"); });
  $("#btnSeed").addEventListener("click", function () { S.seedDemo(); load(); toast("Leads de exemplo criados"); });
  // atualiza sozinho a cada 60s quando a aba está visível
  setInterval(function () { if (!document.hidden && !$("#app").hidden && !state.openId) load(); }, 60000);

  function inPeriod(l) { return !state.days || (Date.now() - new Date(l.created_at)) <= state.days * 864e5; }
  function filtered() {
    var q = $("#q").value.trim().toLowerCase(), qd = q.replace(/\D/g, "");
    var fs = $("#fStatus").value, fi = $("#fInterest").value, ft = $("#fTier").value;
    return state.leads.filter(function (l) {
      if (!inPeriod(l)) return false;
      if (fs && l.status !== fs) return false;
      if (fi && l.interest !== fi) return false;
      if (ft && l._tier !== ft) return false;
      if (q) {
        var hay = [l.name, l.company, l.email, l.city, l.segment, l.utm_campaign].join(" ").toLowerCase();
        if (hay.indexOf(q) < 0 && !(qd.length >= 3 && String(l.whatsapp).replace(/\D/g, "").indexOf(qd) >= 0)) return false;
      }
      return true;
    });
  }

  /* ---------------- render ---------------- */
  function render() {
    var period = state.leads.filter(inPeriod);
    renderKpis(period);
    renderChart(period);
    renderBars("#sources", period, function (l) { return l.utm_source || (l.referrer ? "referência" : "direto"); });
    renderBars("#revenues", period, function (l) { return S.label("revenue", l.revenue); });
    var rows = filtered();
    $("#empty").hidden = rows.length > 0;
    if (state.view === "list") renderList(rows); else renderBoard(rows);
  }

  function renderKpis(p) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var novosHoje = p.filter(function (l) { return new Date(l.created_at) >= today; }).length;
    var quentes = p.filter(function (l) { return l._tier === "quente"; }).length;
    var neg = p.filter(function (l) { return ["contato", "reuniao", "proposta"].indexOf(l.status) >= 0; }).length;
    var ganhos = p.filter(function (l) { return l.status === "ganho"; });
    var receita = ganhos.reduce(function (s, l) { return s + (+l.value || 0); }, 0);
    var semContato = p.filter(function (l) { return l.status === "novo"; }).length;
    var conv = p.length ? (ganhos.length / p.length * 100) : 0;
    var k = [
      ["Leads no período", p.length, novosHoje + " hoje"],
      ["Sem contato", semContato, "status “Novo”", semContato ? "accent" : ""],
      ["Quentes", quentes, "score ≥ 65"],
      ["Em negociação", neg, "contato, reunião, proposta"],
      ["Ganhos", ganhos.length, BRL.format(receita)],
      ["Conversão", conv.toFixed(1).replace(".", ",") + "%", "lead → ganho"]
    ];
    $("#kpis").innerHTML = k.map(function (x, i) {
      return '<div class="kpi ' + (x[3] || "") + '" style="animation-delay:' + i * 40 + 'ms"><span>' + x[0] + "</span><b>" + esc(x[1]) + "</b><small>" + esc(x[2]) + "</small></div>";
    }).join("");
  }

  function renderChart(p) {
    var days = state.days || Math.max(7, Math.min(120, Math.ceil((Date.now() - Math.min.apply(null, p.map(function (l) { return +new Date(l.created_at); }).concat([Date.now()]))) / 864e5) + 1));
    var buckets = [], start = new Date(); start.setHours(0, 0, 0, 0); start = +start - (days - 1) * 864e5;
    for (var i = 0; i < days; i++) buckets.push(0);
    p.forEach(function (l) { var i = Math.floor((+new Date(l.created_at) - start) / 864e5); if (i >= 0 && i < days) buckets[i]++; });
    var max = Math.max(1, Math.max.apply(null, buckets));
    var W = 600, H = 150, pad = 18, bw = (W - 24) / days;
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Leads por dia">';
    [0.5, 1].forEach(function (g) { var y = H - pad - (H - pad - 6) * g; svg += '<line class="gl" x1="24" x2="' + W + '" y1="' + y + '" y2="' + y + '"/><text class="ax" x="0" y="' + (y + 3) + '">' + Math.round(max * g) + "</text>"; });
    buckets.forEach(function (v, i) {
      var h = (H - pad - 6) * v / max, x = 24 + i * bw;
      var d = new Date(start + i * 864e5);
      svg += '<rect class="b" x="' + (x + bw * .15).toFixed(1) + '" y="' + (H - pad - h).toFixed(1) + '" width="' + (bw * .7).toFixed(1) + '" height="' + Math.max(v ? 2 : 0, h).toFixed(1) + '" rx="2"><title>' + d.toLocaleDateString("pt-BR") + ": " + v + " lead(s)</title></rect>";
      var every = Math.ceil(days / 8);
      if (i % every === 0) svg += '<text class="ax" x="' + (x + bw / 2) + '" y="' + (H - 2) + '" text-anchor="middle">' + fmtDate(d) + "</text>";
    });
    $("#chart").innerHTML = svg + "</svg>";
    $("#chartSum").textContent = p.length + " leads";
  }

  function renderBars(sel, p, keyFn) {
    var m = {};
    p.forEach(function (l) { var k = keyFn(l) || "—"; m[k] = (m[k] || 0) + 1; });
    var arr = Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6);
    var max = arr.length ? arr[0][1] : 1;
    $(sel).innerHTML = arr.length ? arr.map(function (x) {
      return '<div class="hb"><span>' + esc(x[0]) + "</span><em>" + x[1] + " · " + Math.round(x[1] / p.length * 100) + '%</em><div class="t"><i style="width:' + (x[1] / max * 100) + '%"></i></div></div>';
    }).join("") : '<p class="muted">Sem dados no período.</p>';
  }

  function pills(l) {
    return '<span class="pill st" style="--c:' + stColor(l.status) + '"><span class="dot"></span>' + esc(S.label("status", l.status)) + "</span>" +
      '<span class="score ' + l._tier + '"><svg class="ic"><use href="#i-flame"/></svg>' + l._score + "</span>" +
      '<span class="pill">' + esc(S.label("interest", l.interest)) + "</span>" +
      (l.revenue ? '<span class="pill">' + esc(S.label("revenue", l.revenue)) + "</span>" : "");
  }

  function renderList(rows) {
    $("#list").hidden = false; $("#board").hidden = true;
    $("#list").innerHTML = rows.map(function (l, i) {
      return '<article class="row" data-id="' + esc(l.id) + '" tabindex="0" style="animation-delay:' + Math.min(i, 12) * 25 + 'ms">' +
        '<div class="who"><b>' + esc(l.name) + "</b><small>" + esc([l.company, l.city].filter(Boolean).join(" · ") || l.whatsapp) + "</small></div>" +
        '<div class="meta">' + pills(l) + "</div>" +
        '<div class="right"><span class="when" title="' + esc(fmtDate(l.created_at, true)) + '">há ' + ago(l.created_at) + "</span>" +
        '<a class="ibtn" href="' + esc(waLink(l)) + '" target="_blank" rel="noopener" aria-label="WhatsApp" data-stop><svg class="ic"><use href="#i-whatsapp"/></svg></a></div>' +
        "</article>";
    }).join("");
  }

  function renderBoard(rows) {
    $("#list").hidden = true; $("#board").hidden = false;
    $("#board").innerHTML = STATUS.map(function (s) {
      var items = rows.filter(function (l) { return l.status === s[0]; });
      var sum = items.reduce(function (a, l) { return a + (+l.value || 0); }, 0);
      return '<div class="col" data-status="' + s[0] + '"><div class="col-h"><div>' + s[1] + (sum ? "<small>" + BRL.format(sum) + "</small>" : "") +
        '</div><span class="pill st" style="--c:' + stColor(s[0]) + '">' + items.length + "</span></div>" +
        items.map(function (l) {
          return '<div class="kc" draggable="true" data-id="' + esc(l.id) + '" tabindex="0"><b>' + esc(l.name) + "</b><small>" + esc(l.company || l.whatsapp) + '</small><div class="meta">' +
            '<span class="score ' + l._tier + '"><svg class="ic"><use href="#i-flame"/></svg>' + l._score + '</span><span class="pill">' + esc(S.label("interest", l.interest)) + "</span></div></div>";
        }).join("") + "</div>";
    }).join("");
  }

  /* ---------------- interações ---------------- */
  $$(".period button").forEach(function (b) {
    b.addEventListener("click", function () {
      $$(".period button").forEach(function (x) { x.classList.remove("on"); });
      b.classList.add("on"); state.days = +b.getAttribute("data-days"); render();
    });
  });
  STATUS.forEach(function (s) { $("#fStatus").insertAdjacentHTML("beforeend", '<option value="' + s[0] + '">' + s[1] + "</option>"); });
  S.OPTIONS.interest.forEach(function (s) { $("#fInterest").insertAdjacentHTML("beforeend", '<option value="' + s[0] + '">' + s[1] + "</option>"); });
  ["#q", "#fStatus", "#fInterest", "#fTier"].forEach(function (id) { $(id).addEventListener("input", render); });
  $("#vList").addEventListener("click", function () { state.view = "list"; $("#vList").classList.add("on"); $("#vBoard").classList.remove("on"); render(); });
  $("#vBoard").addEventListener("click", function () { state.view = "board"; $("#vBoard").classList.add("on"); $("#vList").classList.remove("on"); render(); });

  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-stop]")) return;
    var card = e.target.closest(".row, .kc");
    if (card) openLead(card.getAttribute("data-id"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeLead();
    if (e.key === "Enter" && e.target.matches(".row, .kc")) openLead(e.target.getAttribute("data-id"));
  });

  // arrastar e soltar no funil
  var dragId = null;
  $("#board").addEventListener("dragstart", function (e) { var k = e.target.closest(".kc"); if (!k) return; dragId = k.getAttribute("data-id"); k.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; });
  $("#board").addEventListener("dragend", function (e) { var k = e.target.closest(".kc"); if (k) k.classList.remove("dragging"); $$(".col.over").forEach(function (c) { c.classList.remove("over"); }); });
  $("#board").addEventListener("dragover", function (e) { var c = e.target.closest(".col"); if (!c) return; e.preventDefault(); $$(".col.over").forEach(function (x) { if (x !== c) x.classList.remove("over"); }); c.classList.add("over"); });
  $("#board").addEventListener("drop", function (e) { var c = e.target.closest(".col"); if (!c || !dragId) return; e.preventDefault(); setStatus(dragId, c.getAttribute("data-status")); dragId = null; });

  function find(id) { for (var i = 0; i < state.leads.length; i++) if (state.leads[i].id === id) return state.leads[i]; }

  function setStatus(id, st) {
    var l = find(id); if (!l || l.status === st) return;
    var prev = l.status;
    l.status = st;
    var note = { at: new Date().toISOString(), text: "Status: " + S.label("status", prev) + " → " + S.label("status", st), auto: true };
    l.notes = (l.notes || []).concat([note]);
    render(); if (state.openId === id) openLead(id);
    S.updateLead(id, { status: st, notes: l.notes }).then(function () { toast("Movido para " + S.label("status", st)); })
      .catch(function (ex) { l.status = prev; render(); toast("Falhou: " + ex.message.slice(0, 60)); });
  }

  /* ---------------- ficha ---------------- */
  function kv(label, val, full) { return '<div class="kv' + (full ? " full" : "") + '"><span>' + label + "</span><b>" + (val ? esc(val) : "—") + "</b></div>"; }
  function openLead(id) {
    var l = find(id); if (!l) return;
    state.openId = id;
    $("#dName").textContent = l.name;
    $("#dSub").textContent = [l.company, l.segment, l.city].filter(Boolean).join(" · ");
    var tierColor = { quente: "var(--hot)", morno: "var(--warm)", frio: "var(--cold)" }[l._tier];
    var html = "";
    html += '<div class="actions"><a class="btn" href="' + esc(waLink(l)) + '" target="_blank" rel="noopener"><svg class="ic"><use href="#i-whatsapp"/></svg> WhatsApp</a>' +
      '<button class="btn ghost" id="dCopy"><svg class="ic"><use href="#i-copy"/></svg> ' + esc(l.whatsapp) + "</button>" +
      (l.email ? '<a class="btn ghost" style="grid-column:1/-1" href="mailto:' + esc(l.email) + '"><svg class="ic"><use href="#i-mail"/></svg> ' + esc(l.email) + "</a>" : "") + "</div>";

    html += '<div><p class="sec-t">Etapa do funil</p><div class="stsel">' + STATUS.map(function (s) {
      return '<button data-st="' + s[0] + '" class="' + (l.status === s[0] ? "on" : "") + '" style="--c:' + stColor(s[0]) + '">' + s[1] + "</button>";
    }).join("") + "</div>" +
      '<div class="valrow"><input id="dValue" type="number" min="0" step="100" inputmode="decimal" placeholder="Valor do contrato (R$)" value="' + (l.value != null ? esc(l.value) : "") + '"><button class="btn ghost" id="dSaveVal">Salvar valor</button></div></div>';

    html += '<div><p class="sec-t">Qualificação · score ' + l._score + "/100 (" + l._tier + ')</p><div class="meter"><i style="width:' + l._score + "%;background:" + tierColor + '"></i></div></div>';

    html += '<div class="grid2">' +
      kv("Interesse", S.label("interest", l.interest)) + kv("Faturamento", S.label("revenue", l.revenue)) +
      kv("Investe em anúncios", S.label("adsInvest", l.ads_invest)) + kv("Atendimento", S.label("team", l.team)) +
      kv("CRM", S.label("crm", l.crm)) + kv("Recebido em", fmtDate(l.created_at, true)) +
      kv("Desafios", (l.challenge || []).map(function (c) { return S.label("challenge", c); }).join(", "), true) +
      (l.message ? kv("Mensagem", l.message, true) : "") + "</div>";

    html += '<div><p class="sec-t">Origem</p><div class="grid2">' +
      kv("Fonte", l.utm_source || "direto") + kv("Mídia", l.utm_medium) + kv("Campanha", l.utm_campaign) + kv("Conteúdo", l.utm_content) +
      kv("Dispositivo", l.device) + kv("Referência", l.referrer) + "</div></div>";

    html += '<div><p class="sec-t">Anotações</p><div class="notes">' +
      (l.notes || []).slice().reverse().map(function (n) { return '<div class="note"><small>' + esc(fmtDate(n.at, true)) + "</small>" + esc(n.text) + "</div>"; }).join("") +
      '</div><div class="note-add" style="margin-top:8px"><textarea id="dNote" placeholder="Ex.: ligou, pediu proposta até sexta"></textarea><button class="btn ghost" id="dAddNote">Adicionar anotação</button></div></div>';

    html += '<button class="btn danger" id="dDel"><svg class="ic"><use href="#i-trash"/></svg> Excluir lead</button>';
    $("#dBody").innerHTML = html;

    $$(".stsel button", $("#dBody")).forEach(function (b) { b.addEventListener("click", function () { setStatus(id, b.getAttribute("data-st")); }); });
    $("#dCopy").addEventListener("click", function () { navigator.clipboard && navigator.clipboard.writeText(l.whatsapp).then(function () { toast("Telefone copiado"); }); });
    $("#dSaveVal").addEventListener("click", function () {
      var v = $("#dValue").value; l.value = v === "" ? null : +v;
      S.updateLead(id, { value: l.value }).then(function () { toast("Valor salvo"); render(); }).catch(function (ex) { toast(ex.message.slice(0, 60)); });
    });
    $("#dAddNote").addEventListener("click", function () {
      var t = $("#dNote").value.trim(); if (!t) return;
      l.notes = (l.notes || []).concat([{ at: new Date().toISOString(), text: t.slice(0, 2000) }]);
      S.updateLead(id, { notes: l.notes }).then(function () { toast("Anotação salva"); openLead(id); }).catch(function (ex) { toast(ex.message.slice(0, 60)); });
    });
    $("#dDel").addEventListener("click", function () {
      if (!confirm("Excluir " + l.name + "? Não dá para desfazer.")) return;
      S.deleteLead(id).then(function () { state.leads = state.leads.filter(function (x) { return x.id !== id; }); closeLead(); render(); toast("Lead excluído"); });
    });

    $("#scrim").hidden = false;
    $("#drawer").classList.add("open");
    $("#drawer").setAttribute("aria-hidden", "false");
  }
  function closeLead() {
    state.openId = null;
    $("#drawer").classList.remove("open");
    $("#drawer").setAttribute("aria-hidden", "true");
    $("#scrim").hidden = true;
  }
  $("#dClose").addEventListener("click", closeLead);
  $("#scrim").addEventListener("click", closeLead);

  /* ---------------- CSV ---------------- */
  $("#btnCsv").addEventListener("click", function () {
    var rows = filtered();
    var cols = ["created_at", "name", "whatsapp", "email", "company", "segment", "city", "interest", "revenue", "ads_invest", "team", "crm", "challenge", "message", "status", "value", "utm_source", "utm_medium", "utm_campaign", "utm_content", "device"];
    var head = cols.concat(["score"]);
    var cell = function (v) {
      v = Array.isArray(v) ? v.join("; ") : (v == null ? "" : String(v));
      if (/^[=+\-@]/.test(v)) v = "'" + v; // evita injeção de fórmula no Excel
      return '"' + v.replace(/"/g, '""') + '"';
    };
    var csv = "﻿" + head.join(";") + "\n" + rows.map(function (l) {
      return cols.map(function (c) { return cell(l[c]); }).concat([l._score]).join(";");
    }).join("\n");
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "leads-" + new Date().toISOString().slice(0, 10) + ".csv";
    a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast(rows.length + " leads exportados");
  });

  boot();
})();
