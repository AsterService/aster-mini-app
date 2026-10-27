/* NPS-дашборд: общий NPS по локациям и брендам, воронка опроса, комментарии.
   Подключается и во вкладку планировщика, и в отдельную страницу:
   NpsDash.mount(element, { scriptUrl: () => "https://script.google.com/macros/s/.../exec" }) */
(function () {
  var KEY_STORE = "servisset_nps_key";
  var REFRESH_MS = 5 * 60 * 1000;
  var GOOD = "#059669", MID = "#D97706", BAD = "#DC2626";

  var CSS = [
    ".nps{color:#111827;font-size:14px}",
    ".nps *{box-sizing:border-box}",
    ".nps-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:18px}",
    ".nps-bar select,.nps-bar input[type=text],.nps-bar input[type=password]{border:1px solid #D1D5DB;border-radius:8px;padding:7px 10px;font-size:13px;background:#fff}",
    ".nps-bar select,.nps-bar input{width:auto!important;min-width:0;margin:0}",
    ".nps input[type=checkbox]{width:auto!important;margin:0}",
    ".nps-bar label{display:flex;gap:6px;align-items:center;font-size:13px;color:#374151}",
    ".nps-bar .sp{flex:1}",
    ".nps-upd{font-size:12px;color:#6B7280}",
    ".nps-btn{border:1px solid #D1D5DB;background:#fff;border-radius:8px;padding:7px 12px;font-size:13px;cursor:pointer}",
    ".nps-btn:hover{background:#F3F4F6}",
    ".nps-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px}",
    ".nps-card{background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:16px 18px}",
    ".nps-card h3{margin:0 0 12px;font-size:14px;font-weight:600}",
    ".nps-kpi-v{font-size:30px;font-weight:700;line-height:1.1}",
    ".nps-kpi-l{font-size:12px;color:#6B7280;margin-top:4px}",
    ".nps-split{display:flex;height:10px;border-radius:5px;overflow:hidden;background:#E5E7EB;margin-top:10px}",
    ".nps-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#4B5563;margin-top:8px}",
    ".nps-legend i{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:5px}",
    ".nps-table{width:100%;border-collapse:collapse;font-size:13px}",
    ".nps-table th{text-align:left;font-weight:600;color:#6B7280;font-size:12px;padding:6px 8px;border-bottom:1px solid #E5E7EB}",
    ".nps-table td{padding:8px;border-bottom:1px solid #F3F4F6}",
    ".nps-table th.n,.nps-table td.n{text-align:right;font-variant-numeric:tabular-nums}",
    ".nps-table tr.loc td{font-weight:600;background:#F9FAFB}",
    ".nps-table tr.br td:first-child{padding-left:26px;color:#374151}",
    ".nps-fun{display:grid;grid-template-columns:130px 1fr 90px;gap:8px;align-items:center;margin-bottom:8px;font-size:13px}",
    ".nps-fun .t{height:10px;background:#F3F4F6;border-radius:5px;overflow:hidden}",
    ".nps-fun .t b{display:block;height:100%;background:#3B82F6;border-radius:5px}",
    ".nps-fun .v{text-align:right;font-variant-numeric:tabular-nums;color:#374151}",
    ".nps-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;margin-bottom:18px}",
    ".nps-com{border:1px solid #E5E7EB;border-radius:10px;padding:12px 14px;margin-bottom:10px;background:#fff}",
    ".nps-com.low{border-left:4px solid " + BAD + "}",
    ".nps-com .h{display:flex;flex-wrap:wrap;gap:6px 12px;font-size:12px;color:#6B7280;margin-bottom:6px}",
    ".nps-com .s{display:flex;gap:8px;margin-bottom:6px;flex-wrap:wrap}",
    ".nps-chip{font-size:12px;font-weight:600;border-radius:6px;padding:2px 8px;background:#F3F4F6;color:#374151}",
    ".nps-chip.low{background:#FEE2E2;color:#991B1B}",
    ".nps-chip.hi{background:#D1FAE5;color:#065F46}",
    ".nps-why{font-size:13px;margin-top:4px}",
    ".nps-why span{color:#6B7280}",
    ".nps-empty{padding:28px;text-align:center;color:#6B7280}",
    ".nps-err{background:#FEF2F2;border:1px solid #FECACA;color:#991B1B;border-radius:10px;padding:12px 14px;margin-bottom:14px}",
    ".nps-login{max-width:420px;margin:30px auto;text-align:center}",
    ".nps-login input{width:100%;margin:10px 0}"
  ].join("\n");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function lsGet(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function num(v) { var n = Number(v); return v !== "" && v != null && isFinite(n) ? n : null; }
  function brandOf(car) {
    var s = String(car || "").trim().split(/\s+/)[0] || "";
    return s || "—";
  }
  function npsColor(v) { return v == null ? "#9CA3AF" : v >= 50 ? GOOD : v >= 0 ? MID : BAD; }
  function fmtNps(v) { return v == null ? "—" : (v > 0 ? "+" : "") + v; }
  function avg(a) {
    var x = a.filter(function (v) { return v != null; });
    return x.length ? Math.round(x.reduce(function (s, v) { return s + v; }, 0) / x.length * 10) / 10 : null;
  }

  function parse(data) {
    var idx = {};
    (data.headers || []).forEach(function (h, i) { idx[h] = i; });
    return (data.rows || []).map(function (r) {
      var o = {};
      Object.keys(idx).forEach(function (k) { o[k] = r[idx[k]]; });
      o.brand = brandOf(o.car);
      o.loc = String(o.branch || "").trim() || "Не указана";
      o.test = String(o.campaign) === "ТЕСТ";
      o.done = String(o.status) === "Завершён";
      o.s1 = num(o.q1); o.s2 = num(o.q2); o.s3 = num(o.q3);
      return o;
    });
  }

  function stat(list) {
    var done = list.filter(function (r) { return r.done && r.s3 != null; });
    var p = done.filter(function (r) { return r.s3 >= 9; }).length;
    var d = done.filter(function (r) { return r.s3 <= 6; }).length;
    var n = done.length;
    return {
      n: n, p: p, d: d, m: n - p - d,
      nps: n ? Math.round((p - d) / n * 100) : null,
      a1: avg(done.map(function (r) { return r.s1; })),
      a2: avg(done.map(function (r) { return r.s2; }))
    };
  }

  function mount(root, opts) {
    opts = opts || {};
    var getUrl = typeof opts.scriptUrl === "function" ? opts.scriptUrl : function () { return opts.scriptUrl || ""; };
    if (!document.getElementById("nps-css")) {
      var st = document.createElement("style"); st.id = "nps-css"; st.textContent = CSS; document.head.appendChild(st);
    }
    root.classList.add("nps");
    var S = { rows: null, err: "", loading: false, updated: "", f: { loc: "", brand: "", period: "all", tests: null, low: false }, more: 30, timer: null };

    function key() { return lsGet(KEY_STORE); }

    function load() {
      var url = getUrl(), k = key();
      if (!url) { S.err = "Не подключён адрес скрипта."; draw(); return; }
      if (!k) { draw(); return; }
      S.loading = true; S.err = ""; draw();
      fetch(url + "?action=npsSend&mode=data&key=" + encodeURIComponent(k))
        .then(function (r) { return r.text(); })
        .then(function (t) {
          var d; try { d = JSON.parse(t); } catch (e) { throw new Error("Сервер вернул не JSON"); }
          if (d.error) throw new Error(d.error === "forbidden" ? "Неверный ключ доступа" : d.error);
          S.rows = parse(d);
          var d0 = new Date();
          S.updated = ("0" + d0.getHours()).slice(-2) + ":" + ("0" + d0.getMinutes()).slice(-2);
          if (S.f.tests === null) S.f.tests = !S.rows.some(function (r) { return !r.test; });
        })
        .catch(function (e) { S.err = e.message || String(e); })
        .then(function () { S.loading = false; draw(); });
    }

    function filtered() {
      var f = S.f, from = "";
      if (f.period !== "all") {
        var d = new Date(Date.now() - Number(f.period) * 86400000);
        from = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
      }
      return S.rows.filter(function (r) {
        if (r.test && !f.tests) return false;
        if (f.loc && r.loc !== f.loc) return false;
        if (f.brand && r.brand.toLowerCase() !== f.brand.toLowerCase()) return false;
        if (from && String(r.sentAt).slice(0, 10) < from) return false;
        return true;
      });
    }

    function opt(v, cur, label) { return '<option value="' + esc(v) + '"' + (v === cur ? " selected" : "") + ">" + esc(label == null ? v : label) + "</option>"; }

    function controls() {
      var base = S.rows.filter(function (r) { return S.f.tests || !r.test; });
      var locs = [], brands = [];
      base.forEach(function (r) {
        if (locs.indexOf(r.loc) < 0) locs.push(r.loc);
        if (!brands.some(function (b) { return b.toLowerCase() === r.brand.toLowerCase(); })) brands.push(r.brand);
      });
      locs.sort(); brands.sort();
      return '<div class="nps-bar">' +
        '<select data-f="loc">' + opt("", S.f.loc, "Все локации") + locs.map(function (l) { return opt(l, S.f.loc); }).join("") + "</select>" +
        '<select data-f="brand">' + opt("", S.f.brand, "Все бренды") + brands.map(function (b) { return opt(b, S.f.brand); }).join("") + "</select>" +
        '<select data-f="period">' + opt("all", S.f.period, "За всё время") + opt("7", S.f.period, "7 дней") + opt("30", S.f.period, "30 дней") + opt("90", S.f.period, "90 дней") + "</select>" +
        '<label><input type="checkbox" data-f="tests"' + (S.f.tests ? " checked" : "") + "> Тестовые</label>" +
        '<span class="sp"></span>' +
        '<span class="nps-upd">' + (S.loading ? "Обновляется…" : "Обновлено " + esc(S.updated)) + "</span>" +
        '<button class="nps-btn" data-act="refresh">Обновить</button>' +
        '<button class="nps-btn" data-act="logout" title="Сменить ключ доступа">Ключ</button></div>';
    }

    function kpis(rows, st) {
      var split = st.n
        ? '<div class="nps-split"><i style="width:' + st.p / st.n * 100 + "%;background:" + GOOD + '"></i><i style="width:' + st.m / st.n * 100 + '%;background:#9CA3AF"></i><i style="width:' + st.d / st.n * 100 + "%;background:" + BAD + '"></i></div>' +
          '<div class="nps-legend"><span><i style="background:' + GOOD + '"></i>Сторонники 9–10: ' + st.p + '</span><span><i style="background:#9CA3AF"></i>Нейтральные 7–8: ' + st.m + '</span><span><i style="background:' + BAD + '"></i>Критики 1–6: ' + st.d + "</span></div>"
        : "";
      return '<div class="nps-grid">' +
        '<div class="nps-card" style="grid-column:span 2"><div class="nps-kpi-l" style="margin:0 0 4px">NPS (рекомендация дилерского центра)</div><div class="nps-kpi-v" style="color:' + npsColor(st.nps) + '">' + fmtNps(st.nps) + "</div>" + split + "</div>" +
        '<div class="nps-card"><div class="nps-kpi-v">' + st.n + '</div><div class="nps-kpi-l">Ответили</div></div>' +
        '<div class="nps-card"><div class="nps-kpi-v">' + (st.a1 == null ? "—" : st.a1) + '</div><div class="nps-kpi-l">Процесс покупки, из 10</div></div>' +
        '<div class="nps-card"><div class="nps-kpi-v">' + (st.a2 == null ? "—" : st.a2) + '</div><div class="nps-kpi-l">Работа персонала, из 10</div></div></div>';
    }

    function funnel(rows) {
      var sent = rows.length;
      var deliv = rows.filter(function (r) { return String(r.status) !== "Не доставлено"; }).length;
      var opened = rows.filter(function (r) { return r.openedAt || r.done; }).length;
      var done = rows.filter(function (r) { return r.done; }).length;
      var blocked = rows.filter(function (r) { return r.blockedAt || String(r.status) === "Заблокировал бота"; }).length;
      function line(l, v, base, color) {
        var p = base ? Math.round(v / base * 100) : 0;
        return '<div class="nps-fun"><span>' + l + '</span><div class="t"><b style="width:' + p + "%" + (color ? ";background:" + color : "") + '"></b></div><span class="v">' + v + " · " + p + "%</span></div>";
      }
      return '<div class="nps-card"><h3>Воронка опроса</h3>' +
        line("Отправлено", sent, sent) + line("Доставлено", deliv, sent) + line("Открыли", opened, deliv) +
        line("Ответили", done, deliv, GOOD) + line("Заблокировали", blocked, deliv, BAD) +
        '<div class="nps-kpi-l">Проценты открытия, ответа и блокировки — от доставленных.</div></div>';
    }

    function breakdown(rows) {
      var locs = {};
      rows.forEach(function (r) {
        var L = locs[r.loc] || (locs[r.loc] = { rows: [], br: {} });
        L.rows.push(r);
        var bk = r.brand.toLowerCase();
        (L.br[bk] || (L.br[bk] = { name: r.brand, rows: [] })).rows.push(r);
      });
      var names = Object.keys(locs).sort(function (a, b) { return stat(locs[b].rows).n - stat(locs[a].rows).n; });
      function tr(cls, name, st, sent) {
        return '<tr class="' + cls + '"><td>' + esc(name) + '</td><td class="n">' + sent + '</td><td class="n">' + st.n + '</td><td class="n" style="color:' + npsColor(st.nps) + ';font-weight:700">' + fmtNps(st.nps) +
          '</td><td class="n">' + (st.a1 == null ? "—" : st.a1) + '</td><td class="n">' + (st.a2 == null ? "—" : st.a2) + "</td></tr>";
      }
      var body = names.map(function (n) {
        var L = locs[n];
        var brs = Object.keys(L.br).sort(function (a, b) { return stat(L.br[b].rows).n - stat(L.br[a].rows).n; });
        return tr("loc", n, stat(L.rows), L.rows.length) + brs.map(function (b) { return tr("br", L.br[b].name, stat(L.br[b].rows), L.br[b].rows.length); }).join("");
      }).join("");
      return '<div class="nps-card"><h3>NPS по локациям и брендам</h3><div style="overflow-x:auto"><table class="nps-table"><thead><tr><th>Локация / бренд</th><th class="n">Отправлено</th><th class="n">Ответили</th><th class="n">NPS</th><th class="n">Покупка</th><th class="n">Персонал</th></tr></thead><tbody>' +
        (body || '<tr><td colspan="6" class="nps-empty">Нет данных</td></tr>') + "</tbody></table></div></div>";
    }

    function chip(label, v) {
      if (v == null) return "";
      return '<span class="nps-chip ' + (v < 9 ? "low" : "hi") + '">' + label + " " + v + "</span>";
    }

    function comments(rows) {
      var list = rows.filter(function (r) {
        if (!r.done) return false;
        if (S.f.low && !(r.s1 < 9 || r.s2 < 9 || r.s3 < 9)) return false;
        return r.q1why || r.q2why || r.q3why;
      });
      list.sort(function (a, b) {
        var ma = Math.min(a.s1 == null ? 10 : a.s1, a.s2 == null ? 10 : a.s2, a.s3 == null ? 10 : a.s3);
        var mb = Math.min(b.s1 == null ? 10 : b.s1, b.s2 == null ? 10 : b.s2, b.s3 == null ? 10 : b.s3);
        return ma - mb || String(b.completedAt).localeCompare(String(a.completedAt));
      });
      var shown = list.slice(0, S.more);
      var html = shown.map(function (r) {
        var low = r.s1 < 9 || r.s2 < 9 || r.s3 < 9;
        function why(l, t) { return t ? '<div class="nps-why"><span>' + l + ":</span> " + esc(t) + "</div>" : ""; }
        return '<div class="nps-com' + (low ? " low" : "") + '"><div class="h"><b>' + esc(r.name || "Клиент") + "</b><span>" + esc(r.loc) + "</span><span>" + esc(r.car || "") + "</span><span>" + esc(String(r.completedAt || "").slice(0, 16)) + "</span></div>" +
          '<div class="s">' + chip("Покупка", r.s1) + chip("Персонал", r.s2) + chip("Рекомендация", r.s3) + "</div>" +
          why("Покупка", r.q1why) + why("Персонал", r.q2why) + why("Рекомендация", r.q3why) + "</div>";
      }).join("");
      return '<div class="nps-card"><h3>Комментарии клиентов (' + list.length + ')</h3>' +
        '<label style="display:flex;gap:6px;align-items:center;font-size:13px;margin-bottom:12px"><input type="checkbox" data-f="low"' + (S.f.low ? " checked" : "") + "> Только оценки ниже 9</label>" +
        (html || '<div class="nps-empty">Комментариев нет</div>') +
        (list.length > shown.length ? '<button class="nps-btn" data-act="more">Показать ещё</button>' : "") + "</div>";
    }

    function draw() {
      if (!key()) {
        root.innerHTML = '<div class="nps-card nps-login"><h3>Ключ доступа к опросам</h3><div class="nps-kpi-l">Данные опросов защищены. Введите ключ один раз — он сохранится в этом браузере.</div>' +
          '<input type="password" id="nps-key" placeholder="Ключ доступа" style="border:1px solid #D1D5DB;border-radius:8px;padding:9px 12px;font-size:14px"><button class="nps-btn" data-act="login">Открыть</button></div>';
        return;
      }
      var html = "";
      if (S.err) html += '<div class="nps-err">' + esc(S.err) + ' <button class="nps-btn" data-act="refresh" style="margin-left:8px">Повторить</button></div>';
      if (S.rows) {
        var rows = filtered(), st = stat(rows);
        html += controls() + kpis(rows, st) + '<div class="nps-two">' + funnel(rows) + breakdown(rows) + "</div>" + comments(rows);
      } else if (!S.err) {
        html += '<div class="nps-empty">Загрузка…</div>';
      }
      root.innerHTML = html;
    }

    root.addEventListener("change", function (e) {
      var f = e.target.getAttribute && e.target.getAttribute("data-f");
      if (!f) return;
      S.f[f] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
      if (f === "loc" || f === "brand" || f === "period" || f === "tests") S.more = 30;
      draw();
    });
    root.addEventListener("click", function (e) {
      var a = e.target.getAttribute && e.target.getAttribute("data-act");
      if (!a) return;
      if (a === "refresh") load();
      if (a === "more") { S.more += 30; draw(); }
      if (a === "logout") { lsSet(KEY_STORE, ""); S.rows = null; draw(); }
      if (a === "login") {
        var v = (document.getElementById("nps-key") || {}).value || "";
        if (v.trim()) { lsSet(KEY_STORE, v.trim()); load(); }
      }
    });

    root.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && e.target.id === "nps-key") {
        var v = e.target.value || "";
        if (v.trim()) { lsSet(KEY_STORE, v.trim()); load(); }
      }
    });

    return {
      show: function () {
        load();
        if (S.timer) clearInterval(S.timer);
        S.timer = setInterval(function () { if (!document.hidden && root.offsetParent !== null) load(); }, REFRESH_MS);
      },
      hide: function () { if (S.timer) { clearInterval(S.timer); S.timer = null; } }
    };
  }

  window.NpsDash = { mount: mount };
})();
