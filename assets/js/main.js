/* Junxian Display — 交互脚本
   纪律：页面内容不依赖 JS（AI 爬虫不执行 JS），这里只做增强。 */
(function () {
  'use strict';

  // 移动端导航
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // 产品下拉：移动端点箭头展开（桌面走 CSS hover/focus，不需要 JS）
  document.querySelectorAll('.menu-toggle').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var item = btn.closest('.nav-item');
      var open = item.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  // 产品图切换（2026-09-24 Jacken：鼠标移到缩略图上主图就跟着换，不用点；点击、键盘 Tab 聚焦同样生效）。
  // 缩略图与主图是同一张原图 URL，缩略图显示时原图已加载，切换是瞬时的。当前那张加 .is-active 高亮。
  try {
    var main = document.querySelector('.gallery .main img');
    if (main) {
      var thumbs = Array.prototype.slice.call(document.querySelectorAll('.gallery .thumbs img'));
      var show = function (t) {
        // 用 setAttribute 保持站内相对路径（写 main.src 会被浏览器改成绝对 URL，之后比较就永远不相等）
        if (main.getAttribute('src') !== t.getAttribute('src')) {
          main.setAttribute('src', t.getAttribute('src'));
          main.alt = t.alt;
        }
        thumbs.forEach(function (x) { x.classList.toggle('is-active', x === t); });
      };
      thumbs.forEach(function (t) {
        t.tabIndex = 0;
        t.addEventListener('mouseenter', function () { show(t); });
        t.addEventListener('click', function () { show(t); });
        t.addEventListener('focus', function () { show(t); });
        if (t.getAttribute('src') === main.getAttribute('src')) t.classList.add('is-active');
      });
    }
  } catch (e) {
    console.error('[junxian main.js] 产品图切换初始化失败', e);
  }

  // 列表页筛选（有 data-filter 时才启用）：文本框 + 若干 data-filter-facet 下拉联合过滤，
  // AND 关系（选了接口又选触摸 = 同时满足）。2026-08-21 从纯文本升级为多维，
  // facet 口径见 tools/build_listing.py 的 facet_values()。
  var filter = document.querySelector('[data-filter]');
  if (filter) {
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-tags]'));
    var facetSelects = Array.prototype.slice.call(document.querySelectorAll('[data-filter-facet]'));
    var applyFilter = function () {
      var q = filter.value.trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (c) {
        var hit = !q || c.getAttribute('data-tags').toLowerCase().indexOf(q) > -1;
        facetSelects.forEach(function (sel) {
          if (!sel.value) return;
          var key = sel.getAttribute('data-filter-facet');
          if (c.getAttribute('data-f-' + key) !== sel.value) hit = false;
        });
        c.style.display = hit ? '' : 'none';
        if (hit) shown++;
      });
      var counter = document.querySelector('[data-filter-count]');
      if (counter) counter.textContent = shown + ' of ' + cards.length + ' models';
    };
    filter.addEventListener('input', applyFilter);
    facetSelects.forEach(function (sel) { sel.addEventListener('change', applyFilter); });
  }

  // 首页参数选型器：行是服务端渲染的，这里只做显隐
  var selRows = document.querySelector('[data-sel-rows]');
  if (selRows) {
    var selects = Array.prototype.slice.call(document.querySelectorAll('[data-sel]'));
    var rows = Array.prototype.slice.call(selRows.querySelectorAll('tr'));
    var countEl = document.querySelector('[data-sel-count]');
    var emptyEl = document.querySelector('.sel-empty');
    var tableWrap = selRows.closest('.table-wrap');

    function applyFilter() {
      var want = {};
      selects.forEach(function (s) { want[s.getAttribute('data-sel')] = s.value; });
      var shown = 0;
      rows.forEach(function (tr) {
        var ok = true;
        if (want.inch && tr.getAttribute('data-inch') !== want.inch) ok = false;
        if (want.iface && (' ' + tr.getAttribute('data-iface') + ' ')
            .indexOf(' ' + want.iface + ' ') === -1) ok = false;
        if (want.touch && tr.getAttribute('data-touch') !== want.touch) ok = false;
        tr.style.display = ok ? '' : 'none';
        if (ok) shown++;
      });
      if (countEl) countEl.textContent = shown;
      if (emptyEl) emptyEl.hidden = shown !== 0;
      if (tableWrap) tableWrap.hidden = shown === 0;
    }

    selects.forEach(function (s) { s.addEventListener('change', applyFilter); });
    var reset = document.querySelector('[data-sel-reset]');
    if (reset) {
      reset.addEventListener('click', function () {
        selects.forEach(function (s) { s.value = ''; });
        applyFilter();
      });
    }
  }

  // ---- 转化事件埋点（GA4 未装时静默跳过，不报错） ----
  // 埋 5 个（BUILD-STANDARD MEAS 要求）：表单提交 / WhatsApp / mailto / tel / 滚动 75%
  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  document.addEventListener('submit', function (e) {
    if (e.target && e.target.classList.contains('form-card')) {
      track('generate_lead', { method: 'form', page_path: location.pathname });
    }
  }, true);

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (href.indexOf('wa.me') > -1) {
      track('contact_whatsapp', { link_location: a.classList.contains('wa-float') ? 'float' : 'inline',
                                  page_path: location.pathname });
    } else if (href.indexOf('mailto:') === 0) {
      track('contact_email', { page_path: location.pathname });
    } else if (href.indexOf('tel:') === 0) {
      track('contact_phone', { page_path: location.pathname });
    }
  }, true);

  var scrolled75 = false;
  window.addEventListener('scroll', function () {
    if (scrolled75) return;
    var h = document.documentElement;
    var pct = (h.scrollTop + window.innerHeight) / h.scrollHeight;
    if (pct >= 0.75) {
      scrolled75 = true;
      track('scroll_75', { page_path: location.pathname });
    }
  }, { passive: true });
})();

/* 报价页上下文透传（2026-09-09）：PDP 的 Request a quote 带 ?p=<slug> 过来，
   这里把该型号的缩略图 + 关键规格显示在表单上方，并往表单插一个隐藏字段，
   业务员收到询盘时能直接看出问的是哪一款。

   ⚠ 静态站没有 per-product 的报价页，只能前端读参数。所以：
   - 没有 ?p= 或索引取不到 → 容器保持 hidden，表单完全照常，不能因为这个功能挡住询盘
   - 索引是精简版 quote-index.json（25KB），不是 286KB 的 products.json
   - 缩略图复用 /assets/img/thumbs/（PDP_COVER 换过封面的会跟着变），缺图就只显示文字 */
(function () {
  'use strict';
  try {
    var box = document.querySelector('[data-quote-ctx]');
    if (!box) return;
    var slug = new URLSearchParams(location.search).get('p');
    if (!slug || !/^[a-z0-9-]{3,120}$/.test(slug)) return;   // 只认自家 slug 格式

    fetch('/assets/data/quote-index.json').then(function (r) {
      return r.ok ? r.json() : null;
    }).then(function (idx) {
      var p = idx && idx[slug];
      if (!p) return;

      var specs = [p.i ? p.i + '"' : '', p.r, p.f].filter(Boolean).join(' · ');
      var label = p.m || p.t || slug;

      var img = document.createElement('img');
      img.className = 'quote-ctx-img';
      img.src = '/assets/img/thumbs/' + slug + '.webp';
      img.alt = '';
      img.width = 96; img.height = 72;
      img.loading = 'lazy';
      img.onerror = function () { img.remove(); };   // 缺图就不占位，别留破图

      var body = document.createElement('div');
      var strong = document.createElement('strong');
      strong.textContent = 'Quoting: ' + label;
      body.appendChild(strong);
      if (specs) {
        var sp = document.createElement('span');
        sp.className = 'muted';
        sp.textContent = specs;
        body.appendChild(sp);
      }
      var back = document.createElement('a');
      back.href = '/products/' + slug + '.html';
      back.textContent = 'View the full specification';
      body.appendChild(back);

      box.appendChild(img);
      box.appendChild(body);
      box.hidden = false;

      // 隐藏字段：Formspree 会把它随询盘一起发出来
      var form = document.querySelector('.form-card');
      if (form && !form.querySelector('[name="Product"]')) {
        var h = document.createElement('input');
        h.type = 'hidden';
        h.name = 'Product';
        h.value = label + ' (' + slug + ')';
        form.appendChild(h);
      }
      // 需求框预填型号，买家不用自己抄
      var req = document.getElementById('f-spec');
      if (req && !req.value) req.value = label + (specs ? ' - ' + specs : '') + '\n';
    }).catch(function (e) {
      console.error('[junxian main.js] quote-ctx 加载失败', e);
    });
  } catch (e) {
    console.error('[junxian main.js] quote-ctx 初始化失败', e);
  }
})();

/* 拖拽上传（2026-09-09 感谢页第二步起用；2026-09-24 起询盘表单第一步也带一个，选填，
   标准 R10.3.2 已改为允许第一步放选填附件）。每页只有一个 [data-dropzone]。

   ⚠ 关键实现点：
   - 拖进来的文件要用 DataTransfer 写回 input.files，否则 <input type=file> 不认，
     表单提交时带不上（直接 append 到 FormData 也行，但那样就绕过了原生提交，
     Formspree 的 _next 重定向会失效）。
   - 校验只在客户端做提示，真正的限制在 Formspree 那边；这里拦掉明显超限的，
     省得买家传了半天被服务端拒。
   - 整段包在 try/catch 里：这是锦上添花的功能，出错不能让表单交不出去。 */
(function () {
  'use strict';
  try {
    var zone = document.querySelector('[data-dropzone]');
    if (!zone) return;
    var input = zone.querySelector('input[type="file"]');
    var list = zone.querySelector('[data-dz-list]');
    if (!input || !list) return;

    var MAX_BYTES = 10 * 1024 * 1024;   // 单文件 10MB
    var MAX_FILES = 6;

    function fmt(n) {
      return n < 1024 * 1024 ? Math.round(n / 1024) + ' KB'
                             : (n / 1024 / 1024).toFixed(1) + ' MB';
    }

    // 2026-09-24 Jacken：上传图片要出缩略图。图片用 objectURL 预览（每次重绘先释放上一批，免得内存泄漏）；
    // PDF/DWG/zip 等非图片显示扩展名小方块；HEIC 等浏览器画不出的图 onerror 时退回小方块。
    var previewUrls = [];

    function docBadge(f) {
      var b = document.createElement('span');
      b.className = 'dz-thumb dz-doc';
      var ext = (f.name.split('.').pop() || '').slice(0, 4).toUpperCase();
      b.textContent = ext && ext !== f.name.toUpperCase() ? ext : 'FILE';
      return b;
    }

    function thumb(f) {
      if (!/^image\//.test(f.type || '')) return docBadge(f);
      var img = document.createElement('img');
      img.className = 'dz-thumb';
      img.alt = '';
      var url = URL.createObjectURL(f);
      previewUrls.push(url);
      img.src = url;
      img.addEventListener('error', function () {
        if (img.parentNode) img.parentNode.replaceChild(docBadge(f), img);
      });
      return img;
    }

    function render() {
      previewUrls.forEach(function (u) { URL.revokeObjectURL(u); });
      previewUrls = [];
      list.textContent = '';
      var files = Array.prototype.slice.call(input.files || []);
      files.forEach(function (f, i) {
        var li = document.createElement('li');
        li.appendChild(thumb(f));
        var name = document.createElement('span');
        name.className = 'dz-name';
        name.textContent = f.name + ' · ' + fmt(f.size);
        if (f.size > MAX_BYTES) {
          name.className = 'over';
          name.textContent += ' — too large, please compress or send by email';
        }
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'dz-del';
        del.setAttribute('aria-label', 'Remove ' + f.name);
        del.textContent = '×';
        del.addEventListener('click', function () { remove(i); });
        li.appendChild(name);
        li.appendChild(del);
        list.appendChild(li);
      });
      zone.classList.toggle('has-files', files.length > 0);
    }

    function setFiles(files) {
      var dt = new DataTransfer();
      files.slice(0, MAX_FILES).forEach(function (f) { dt.items.add(f); });
      input.files = dt.files;
      render();
    }

    function remove(idx) {
      var files = Array.prototype.slice.call(input.files || []);
      files.splice(idx, 1);
      setFiles(files);
    }

    input.addEventListener('change', render);

    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        zone.classList.add('is-over');
      });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function (e) {
        e.preventDefault();
        if (ev === 'dragleave' && zone.contains(e.relatedTarget)) return;
        zone.classList.remove('is-over');
      });
    });
    zone.addEventListener('drop', function (e) {
      var dropped = Array.prototype.slice.call(e.dataTransfer.files || []);
      if (!dropped.length) return;
      var existing = Array.prototype.slice.call(input.files || []);
      setFiles(existing.concat(dropped));
    });
  } catch (e) {
    console.error('[junxian main.js] dropzone 初始化失败', e);
  }
})();

/* products/ 目录页：多值 facet + 重置 + 分批显示（2026-09-09）。

   为什么不改上面那段通用筛选、而是在这里加一段：
   通用那段是「下拉值 === 卡片属性值」的精确匹配，首页选型器还在用它。
   目录页的 Feature 是**多值**（一款可能同时高亮 + 宽温，属性里是空格分隔的列表），
   得按包含匹配；再加上分批显示与空结果提示，逻辑差得够多，分开写比塞进去清楚。 */
(function () {
  'use strict';
  try {
    var grid = document.querySelector('[data-filter-grid]');
    if (!grid) return;

    var STEP = 24;                    // 首屏渲染 24 张，其余点开
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.p-card'));
    var search = document.querySelector('[data-filter]');
    var selects = Array.prototype.slice.call(document.querySelectorAll('[data-filter-facet]'));
    var reset = document.querySelector('[data-filter-reset]');
    var moreWrap = document.querySelector('.catalog-more');
    var moreBtn = document.querySelector('[data-filter-more]');
    var empty = document.querySelector('[data-filter-empty]');
    var counter = document.querySelector('[data-filter-count]');
    var limit = STEP;

    function matches(c) {
      var q = search ? search.value.trim().toLowerCase() : '';
      if (q && (c.getAttribute('data-tags') || '').toLowerCase().indexOf(q) === -1) return false;
      for (var i = 0; i < selects.length; i++) {
        var sel = selects[i];
        if (!sel.value) continue;
        var key = sel.getAttribute('data-filter-facet');
        var val = c.getAttribute('data-f-' + key) || '';
        if (sel.hasAttribute('data-facet-multi')) {
          // 多值：属性是空格分隔的列表，按词匹配（不能用 indexOf，'touch' 会命中别的词）
          if (val.split(/\s+/).indexOf(sel.value) === -1) return false;
        } else if (val !== sel.value) {
          return false;
        }
      }
      return true;
    }

    function apply() {
      var hits = 0, shown = 0;
      cards.forEach(function (c) {
        if (matches(c)) {
          hits++;
          // 命中的卡片里，只显示前 limit 张 —— 筛选本身永远全量参与，
          // 分批只影响显示，不会出现"筛完发现漏了后面的"
          c.hidden = shown >= limit;
          if (!c.hidden) shown++;
        } else {
          c.hidden = true;
        }
      });
      if (counter) {
        counter.textContent = hits === cards.length
          ? cards.length + ' models'
          : hits + ' of ' + cards.length + ' models';
      }
      if (moreWrap) moreWrap.hidden = hits <= shown;
      if (empty) empty.hidden = hits > 0;
    }

    function onFilterChange() { limit = STEP; apply(); }

    if (search) search.addEventListener('input', onFilterChange);
    selects.forEach(function (s) { s.addEventListener('change', onFilterChange); });
    if (moreBtn) moreBtn.addEventListener('click', function () {
      limit += STEP;
      apply();
      // 展开后把焦点留在按钮上，键盘用户不会被甩回页首
      if (moreWrap && !moreWrap.hidden) moreBtn.focus();
    });
    if (reset) reset.addEventListener('click', function () {
      if (search) search.value = '';
      selects.forEach(function (s) { s.value = ''; });
      onFilterChange();
      if (search) search.focus();
    });

    // 移动端筛选栏折叠
    var toggle = document.querySelector('[data-catalog-toggle]');
    var side = document.querySelector('.catalog-side');
    if (toggle && side) toggle.addEventListener('click', function () {
      var open = side.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    apply();
  } catch (e) {
    console.error('[junxian main.js] catalog 筛选初始化失败', e);
  }
})();
