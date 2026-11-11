/*
 * Camada de dados compartilhada entre a página (index.html) e o painel (admin.html).
 * - Com Supabase configurado: grava/consulta via REST (PostgREST + Auth), protegido por RLS.
 * - Sem Supabase: modo demonstração em localStorage (só existe no navegador atual).
 */
(function () {
  "use strict";
  var cfg = (window.SITE_CONFIG && window.SITE_CONFIG.supabase) || {};
  var REMOTE = !!(cfg.url && cfg.anonKey);
  var LS_LEADS = "mo_leads_v1";
  var LS_SESSION = "mo_session_v1";

  /* ---------- tabelas de referência (usadas no form e no painel) ---------- */
  var OPTIONS = {
    revenue: [
      ["ate50", "Até R$ 50 mil/mês"],
      ["50a100", "R$ 50 a 100 mil/mês"],
      ["100a300", "R$ 100 a 300 mil/mês"],
      ["300a1m", "R$ 300 mil a 1 milhão/mês"],
      ["1m+", "Acima de R$ 1 milhão/mês"]
    ],
    adsInvest: [
      ["0", "Ainda não invisto"],
      ["ate3", "Até R$ 3 mil/mês"],
      ["3a10", "R$ 3 a 10 mil/mês"],
      ["10a30", "R$ 10 a 30 mil/mês"],
      ["30+", "Acima de R$ 30 mil/mês"]
    ],
    team: [
      ["sozinho", "Eu mesmo atendo"],
      ["1a3", "1 a 3 vendedores"],
      ["4+", "4 ou mais vendedores"]
    ],
    crm: [
      ["nao", "Não uso CRM"],
      ["planilha", "Planilha / anotações"],
      ["sim", "Uso um CRM"]
    ],
    challenge: [
      ["poucos_leads", "Poucos contatos"],
      ["leads_ruins", "Contatos sem perfil"],
      ["atendimento", "Atendimento demora"],
      ["followup", "Falta follow-up"],
      ["sem_dados", "Não sei o que dá retorno"],
      ["escalar", "Quero escalar com margem"]
    ],
    interest: [
      ["gestao", "Contrate meus serviços"],
      ["consultoria", "Consultoria"],
      ["mentoria", "Mentoria Stark"],
      ["parceria", "Consultoria para agência"]   // opção antiga, mantida para leads já recebidos
    ],
    status: [
      ["novo", "Novo"],
      ["contato", "Em contato"],
      ["reuniao", "Reunião marcada"],
      ["proposta", "Proposta enviada"],
      ["ganho", "Ganho"],
      ["perdido", "Perdido"]
    ]
  };

  function label(group, key) {
    var list = OPTIONS[group] || [];
    for (var i = 0; i < list.length; i++) if (list[i][0] === key) return list[i][1];
    return key || "—";
  }

  /* Pontuação 0–100. Calculada sempre no painel a partir das respostas (não confia no cliente). */
  function score(l) {
    var s = 0;
    s += { "ate50": 0, "50a100": 15, "100a300": 25, "300a1m": 32, "1m+": 35 }[l.revenue] || 0;
    s += { "0": 0, "ate3": 8, "3a10": 16, "10a30": 22, "30+": 25 }[l.ads_invest] || 0;
    s += { "sozinho": 4, "1a3": 12, "4+": 15 }[l.team] || 0;
    s += { "nao": 4, "planilha": 7, "sim": 10 }[l.crm] || 0;
    if (l.company) s += 5;
    if (l.email) s += 5;
    if ((l.challenge || []).length) s += 5;
    return Math.min(100, s);
  }
  function tier(sc) { return sc >= 65 ? "quente" : sc >= 40 ? "morno" : "frio"; }

  /* ---------- localStorage (demo) ---------- */
  function lsGet() { try { return JSON.parse(localStorage.getItem(LS_LEADS) || "[]"); } catch (e) { return []; } }
  function lsSet(a) { try { localStorage.setItem(LS_LEADS, JSON.stringify(a)); } catch (e) {} }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /* ---------- Supabase REST ---------- */
  function getSession() { try { return JSON.parse(localStorage.getItem(LS_SESSION) || "null"); } catch (e) { return null; } }
  function setSession(s) { try { s ? localStorage.setItem(LS_SESSION, JSON.stringify(s)) : localStorage.removeItem(LS_SESSION); } catch (e) {} }

  function rest(path, opts, retried) {
    opts = opts || {};
    var sess = getSession();
    var headers = Object.assign({
      apikey: cfg.anonKey,
      "Content-Type": "application/json",
      Authorization: "Bearer " + ((sess && sess.access_token) || cfg.anonKey)
    }, opts.headers || {});
    return fetch(cfg.url + path, { method: opts.method || "GET", headers: headers, body: opts.body }).then(function (r) {
      if (r.status === 401 && sess && !retried) return refresh().then(function () { return rest(path, opts, true); });
      if (!r.ok) return r.text().then(function (t) { throw new Error(t || ("HTTP " + r.status)); });
      return r.status === 204 ? null : r.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }
  function authCall(grant, body) {
    return fetch(cfg.url + "/auth/v1/token?grant_type=" + grant, {
      method: "POST",
      headers: { apikey: cfg.anonKey, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.error_description || j.msg || "Falha no login");
        setSession({ access_token: j.access_token, refresh_token: j.refresh_token, email: j.user && j.user.email });
        return j;
      });
    });
  }
  function refresh() {
    var s = getSession();
    if (!s) return Promise.reject(new Error("sem sessão"));
    return authCall("refresh_token", { refresh_token: s.refresh_token }).catch(function (e) { setSession(null); throw e; });
  }

  /* ---------- API pública ---------- */
  var Store = {
    remote: REMOTE,
    OPTIONS: OPTIONS,
    label: label,
    score: score,
    tier: tier,

    createLead: function (lead) {
      lead.status = "novo";
      if (!REMOTE) {
        var all = lsGet();
        lead.id = uuid();
        lead.created_at = new Date().toISOString();
        lead.updated_at = lead.created_at;
        lead.notes = [];
        all.unshift(lead);
        lsSet(all);
        return Promise.resolve(lead);
      }
      return rest("/rest/v1/leads", {
        method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(lead)
      });
    },

    /* ---- painel ---- */
    isLogged: function () { return !!getSession(); },
    sessionEmail: function () { var s = getSession(); return s && s.email; },
    login: function (email, password) {
      if (!REMOTE) {
        var ok = password === (window.SITE_CONFIG.demoPanelPassword || "");
        if (!ok) return Promise.reject(new Error("Senha incorreta"));
        setSession({ demo: true, email: "demo" });
        return Promise.resolve();
      }
      return authCall("password", { email: email, password: password });
    },
    logout: function () {
      var s = getSession();
      if (REMOTE && s && s.access_token) {
        fetch(cfg.url + "/auth/v1/logout", { method: "POST", headers: { apikey: cfg.anonKey, Authorization: "Bearer " + s.access_token } }).catch(function () {});
      }
      setSession(null);
    },
    listLeads: function () {
      if (!REMOTE) return Promise.resolve(lsGet());
      return rest("/rest/v1/leads?select=*&order=created_at.desc&limit=5000");
    },
    updateLead: function (id, patch) {
      patch.updated_at = new Date().toISOString();
      if (!REMOTE) {
        var all = lsGet();
        all.forEach(function (l) { if (l.id === id) Object.assign(l, patch); });
        lsSet(all);
        return Promise.resolve();
      }
      return rest("/rest/v1/leads?id=eq." + encodeURIComponent(id), {
        method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(patch)
      });
    },
    deleteLead: function (id) {
      if (!REMOTE) { lsSet(lsGet().filter(function (l) { return l.id !== id; })); return Promise.resolve(); }
      return rest("/rest/v1/leads?id=eq." + encodeURIComponent(id), { method: "DELETE" });
    },
    seedDemo: function () {
      if (REMOTE) return;
      var names = ["Carla Mendes", "Rafael Souza", "Juliana Prado", "Marcos Vieira", "Patrícia Lima", "Diego Rocha", "Fernanda Alves", "Thiago Nunes", "Aline Castro", "Bruno Teixeira", "Larissa Gomes", "Eduardo Pires"];
      var seg = ["Concessionária", "Clínica", "Academia", "Imobiliária", "Odontologia", "Agência de tráfego", "Loja de móveis", "Escola"];
      var cities = ["São Paulo/SP", "Goiânia/GO", "Manaus/AM", "Curitiba/PR", "Cuiabá/MT", "Belém/PA"];
      var st = ["novo", "novo", "contato", "reuniao", "proposta", "ganho", "perdido"];
      var src = ["instagram", "instagram", "google", "facebook", "direto"];
      var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
      var all = lsGet();
      names.forEach(function (n, i) {
        var d = new Date(Date.now() - Math.floor(Math.random() * 28) * 864e5 - Math.floor(Math.random() * 8e7));
        var interest = ["gestao", "gestao", "consultoria", "mentoria"][i % 4];
        var status = pick(st);
        all.push({
          id: uuid(), created_at: d.toISOString(), updated_at: d.toISOString(),
          name: n, whatsapp: "(11) 9" + (8000 + i * 37) + "-" + (1000 + i * 91),
          email: n.split(" ")[0].toLowerCase() + "@empresa.com.br",
          company: pick(seg) + " " + n.split(" ")[1], segment: pick(seg), city: pick(cities),
          revenue: pick(OPTIONS.revenue)[0], ads_invest: pick(OPTIONS.adsInvest)[0],
          team: pick(OPTIONS.team)[0], crm: pick(OPTIONS.crm)[0],
          challenge: [pick(OPTIONS.challenge)[0]], interest: interest,
          message: "", consent: true, status: status,
          value: status === "ganho" ? (interest === "mentoria" ? 4997 : 6500) : null,
          utm_source: pick(src), utm_medium: "cpc", utm_campaign: "pagina-pessoal",
          device: Math.random() > .3 ? "mobile" : "desktop", notes: [], demo: true
        });
      });
      all.sort(function (a, b) { return b.created_at.localeCompare(a.created_at); });
      lsSet(all);
    }
  };

  /* ---------- modo PHP + MySQL (Hostinger): tem prioridade quando SITE_CONFIG.api está preenchido ---------- */
  var API = (window.SITE_CONFIG && window.SITE_CONFIG.api) || "";
  if (API) {
    API = API.replace(/\/$/, "");
    var call = function (path, opts) {
      opts = opts || {};
      return fetch(API + path, {
        method: opts.method || "GET",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Requested-With": "fetch" },
        body: opts.body ? JSON.stringify(opts.body) : undefined
      }).then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
          if (r.status === 401 && path.indexOf("auth.php") < 0) { setSession(null); throw new Error("401"); }
          if (!r.ok) throw new Error((j && j.error) || ("Erro " + r.status));
          return j;
        });
      });
    };
    Store.remote = true;
    Store.mode = "php";
    Store.createLead = function (lead) { return call("/leads.php", { method: "POST", body: lead }); };
    Store.login = function (user, password) {
      return call("/auth.php", { method: "POST", body: { action: "login", user: user, password: password } })
        .then(function () { setSession({ php: true, email: user }); });
    };
    Store.logout = function () { call("/auth.php", { method: "POST", body: { action: "logout" } }).catch(function () {}); setSession(null); };
    Store.listLeads = function () { return call("/leads.php"); };
    Store.updateLead = function (id, patch) {
      var p = {};
      ["status", "value", "notes"].forEach(function (k) { if (k in patch) p[k] = patch[k]; });
      return call("/leads.php?id=" + encodeURIComponent(id), { method: "PATCH", body: p });
    };
    Store.deleteLead = function (id) { return call("/leads.php?id=" + encodeURIComponent(id), { method: "DELETE" }); };
  } else {
    Store.mode = REMOTE ? "supabase" : "demo";
  }

  window.Store = Store;
})();
