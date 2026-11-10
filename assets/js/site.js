(function () {
  "use strict";
  var C = window.SITE_CONFIG || {};
  var S = window.Store;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var EASE = "cubic-bezier(.22,1,.36,1)";
  document.getElementById("yr").textContent = new Date().getFullYear();

  /* ---------------- links configuráveis ---------------- */
  var waUrl = C.whatsapp ? "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(C.whatsappMsg || "") : null;
  $$(".js-wa").forEach(function (a) {
    if (waUrl) a.href = waUrl;
    else { a.href = "#aplicar"; a.removeAttribute("target"); }
  });
  var ig = $("#lnkInstagram");
  if (C.links && C.links.instagram) ig.href = C.links.instagram;
  if (C.links && C.links.stark && C.links.stark.charAt(0) !== "#") {
    var st = $("#starkCta"); st.href = C.links.stark; st.target = "_blank"; st.rel = "noopener"; st.removeAttribute("data-interest");
  }

  /* ---------------- entrada: foto montada por blocos ---------------- */
  function intro() {
    var photo = $("#heroPhoto"), tiles = $("#tiles"), img = $("#heroImg");
    var heroBits = $$(".reveal-hero");
    var words = $$(".hero-name .word");

    function textIn(delay) {
      document.body.classList.remove("is-loading");
      if (reduce) return;
      words.forEach(function (w, i) {
        w.animate([{ transform: "translateY(105%)" }, { transform: "translateY(0)" }],
          { duration: 900, delay: delay + i * 90, easing: EASE, fill: "both" });
      });
      heroBits.forEach(function (el, i) {
        el.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }],
          { duration: 700, delay: delay + 200 + i * 80, easing: EASE, fill: "both" });
      });
    }

    if (reduce || !img) { textIn(0); return; }

    var start = function () {
      var src = img.currentSrc || img.src;
      var COLS = 6, ROWS = 7;
      tiles.style.gridTemplateColumns = "repeat(" + COLS + ",1fr)";
      tiles.style.gridTemplateRows = "repeat(" + ROWS + ",1fr)";
      // a foto usa object-fit: cover; reproduzimos o mesmo enquadramento nos blocos
      var box = photo.getBoundingClientRect();
      var ir = img.naturalWidth / img.naturalHeight, br = box.width / box.height;
      var bw, bh, ox, oy;
      if (ir > br) { bh = box.height; bw = bh * ir; ox = (box.width - bw) * 0.5; oy = 0; }
      else { bw = box.width; bh = bw / ir; ox = 0; oy = (box.height - bh) * ((parseFloat((getComputedStyle(img).objectPosition || "50% 20%").split(" ")[1]) || 20) / 100); }
      var tw = box.width / COLS, th = box.height / ROWS;
      var frag = document.createDocumentFragment(), list = [];
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var t = document.createElement("div");
        t.className = "tile";
        t.style.backgroundImage = "url('" + src + "')";
        t.style.backgroundSize = bw + "px " + bh + "px";
        t.style.backgroundPosition = (ox - c * tw) + "px " + (oy - r * th) + "px";
        frag.appendChild(t);
        // distância do rosto (centro-alto) define a ordem: o rosto se forma primeiro
        var d = Math.hypot((c + .5) / COLS - .5, ((r + .5) / ROWS - .3) * 1.2);
        list.push({ el: t, d: d, c: c, r: r });
      }
      tiles.appendChild(frag);
      photo.classList.add("is-assembling");
      var maxEnd = 0;
      list.forEach(function (o) {
        var dx = (o.c - (COLS - 1) / 2) * 26 + (Math.random() - .5) * 40;
        var dy = (o.r - (ROWS - 1) / 2) * 22 + 30 + (Math.random() - .5) * 40;
        var rot = (Math.random() - .5) * 24;
        var delay = 80 + o.d * 900 + Math.random() * 120;
        var dur = 900;
        maxEnd = Math.max(maxEnd, delay + dur);
        o.el.animate([
          { opacity: 0, transform: "translate(" + dx + "px," + dy + "px) rotate(" + rot + "deg) scale(.55)", filter: "blur(6px) brightness(1.6)" },
          { opacity: 1, transform: "none", filter: "blur(0) brightness(1)" }
        ], { duration: dur, delay: delay, easing: EASE, fill: "both" });
      });
      textIn(Math.min(650, maxEnd * 0.45));
      setTimeout(function () {
        photo.classList.remove("is-assembling");   // imagem inteira por baixo, nítida, sem emendas
        setTimeout(function () { tiles.innerHTML = ""; }, 520);
      }, maxEnd + 40);
    };

    if (img.complete && img.naturalWidth) start();
    else { img.addEventListener("load", start, { once: true }); img.addEventListener("error", function () { textIn(0); }, { once: true }); }
  }
  intro();

  /* ---------------- topbar + botão flutuante ---------------- */
  var topbar = $("#topbar"), fab = $(".fab"), apply = $("#aplicar");
  var applyVisible = false;
  function onScroll() {
    var y = window.scrollY;
    topbar.classList.toggle("is-solid", y > 40);
    fab.classList.toggle("is-on", y > window.innerHeight * 0.9 && !applyVisible);
    flowProgress();
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { applyVisible = e[0].isIntersecting; onScroll(); }, { threshold: 0.15 }).observe(apply);
  }

  /* ---------------- reveal + contadores ---------------- */
  function countUp(el) {
    var to = +el.getAttribute("data-count"), pre = el.getAttribute("data-prefix") || "", suf = el.getAttribute("data-suffix") || "";
    if (reduce) return;
    var t0 = null, dur = 1400;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = pre + Math.round(to * e) + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        if (el.classList.contains("reveal")) {
          // pequeno escalonamento entre irmãos que entram juntos
          var sibs = $$(".reveal:not(.in)", el.parentNode).filter(function (s) { return s.parentNode === el.parentNode; });
          var idx = Math.max(0, sibs.indexOf(el));
          el.style.transitionDelay = Math.min(idx, 4) * 70 + "ms";
          el.classList.add("in");
        }
        $$("[data-count]", el).concat(el.hasAttribute("data-count") ? [el] : []).forEach(function (c) {
          if (!c.dataset.done) { c.dataset.done = 1; countUp(c); }
        });
        io.unobserve(el);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    $$(".reveal").forEach(function (el) { io.observe(el); });
    $$(".stats [data-count]").forEach(function (el) { io.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------------- quadrados com frases ---------------- */
  var squares = $$(".sq");
  squares.forEach(function (sq) {
    var words = sq.getAttribute("data-words").split("|");
    var slot = $(".sq-word", sq);
    sq._words = words; sq._i = 0;
    var w = document.createElement("span"); w.className = "w"; w.textContent = words[0];
    slot.appendChild(w);
  });
  function swap(sq) {
    var slot = $(".sq-word", sq), old = $(".w", slot);
    sq._i = (sq._i + 1) % sq._words.length;
    var nw = document.createElement("span"); nw.className = "w"; nw.textContent = sq._words[sq._i];
    slot.appendChild(nw);
    sq.classList.add("is-live");
    setTimeout(function () { sq.classList.remove("is-live"); }, 900);
    if (reduce) { old.remove(); return; }
    old.animate([{ transform: "none", opacity: 1, filter: "blur(0)" }, { transform: "translateY(-60%)", opacity: 0, filter: "blur(4px)" }],
      { duration: 450, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" }).onfinish = function () { old.remove(); };
    nw.animate([{ transform: "translateY(60%)", opacity: 0, filter: "blur(4px)" }, { transform: "none", opacity: 1, filter: "blur(0)" }],
      { duration: 600, delay: 120, easing: EASE, fill: "both" });
  }
  var sqTimer = null, sqTick = 0;
  function runSquares(on) {
    clearInterval(sqTimer);
    if (!on || reduce) return;
    sqTimer = setInterval(function () { swap(squares[sqTick % squares.length]); sqTick++; }, 1100);
  }
  if ("IntersectionObserver" in window && squares.length) {
    new IntersectionObserver(function (e) { runSquares(e[0].isIntersecting); }, { threshold: 0.2 }).observe($("#squares"));
  }
  document.addEventListener("visibilitychange", function () { if (document.hidden) runSquares(false); });

  /* ---------------- linha do fluxo acompanha a rolagem ---------------- */
  var flow = $("#flow"), fsteps = $$(".fstep");
  function flowProgress() {
    if (!flow) return;
    var r = flow.getBoundingClientRect(), vh = window.innerHeight;
    var p = Math.max(0, Math.min(1, (vh * 0.75 - r.top) / (r.height + vh * 0.2)));
    if (window.innerWidth >= 760) p = Math.max(0, Math.min(1, (vh * 0.85 - r.top) / (vh * 0.5)));
    flow.style.setProperty("--p", p.toFixed(3));
    fsteps.forEach(function (s, i) { s.classList.toggle("on", p >= i / (fsteps.length - 1) - 0.02); });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", flowProgress);
  onScroll();

  /* ================= FORMULÁRIO ================= */
  var form = $("#leadForm");
  if (!form) return;
  var steps = $$(".step", form), cur = 0;
  var prevBtn = $("#prevBtn"), nextBtn = $("#nextBtn"), sendBtn = $("#sendBtn");
  var err = $("#formErr"), bar = $("#progBar"), count = $("#stepCount");
  var startedAt = Date.now();

  // opções vindas do Store (uma única fonte para form e painel)
  $$(".opts", form).forEach(function (box) {
    var group = box.getAttribute("data-group"), name = box.getAttribute("data-name"), multi = box.hasAttribute("data-multi");
    S.OPTIONS[group].forEach(function (o) {
      var l = document.createElement("label");
      l.innerHTML = '<input type="' + (multi ? "checkbox" : "radio") + '" name="' + name + '" value="' + o[0] + '"><span>' + o[1] + "</span>";
      box.appendChild(l);
    });
  });

  // botões da página escolhem o interesse antes de rolar até o form
  $$("[data-interest]").forEach(function (a) {
    a.addEventListener("click", function () {
      var v = a.getAttribute("data-interest");
      var r = form.querySelector('input[name="interest"][value="' + v + '"]');
      if (r && !form.classList.contains("is-done")) { r.checked = true; applyInterest(); }
    });
  });
  function applyInterest() {
    var v = (form.querySelector('input[name="interest"]:checked') || {}).value || "consultoria";
    $$("[data-l-" + v + "]", form).forEach(function (el) { el.textContent = el.getAttribute("data-l-" + v); });
  }
  $$('input[name="interest"]', form).forEach(function (r) { r.addEventListener("change", applyInterest); });

  // máscara de WhatsApp BR
  var wa = $("#f-wa");
  wa.addEventListener("input", function () {
    var d = wa.value.replace(/\D/g, "").slice(0, 11);
    var out = d;
    if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2);
    if (d.length > 7) out = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(d.length - 4);
    wa.value = out;
  });

  function show(i, back) {
    steps[cur].classList.remove("is-active", "is-back");
    cur = i;
    steps[cur].classList.toggle("is-back", !!back);
    steps[cur].classList.add("is-active");
    prevBtn.hidden = cur === 0;
    nextBtn.hidden = cur === steps.length - 1;
    sendBtn.hidden = cur !== steps.length - 1;
    bar.style.width = ((cur + 1) / steps.length * 100) + "%";
    count.textContent = "Etapa " + (cur + 1) + " de " + steps.length;
    err.textContent = "";
    var f = steps[cur].querySelector("input:not([type=radio]):not([type=checkbox])");
    if (f && window.innerWidth > 760) f.focus({ preventScroll: true });
  }

  function validStep(i) {
    var st = steps[i], ok = true, msg = "";
    $$(".invalid", st).forEach(function (e) { e.classList.remove("invalid"); });
    $$("input[required]:not([type=radio]):not([type=checkbox])", st).forEach(function (inp) {
      var v = inp.value.trim();
      var bad = !v || (inp.minLength > 0 && v.length < inp.minLength);
      if (inp.id === "f-wa" && v.replace(/\D/g, "").length < 10) bad = true;
      if (bad) { inp.classList.add("invalid"); ok = false; msg = msg || "Preencha os campos destacados."; }
    });
    var em = $("#f-email", st);
    if (em && em.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) { em.classList.add("invalid"); ok = false; msg = msg || "Confira o e-mail."; }
    $$(".opts:not([data-multi])", st).forEach(function (box) {
      if (!box.querySelector("input:checked")) { box.classList.add("invalid"); ok = false; msg = msg || "Escolha uma opção em cada pergunta."; }
    });
    var cs = $('input[name="consent"]', st);
    if (cs && !cs.checked) { ok = false; msg = msg || "Precisamos da sua autorização para entrar em contato."; }
    err.textContent = msg;
    if (!ok && !reduce) form.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 280, easing: "ease-out" });
    return ok;
  }

  nextBtn.addEventListener("click", function () { if (validStep(cur)) show(cur + 1); });
  prevBtn.addEventListener("click", function () { show(cur - 1, true); });
  form.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.tagName === "INPUT" && cur < steps.length - 1) { e.preventDefault(); nextBtn.click(); }
  });
  form.addEventListener("change", function (e) {
    var box = e.target.closest(".opts"); if (box) box.classList.remove("invalid");
  });
  form.addEventListener("input", function (e) { e.target.classList && e.target.classList.remove("invalid"); });

  function utm() {
    var q = new URLSearchParams(location.search), o = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
      var v = q.get(k);
      try { if (v) sessionStorage.setItem(k, v); else v = sessionStorage.getItem(k); } catch (e) {}
      o[k] = v ? v.slice(0, 120) : null;
    });
    return o;
  }
  utm(); // guarda na sessão ao chegar

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validStep(cur)) return;
    // anti-spam: honeypot e tempo mínimo
    if (form.website.value || Date.now() - startedAt < 2500) { finish(); return; }
    var fd = new FormData(form);
    var lead = {
      name: (fd.get("name") || "").trim(),
      whatsapp: (fd.get("whatsapp") || "").trim(),
      email: (fd.get("email") || "").trim() || null,
      company: (fd.get("company") || "").trim() || null,
      segment: (fd.get("segment") || "").trim() || null,
      city: (fd.get("city") || "").trim() || null,
      interest: fd.get("interest") || "consultoria",
      revenue: fd.get("revenue"), ads_invest: fd.get("ads_invest"),
      team: fd.get("team"), crm: fd.get("crm"),
      challenge: fd.getAll("challenge"),
      message: (fd.get("message") || "").trim() || null,
      consent: !!fd.get("consent"),
      referrer: document.referrer ? document.referrer.slice(0, 300) : null,
      page: location.pathname,
      device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop"
    };
    Object.assign(lead, utm());
    sendBtn.disabled = true; sendBtn.firstChild.textContent = "Enviando… ";
    S.createLead(lead).then(finish).catch(function (ex) {
      console.error(ex);
      sendBtn.disabled = false; sendBtn.firstChild.textContent = "Enviar ";
      err.textContent = "Não consegui enviar agora. Tente de novo ou me chame no WhatsApp.";
    });
    function finish() {
      $("#doneName").textContent = (lead.name || "").split(" ")[0] || "obrigado";
      var link = $(".done .js-wa");
      if (C.whatsapp) {
        var txt = "Oi Mateus, sou " + lead.name + (lead.company ? " da " + lead.company : "") + ". Acabei de preencher o formulário da sua página (" + S.label("interest", lead.interest) + ").";
        link.href = "https://wa.me/" + C.whatsapp + "?text=" + encodeURIComponent(txt);
      } else link.hidden = true;
      form.classList.add("is-done");
      $("#done").hidden = false;
      form.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
  });

  show(0);
  applyInterest();
})();
