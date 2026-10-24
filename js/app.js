/* 《诗经》吟诵 · 鸣鹿堂 —— 前端（纯静态，无依赖）
 * 路由：#/  |  #/poem/NNN/du|song|yin  |  #/search/<词>  |  #/about
 */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var qInput = document.getElementById('q');
  var form = document.getElementById('search-form');

  var TONE = {
    '1': { mark: 'ˉ', name: '阴平', ping: true },
    '2': { mark: 'ˊ', name: '阳平', ping: true },
    '3': { mark: 'ˇ', name: '上', ping: false },
    '4': { mark: 'ˋ', name: '去', ping: false },
    '!': { mark: '˙', name: '入', ping: false }
  };
  var TABS = [
    { key: 'du', label: '读', tip: '字上标汉语拼音' },
    { key: 'song', label: '诵', tip: '标四声，朱色为入声，青色为韵脚' },
    { key: 'yin', label: '吟', tip: '四声对五音，以字为谱' }
  ];

  var cache = { index: null, search: null, poems: {}, svgs: {} };

  // ---------------------------------------------------------------- 工具
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function getJSON(url) {
    return fetch(url, { cache: 'force-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }
  function getText(url) {
    return fetch(url, { cache: 'force-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.text();
    });
  }
  function pad(n) { return String(n); }

  // ---------------------------------------------------------------- 首页
  function renderHome() {
    getJSON('data/index.json').then(function (idx) {
      cache.index = idx;
      var h = [];
      h.push('<section class="hero">');
      h.push('<h1>詩 經 吟 誦</h1>');
      h.push('<p>宁波鄞州高级中学 · 鸣鹿堂</p>');
      h.push('<p class="rule">读 · 诵 · 吟　　〈风〉〈雅〉〈颂〉</p>');
      h.push('</section>');
      h.push('<section class="hero" style="border:0;padding:0 0 22px">');
      h.push('<p style="font-size:14px">全 ' + idx.count + ' 篇。点篇名入「读 / 诵 / 吟」三页。</p>');
      h.push('</section>');
      idx.tree.forEach(function (ch) {
        var total = 0;
        ch.sections.forEach(function (s) { total += s.poems.length; });
        h.push('<div class="chapter">');
        h.push('<div class="chapter-head"><h2>' + esc(ch.chapter) + '</h2><span>' + total + ' 篇</span></div>');
        ch.sections.forEach(function (s) {
          h.push('<div class="section"><div class="section-name">' + esc(s.section) + '</div><div class="poems">');
          s.poems.forEach(function (p) {
            h.push('<a class="poem-chip" href="#/poem/' + p.id + '/du">' + esc(p.title) +
              '<small>' + esc(p.first) + '</small></a>');
          });
          h.push('</div></div>');
        });
        h.push('</div>');
      });
      app.innerHTML = h.join('');
      document.title = '《诗经》吟诵 · 鸣鹿堂';
      window.scrollTo(0, 0);
    }).catch(fail);
  }

  // ---------------------------------------------------------------- 篇目
  function renderPoem(id, tab) {
    tab = tab || 'du';
    Promise.all([
      cache.poems[id] ? Promise.resolve(cache.poems[id]) : getJSON('data/poem/' + id + '.json'),
      cache.index ? Promise.resolve(cache.index) : getJSON('data/index.json')
    ]).then(function (res) {
      var poem = cache.poems[id] = res[0];
      cache.index = res[1];

      var h = [];
      h.push('<p class="crumb"><a href="#/">篇目</a> · ' + esc(poem.chapter) + ' · ' + esc(poem.section) + '</p>');
      h.push('<div class="poem-head"><h1>' + esc(poem.title) + '</h1>');
      h.push('<div class="meta">' + esc(poem.chapter) + ' · ' + esc(poem.section) + '　第 ' + poem.no + ' 篇</div></div>');
      h.push('<nav class="tabs">');
      TABS.forEach(function (t) {
        h.push('<a href="#/poem/' + id + '/' + t.key + '" class="' + (t.key === tab ? 'on' : '') +
          '" title="' + esc(t.tip) + '">' + t.label + '</a>');
      });
      h.push('</nav>');
      h.push('<div class="panel" id="panel">');

      if (tab === 'yin') {
        h.push('<div class="score-wrap" id="score">正在载入简谱……</div>');
        h.push('<div class="score-tools">' +
          '<a class="btn" href="data/score/' + id + '.svg" download="' + id + '.svg">下载 SVG</a>' +
          '<button class="btn" id="btn-print">打印 / 存 PDF</button></div>');
        h.push('<p class="hint">四声对五音（阴平商 · 阳平宫 · 入声角 · 上声徵 · 去声羽）；打谱以字为单位，平长仄短、入短韵长。</p>');
        h.push('</div>');
        h.push(prevNext(id));
        app.innerHTML = h.join('');
        document.title = poem.title + ' · 《诗经》吟诵';
        document.getElementById('btn-print').addEventListener('click', function () { window.print(); });
        loadScore(id);
        window.scrollTo(0, 0);
        return;
      }

      if (tab === 'song') {
        h.push('<div class="legend">' +
          '<span><i class="sw sw-ru"></i>朱色 = 入声字（短促、须收住）</span>' +
          '<span><i class="sw sw-rh"></i>青色 = 韵脚字</span>' +
          '<span>字上符号：ˉ 阴平　ˊ 阳平　ˇ 上声　ˋ 去声　˙ 入声</span>' +
          '</div>');
      }
      h.push('<div class="poem-body">');
      poem.lines.forEach(function (line) {
        h.push(renderLine(line, tab));
      });
      h.push('</div></div>');
      h.push(prevNext(id));
      app.innerHTML = h.join('');
      document.title = poem.title + ' · 《诗经》吟诵';
      window.scrollTo(0, 0);
    }).catch(fail);
  }

  function renderLine(line, tab) {
    var out = ['<span class="poem-line">'];
    var chars = line.chars, ci = 0;
    for (var i = 0; i < line.text.length; i++) {
      var ch = line.text[i];
      if (ci < chars.length && chars[ci].c === ch) {
        out.push(renderChar(chars[ci], tab));
        ci++;
      } else {
        out.push('<span class="punct">' + esc(ch) + '</span>');
      }
    }
    out.push('</span>');
    return out.join('');
  }

  function renderChar(c, tab) {
    var cls = 'ch';
    var top = '';
    if (tab === 'du') {
      var py = esc(c.pinyin || '');
      if (c.pinyin_alt) py += '<span class="alt">（' + esc(c.pinyin_alt) + '）</span>';
      top = '<span class="py">' + py + '</span>';
    } else if (tab === 'song') {
      var t = TONE[c.tone] || { mark: '?', name: '?' };
      if (c.rusheng) cls += ' ru';
      if (c.rhyme) cls += ' rh';
      top = '<span class="tn"><i>' + t.mark + '</i></span>';
    } else {
      top = '';
    }
    return '<span class="' + cls + '">' + top + '<span class="hz">' + esc(c.c) + '</span></span>';
  }

  function prevNext(id) {
    var flat = [];
    (cache.index ? cache.index.tree : []).forEach(function (ch) {
      ch.sections.forEach(function (s) {
        s.poems.forEach(function (p) { flat.push(p); });
      });
    });
    var k = flat.findIndex(function (p) { return p.id === id; });
    if (k < 0) return '';
    var h = ['<div class="score-tools" style="margin-top:26px">'];
    if (k > 0) h.push('<a class="btn" href="#/poem/' + flat[k - 1].id + '/du">← ' + esc(flat[k - 1].title) + '</a>');
    h.push('<a class="btn" href="#/">目 录</a>');
    if (k < flat.length - 1) h.push('<a class="btn" href="#/poem/' + flat[k + 1].id + '/du">' + esc(flat[k + 1].title) + ' →</a>');
    h.push('</div>');
    return h.join('');
  }

  // ---------------------------------------------------------------- 简谱
  function loadScore(id) {
    var into = document.getElementById('score');
    if (!into) return;
    var svg = cache.svgs[id];
    if (svg) { into.innerHTML = svg; return; }
    getText('data/score/' + id + '.svg').then(function (txt) {
      cache.svgs[id] = txt;
      var box = document.getElementById('score');
      if (box) box.innerHTML = txt;
    }).catch(function (e) {
      var box = document.getElementById('score');
      if (box) box.textContent = '简谱载入失败：' + e.message;
    });
  }

  // ---------------------------------------------------------------- 搜索
  function renderSearch(q) {
    q = (q || '').trim();
    if (!q) { location.hash = '#/'; return; }
    getJSON('data/search.json').then(function (list) {
      cache.search = list;
      var needle = q.toLowerCase();
      var hits = [];
      list.forEach(function (p) {
        var hay = (p.title + p.first + p.text + p.chapter + p.section).toLowerCase();
        var at = hay.indexOf(needle);
        if (at >= 0) hits.push({ p: p, at: at });
      });
      var h = ['<p class="crumb"><a href="#/">篇目</a> · 搜索</p>'];
      h.push('<div class="poem-head"><h1 style="font-size:24px;letter-spacing:2px">“' + esc(q) + '”</h1>');
      h.push('<div class="meta">共 ' + hits.length + ' 篇</div></div>');
      if (!hits.length) {
        h.push('<p class="empty">没有找到。试试只输入篇名两三个字，或国别、诗句片段。</p>');
      } else {
        h.push('<ul class="reslist">');
        hits.slice(0, 120).forEach(function (o) {
          var p = o.p;
          var snip = p.text.length > 44 ? p.text.slice(0, 44) + '…' : p.text;
          h.push('<li><a class="r-title" href="#/poem/' + p.id + '/du">' + esc(p.title) + '</a>' +
            '<span class="r-meta">' + esc(p.chapter) + ' · ' + esc(p.section) + '</span>' +
            '<div class="r-snip">' + esc(snip) + '</div></li>');
        });
        h.push('</ul>');
      }
      app.innerHTML = h.join('');
      document.title = '搜索：' + q;
      qInput.value = q;
      window.scrollTo(0, 0);
    }).catch(fail);
  }

  // ---------------------------------------------------------------- 说明
  function renderAbout() {
    app.innerHTML = [
      '<p class="crumb"><a href="#/">篇目</a> · 说明</p>',
      '<div class="prose">',
      '<h2>一、这是什么</h2>',
      '<p>本网站是宁波鄞州高级中学<b>鸣鹿堂</b>《诗经》吟诵社的读本：把《诗经》三百五篇逐字标上<b>读（普通话读音）</b>、<b>诵（四声与入声、韵脚）</b>、<b>吟（吟诵调的简谱）</b>三套信息，供社内同学对照练习，也供同好取用。</p>',
      '<h2>二、三页怎么看</h2>',
      '<h3>读</h3>',
      '<p>字上标普通话拼音。写的是通假字时，正音按本字读，后面用朱色小字附普通话音，例如「说怿女美」的「说」读 yuè（通「悦」），「女」读 rǔ（通「汝」）。</p>',
      '<h3>诵</h3>',
      '<p>字上标四声：<b>ˉ</b> 阴平、<b>ˊ</b> 阳平、<b>ˇ</b> 上声、<b>ˋ</b> 去声、<b>˙</b> 入声。<b>朱色</b>的是入声字，<b>青色</b>的是韵脚字。入声短促，韵脚要拖长，这是吟诵的长短骨架。</p>',
      '<h3>吟</h3>',
      '<p>依「四声对五音」把每字的声调换成音高，再依「平长仄短、入短韵长」定音长，写成通行简谱：</p>',
      '<table><tr><th>字调</th><th>五音</th><th>简谱</th><th>相对长短</th></tr>' +
      '<tr><td>阴平</td><td>商</td><td>2</td><td>平声 1 拍</td></tr>' +
      '<tr><td>阳平</td><td>宫</td><td>1</td><td>平声 1 拍</td></tr>' +
      '<tr><td>入声</td><td>角</td><td>3</td><td>入声 ¼ 拍（最短）</td></tr>' +
      '<tr><td>上声</td><td>徵</td><td>5</td><td>仄声 ½ 拍</td></tr>' +
      '<tr><td>去声</td><td>羽</td><td>6</td><td>仄声 ½ 拍</td></tr></table>',
      '<p>谱面记法：数字下横线为减时线（一条八分、两条十六分）；数字右侧短线为增时线（每条一拍）；数字右侧圆点为附点；上方弧线为延音线；数字下小圆点为低八度。四拍一小节，每个小句末字收在小节线上。</p>',
      '<h2>三、我们怎么做的（给接手的人）</h2>',
      '<ul>',
      '<li><b>字音</b>：以《诗经》三百篇逐字标注的声调表为底稿，逐行处理异读（如「王此大邦」的「王」读去声），不采宋人叶音改读。</li>',
      '<li><b>四声对五音</b>：本社口传标准，阴平→商、阳平→宫、入声→角、上声→徵、去声→羽。公开出版物未见与此完全相同的分配，故注明为堂内标准。</li>',
      '<li><b>平长仄短</b>：平声 1 拍，上、去声各 ½ 拍，入声 ¼ 拍，韵脚延长至 2 倍；为落在四拍小节上允许极小幅度加减。</li>',
      '<li><b>八度</b>：只有全篇开始数句里的 G（徵）、A（羽）用本调，其后出现的 G、A 一律低八度，使行腔沉而不飘。</li>',
      '<li><b>韵字</b>：按小句末字归韵组（广韵音韵地位为主、普通话韵母兜底）。这是<b>近似归类</b>，另附《校对表-韵字》请师傅教正。</li>',
      '</ul>',
      '<h2>四、技术说明</h2>',
      '<p>本站是纯静态页面，服务器上不需要安装任何程序，把整个目录拷到站点根目录即可用。数据在 <code>data/</code> 下，简谱是预先生成的 SVG。要改字音、改配色，见随附的《使用与维护说明》。</p>',
      '<h2>五、联系</h2>',
      '<p>宁波鄞州高级中学 鸣鹿堂　邮箱：<a href="mailto:2028049172@qq.com">2028049172@qq.com</a></p>',
      '</div>'
    ].join('');
    document.title = '说明 · 《诗经》吟诵';
    window.scrollTo(0, 0);
  }

  function fail(e) {
    app.innerHTML = '<p class="empty">载入失败：' + esc(e.message) +
      '<br>请确认 <code>data/</code> 目录与 index.html 在同一层。</p>';
  }

  // ---------------------------------------------------------------- 路由
  function route() {
    var hash = location.hash.replace(/^#\/?/, '');
    var parts = hash.split('/').filter(Boolean);
    if (!parts.length) { renderHome(); return; }
    if (parts[0] === 'poem' && parts[1]) {
      var id = parts[1].replace(/\D/g, '').padStart(3, '0');
      if (!parts[2]) { location.replace('#/poem/' + id + '/du'); return; }
      renderPoem(id, parts[2]);
      return;
    }
    if (parts[0] === 'search') { renderSearch(decodeURIComponent(parts.slice(1).join('/'))); return; }
    if (parts[0] === 'about') { renderAbout(); return; }
    renderHome();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = qInput.value.trim();
    if (!q) return;
    location.hash = '#/search/' + encodeURIComponent(q);
  });

  window.addEventListener('hashchange', route);
  route();
})();
