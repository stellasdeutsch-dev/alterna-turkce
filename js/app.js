/* =========================================================
   ALTERNA · гайд из Вены — интерактив и анимации
   ========================================================= */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------------------------------------------------------
     1. Подготовка заголовков: слова и маски
     --------------------------------------------------------- */
  $$('[data-words]').forEach(function (el) {
    var words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span');
      s.className = 'w';
      s.textContent = w;
      s.style.transitionDelay = (i * 70) + 'ms';
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  $$('.mask').forEach(function (el) {
    el.classList.add('msk');
    $$('span', el).forEach(function (sp, i) {
      var inner = document.createElement('i');
      inner.style.fontStyle = 'normal';
      inner.innerHTML = sp.innerHTML;
      sp.innerHTML = '';
      sp.appendChild(inner);
      sp.style.setProperty('--d', (i * 110) + 'ms');
    });
  });

  /* ---------------------------------------------------------
     2. Общий обсервер появления
     --------------------------------------------------------- */
  function activate(el) {
    if (!el || el.__done) return;
    el.__done = true;
    el.classList.add('in');
    io.unobserve(el);
    if (el.__onIn) el.__onIn();
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) activate(e.target); });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });

  $$('.reveal, .mask, .words').forEach(function (el) { io.observe(el); });

  function onEnter(el, fn) {
    if (!el) return;
    el.__onIn = fn;
    if (el.__done) fn();
    else io.observe(el);
  }

  /* Подстраховка: в фоновой вкладке IntersectionObserver может не сработать,
     и первый экран остался бы невидимым. Показываем всё, что уже во вьюпорте. */
  function revealVisible() {
    $$('.reveal, .mask, .words').forEach(function (el) {
      if (el.__done) return;
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) activate(el);
    });
  }
  requestAnimationFrame(revealVisible);
  setTimeout(revealVisible, 800);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) revealVisible();
  });
  window.addEventListener('pageshow', revealVisible);

  /* ---------------------------------------------------------
     3. Прогресс чтения + стики-CTA
     --------------------------------------------------------- */
  var fill = $('#progressFill'), pill = $('#readPill'), pct = $('#readPct'),
      bar = $('.progress'), sticky = $('#sticky'), hero = $('.hero');

  function onScroll() {
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? clamp(window.scrollY / h, 0, 1) : 0;
    fill.style.width = (p * 100) + '%';
    bar.setAttribute('aria-valuenow', Math.round(p * 100));
    pct.textContent = Math.round(p * 100);
    pill.classList.toggle('on', window.scrollY > 500);
    if (sticky) sticky.classList.toggle('on', window.scrollY > (hero ? hero.offsetHeight : 700));
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------------------------------------------------------
     4. Курсор + магнитные кнопки (десктоп)
     --------------------------------------------------------- */
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  if (fine && !RM) {
    var cur = $('#cursor'), cx = 0, cy = 0, tx = 0, ty = 0;
    document.addEventListener('mousemove', function (e) { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      cx = lerp(cx, tx, 0.22); cy = lerp(cy, ty, 0.22);
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(loop);
    })();
    $$('a,button,.fan__card,.pola').forEach(function (el) {
      el.addEventListener('mouseenter', function () { cur.classList.add('big'); });
      el.addEventListener('mouseleave', function () { cur.classList.remove('big'); });
    });

    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------
     5. Самрисующаяся линия + параллакс стикеров
     --------------------------------------------------------- */
  var sq = $('#squiggle path');
  if (sq) {
    var len = sq.getTotalLength();
    sq.style.strokeDasharray = len;
    sq.style.strokeDashoffset = RM ? 0 : len;
  }
  var stks = $$('.stk');
  var heroH = hero ? hero.offsetHeight : 800;

  function heroParallax() {
    var y = window.scrollY;
    if (sq && !RM) {
      var p = clamp(y / (heroH * 0.6), 0, 1);
      sq.style.strokeDashoffset = len * (1 - p);
    }
    if (!RM && y < heroH * 1.3) {
      stks.forEach(function (s) {
        var f = parseFloat(s.dataset.par) || 0.1;
        s.style.transform = 'translateY(' + (-y * f) + 'px) rotate(' + (y * f * 0.4) + 'deg)';
      });
    }
  }
  window.addEventListener('scroll', heroParallax, { passive: true });
  if (sq && !RM) { requestAnimationFrame(function () { sq.style.transition = 'stroke-dashoffset .1s linear'; }); }
  heroParallax();

  /* ---------------------------------------------------------
     6. Веер карточек (Pallet-Ross style)
     --------------------------------------------------------- */
  (function fanDeck() {
    var deck = $('#fanDeck');
    if (!deck) return;
    var cards = $$('.fan__card', deck);
    var n = cards.length;
    // ярлыки только у крайних и центральной — иначе они перекрывают друг друга в веере
    [0, Math.floor(n / 2), n - 1].forEach(function (i) {
      if (cards[i]) cards[i].classList.add('tag-show');
    });
    var drag = 0, dragging = false, startX = 0, startDrag = 0, prog = 0;

    function paint() {
      var spread = 6.6 * prog;
      cards.forEach(function (c, i) {
        var mid = (n - 1) / 2;
        var a = (i - mid) * spread + drag * 0.06;
        var lift = Math.abs(i - mid) * (1 - prog) * 6;
        c.style.transform = 'translate(-50%,' + lift + 'px) rotate(' + a + 'deg)';
        c.style.zIndex = String(100 - Math.abs(Math.round(i - mid)));
      });
    }

    function scrollProg() {
      var r = deck.getBoundingClientRect();
      var vh = window.innerHeight;
      prog = clamp(1 - (r.top - vh * 0.28) / (vh * 0.62), 0, 1);
      if (RM) prog = 1;
      paint();
      if (prog > 0.35) {
        cards.forEach(function (c, i) {
          setTimeout(function () { c.classList.add('tagon'); }, i * 70);
        });
      }
    }
    window.addEventListener('scroll', scrollProg, { passive: true });
    window.addEventListener('resize', scrollProg);
    scrollProg();

    deck.addEventListener('pointerdown', function (e) {
      dragging = true; startX = e.clientX; startDrag = drag;
      deck.setPointerCapture(e.pointerId);
    });
    deck.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      drag = clamp(startDrag + (e.clientX - startX), -220, 220);
      paint();
    });
    ['pointerup', 'pointercancel'].forEach(function (ev) {
      deck.addEventListener(ev, function () {
        dragging = false;
        var t0 = performance.now(), from = drag;
        (function back(t) {
          var k = clamp((t - t0) / 700, 0, 1);
          drag = from * (1 - (1 - Math.pow(1 - k, 3)));
          paint();
          if (k < 1) requestAnimationFrame(back);
        })(t0);
      });
    });
  })();

  /* ---------------------------------------------------------
     7. Диаграмма-бары (глава 1)
     --------------------------------------------------------- */
  onEnter($('#bars'), function () {
    $$('.bar', $('#bars')).forEach(function (b, i) {
      var v = +b.dataset.val;
      setTimeout(function () {
        $('.bar__fill', b).style.width = v + '%';
        var num = $('.bar__num', b), t0 = performance.now();
        (function tick(t) {
          var k = clamp((t - t0) / 1300, 0, 1);
          num.textContent = Math.round(v * (1 - Math.pow(1 - k, 3))) + '%';
          if (k < 1) requestAnimationFrame(tick);
        })(t0);
      }, i * 140);
    });
  });

  /* ---------------------------------------------------------
     8. Поезд-конструктор (глава 2)
     --------------------------------------------------------- */
  (function train() {
    var word = $('#trainWord'), tr = $('#trainTr'), note = $('#trainNote'), box = $('#trainCars');
    if (!box) return;
    var cars = $$('.car:not(.car--loco)', box);
    var step = 0;

    function markNext() {
      cars.forEach(function (c, i) { c.classList.toggle('is-next', i === step); });
    }
    markNext();

    cars.forEach(function (c, i) {
      c.addEventListener('click', function () {
        if (i !== step) {
          note.textContent = 'Не по порядку. Вагоны цепляются только слева направо — в этом и есть правило.';
          c.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' },
                     { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 260 });
          return;
        }
        c.classList.add('is-on');
        var sfx = document.createElement('span');
        sfx.className = 'nw';
        sfx.textContent = c.dataset.sfx;
        word.appendChild(sfx);
        tr.textContent = c.dataset.tr;
        note.textContent = 'Прицепили вагон «' + c.dataset.note + '». Слово стало длиннее, смысл — точнее.';
        step++;
        markNext();
        if (step === cars.length) {
          note.textContent = 'Одно слово. Пять смыслов. В русском на это ушло бы предложение из пяти слов.';
        }
      });
    });
  })();

  /* ---------------------------------------------------------
     9. Порядок слов SOV (глава 3)
     --------------------------------------------------------- */
  (function sov() {
    var row = $('#sovRow'), ru = $('#sovRu'), fixBtn = $('#sovFix'),
        nextBtn = $('#sovNext'), verdict = $('#sovVerdict');
    if (!row) return;

    var data = [
      { t: ['Ben', 'istiyorum', 'çay'], v: 1, ru: 'Я хочу чай' },
      { t: ['Ben', 'okuyorum', 'kitap'], v: 1, ru: 'Я читаю книгу' },
      { t: ['O', 'gidiyor', 'eve'], v: 1, ru: 'Он идёт домой' },
      { t: ['Biz', 'içiyoruz', 'kahve'], v: 1, ru: 'Мы пьём кофе' }
    ];
    var idx = 0, fixed = false;

    function render() {
      var d = data[idx];
      row.innerHTML = '';
      d.t.forEach(function (w, i) {
        var s = document.createElement('span');
        s.className = 'tok' + (i === d.v ? ' tok--v' : '');
        s.textContent = w;
        s.dataset.k = String(i);
        row.appendChild(s);
      });
      ru.textContent = d.ru;
      fixed = false;
      fixBtn.disabled = false;
      fixBtn.textContent = 'Отправить глагол в конец';
      verdict.className = 'sov__verdict';
      verdict.textContent = 'Розовым подсвечен глагол. Он стоит там, где его поставил бы русскоязычный.';
    }

    fixBtn.addEventListener('click', function () {
      if (fixed) return;
      fixed = true;
      fixBtn.disabled = true;
      var toks = $$('.tok', row);
      var first = toks.map(function (t) { return t.getBoundingClientRect(); });

      var verb = toks[data[idx].v];
      row.appendChild(verb);

      var toks2 = $$('.tok', row);
      toks2.forEach(function (t) {
        var i = +t.dataset.k;
        var last = t.getBoundingClientRect();
        var dx = first[i].left - last.left;
        if (!RM && Math.abs(dx) > 1) {
          t.animate([{ transform: 'translateX(' + dx + 'px)' }, { transform: 'translateX(0)' }],
            { duration: 620, easing: 'cubic-bezier(.22,.9,.28,1)' });
        }
      });
      verb.classList.remove('tok--v');
      verb.classList.add('tok--ok');
      verdict.className = 'sov__verdict ok';
      verdict.textContent = 'Вот так. Теперь предложение закончено — глагол прозвучал последним.';
    });

    nextBtn.addEventListener('click', function () { idx = (idx + 1) % data.length; render(); });
    render();
  })();

  /* ---------------------------------------------------------
     10. Немецкий vs турецкий (глава 4)
     --------------------------------------------------------- */
  onEnter($('#deGrid'), function () {
    var g = $('#deGrid');
    g.classList.add('on');
    $$('span', g).forEach(function (s, i) { s.style.transitionDelay = (i * 55) + 'ms'; });
    var c = $('#deCount'), t0 = performance.now();
    (function tick(t) {
      var k = clamp((t - t0) / 1400, 0, 1);
      c.textContent = Math.round(12 * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  });

  /* ---------------------------------------------------------
     11. Игра «поймай окончание» (глава 5)
     --------------------------------------------------------- */
  (function game() {
    var field = $('#gameField'), startBox = $('#gameStart'), goBtn = $('#gameGo'),
        msg = $('#gameMsg'), bg = $('#gameScore');
    if (!field) return;
    var sEl = $('#gScore'), stEl = $('#gStreak'), lvEl = $('#gLives');
    var pads = $$('.pad');

    var WORDS = [
      ['ev', 'ler'], ['kitap', 'lar'], ['göz', 'ler'], ['yol', 'lar'],
      ['gün', 'ler'], ['kız', 'lar'], ['okul', 'lar'], ['şehir', 'ler'],
      ['araba', 'lar'], ['deniz', 'ler'], ['köy', 'ler'], ['kuş', 'lar'],
      ['dil', 'ler'], ['masa', 'lar'], ['öğretmen', 'ler'], ['çocuk', 'lar'],
      ['ülke', 'ler'], ['soru', 'lar'], ['ağaç', 'lar'], ['güneş', 'ler']
    ];

    var running = false, score = 0, streak = 0, lives = 3;
    var cur = null, y = 0, speed = 1.05, raf = 0, answered = false;

    function pick() {
      var w = WORDS[Math.floor(Math.random() * WORDS.length)];
      var el = document.createElement('div');
      el.className = 'gword';
      el.textContent = w[0];
      field.appendChild(el);
      cur = { el: el, ans: w[1], word: w[0] };
      y = -46;
      answered = false;
    }

    function resolve(ok) {
      if (!cur || answered) return;
      answered = true;
      cur.el.classList.add(ok ? 'hit' : 'miss');
      if (ok) {
        score += 10 + streak * 2;
        streak++;
        msg.textContent = cur.word + ' → ' + cur.word + cur.ans + '. Верно.';
        msg.style.color = '#7ee2a4';
      } else {
        streak = 0;
        lives--;
        msg.textContent = 'Было ' + cur.word + ' → ' + cur.word + cur.ans + '. Смотри на последнюю гласную.';
        msg.style.color = '#ff8f8f';
      }
      sEl.textContent = score; stEl.textContent = streak; lvEl.textContent = Math.max(lives, 0);
      bg.textContent = score;
      var dead = cur.el;
      setTimeout(function () { if (dead.parentNode) dead.parentNode.removeChild(dead); }, 340);
      cur = null;
      if (lives <= 0) return stop();
      speed = 1.05 + Math.min(score / 260, 1.5);
      setTimeout(function () { if (running) pick(); }, 380);
    }

    function frame() {
      if (!running) return;
      if (cur && !answered) {
        y += speed;
        cur.el.style.top = y + 'px';
        if (y > field.clientHeight - 6) resolve(false);
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      running = true; score = 0; streak = 0; lives = 3; speed = 1.05;
      sEl.textContent = '0'; stEl.textContent = '0'; lvEl.textContent = '3'; bg.textContent = '0';
      msg.textContent = 'Поехали. Передние гласные (e i ö ü) → -ler. Задние (a ı o u) → -lar.';
      msg.style.color = '';
      startBox.style.display = 'none';
      pads.forEach(function (p) { p.disabled = false; });
      pick();
      cancelAnimationFrame(raf);
      frame();
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      pads.forEach(function (p) { p.disabled = true; });
      $$('.gword', field).forEach(function (g) { g.remove(); });
      startBox.style.display = '';
      startBox.innerHTML = '<p>Набрано <b>' + score + '</b> очков. Правило одно, и оно ни разу не поменялось.</p>' +
        '<button class="btn btn--pink" id="gameGo2">Ещё раз</button>';
      $('#gameGo2').addEventListener('click', start);
    }

    pads.forEach(function (p) {
      p.addEventListener('click', function () {
        if (!running || !cur) return;
        resolve(p.dataset.ans === cur.ans);
      });
    });
    goBtn.addEventListener('click', start);
  })();

  /* ---------------------------------------------------------
     12. Счётчики «что внутри»
     --------------------------------------------------------- */
  $$('.ncard').forEach(function (card) {
    onEnter(card, function () {
      var target = +card.dataset.num, max = +card.dataset.max;
      var out = $('.ncard__n', card), t0 = performance.now();
      (function tick(t) {
        var k = clamp((t - t0) / 1500, 0, 1);
        out.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))).toLocaleString('ru-RU');
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
      var pctW = Math.max((target / max) * 100, 6);
      setTimeout(function () { $('.ncard__bar i', card).style.width = pctW + '%'; }, 120);
    });
  });

  /* ---------------------------------------------------------
     12b. Кольцевая диаграмма состава
     --------------------------------------------------------- */
  (function donut() {
    var wrap = $('#donut');
    if (!wrap) return;
    var segsEl = $('#donutSegs'), legEl = $('#donutLegend'), totalEl = $('#donutTotal');

    var DATA = [
      { n: 1716, t: 'материалов по уровням', c: '#ed3482' },
      { n: 131, t: 'блоков лексики', c: '#f9569b' },
      { n: 128, t: 'гайдов по грамматике', c: '#ff9dc5' },
      { n: 109, t: 'интерактивных ресурсов', c: '#ad8e7f' },
      { n: 36, t: 'гайдов по работе', c: '#c8b3a7' },
      { n: 32, t: 'блока по экзаменам', c: '#8b8b8b' }
    ];
    var total = DATA.reduce(function (a, d) { return a + d.n; }, 0);
    var R = 54, C = 2 * Math.PI * R;

    var NS = 'http://www.w3.org/2000/svg';
    var acc = 0;
    DATA.forEach(function (d) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', 70); c.setAttribute('cy', 70); c.setAttribute('r', R);
      c.setAttribute('stroke', d.c);
      c.setAttribute('stroke-dasharray', '0 ' + C);
      c.setAttribute('stroke-dashoffset', String(-acc));
      d.__el = c; d.__off = acc;
      acc += (d.n / total) * C;
      segsEl.appendChild(c);

      var li = document.createElement('li');
      li.innerHTML = '<i style="background:' + d.c + '"></i>' + d.t + '<b>' + d.n.toLocaleString('ru-RU') + '</b>';
      legEl.appendChild(li);
    });

    onEnter(wrap, function () {
      DATA.forEach(function (d, i) {
        setTimeout(function () {
          d.__el.setAttribute('stroke-dasharray', ((d.n / total) * C) + ' ' + C);
        }, 120 + i * 130);
      });
      var t0 = performance.now();
      (function tick(t) {
        var k = clamp((t - t0) / 1600, 0, 1);
        totalEl.textContent = Math.round(total * (1 - Math.pow(1 - k, 3))).toLocaleString('ru-RU');
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
  })();

  /* ---------------------------------------------------------
     13. Дорожка уровней
     --------------------------------------------------------- */
  onEnter($('#roadLine'), function () {
    var line = $('#roadLine'), pts = $$('.rpt', line);
    var wide = window.matchMedia('(min-width:700px)').matches;
    var f = $('.road__fill', line);
    setTimeout(function () {
      if (wide) f.style.width = '100%'; else f.style.height = '100%';
    }, 80);
    pts.forEach(function (p, i) { setTimeout(function () { p.classList.add('on'); }, 260 + i * 260); });
  });

  /* ---------------------------------------------------------
     14. Демо-видео
     --------------------------------------------------------- */
  (function demo() {
    var v = $('#demoVid'), play = $('#demoPlay'), tabs = $$('.dtab');
    if (!v) return;
    var cur = tabs[0];

    function load(tab, autoplay) {
      tabs.forEach(function (t) { t.classList.toggle('is-on', t === tab); });
      cur = tab;
      v.poster = tab.dataset.poster;
      v.src = tab.dataset.src;
      v.load();
      if (autoplay) {
        var pr = v.play();
        if (pr && pr.catch) pr.catch(function () { play.classList.remove('off'); });
        play.classList.add('off');
      } else {
        play.classList.remove('off');
      }
    }

    play.addEventListener('click', function () {
      if (!v.src) load(cur, true);
      else { v.play(); play.classList.add('off'); }
    });
    v.addEventListener('pause', function () { play.classList.remove('off'); });
    v.addEventListener('click', function () { if (!v.paused) v.pause(); });
    tabs.forEach(function (t) { t.addEventListener('click', function () { load(t, true); }); });
  })();

  /* ---------------------------------------------------------
     15. Квиз
     --------------------------------------------------------- */
  (function quiz() {
    var box = $('#qbox'), qEl = $('#qQ'), optsEl = $('#qOpts'), fbEl = $('#qFb'),
        stepEl = $('#qStep'), barEl = $('#qBar'), res = $('#qRes'),
        scoreEl = $('#qScore'), txtEl = $('#qTxt'), again = $('#qAgain');
    if (!box) return;

    var Q = [
      {
        q: 'göz — это «глаз». Как будет «глаза»?',
        a: ['gözler', 'gözlar', 'gözlör'],
        ok: 0,
        fb: 'Последняя гласная — ö, она из переднего лагеря. Значит -ler. Никаких исключений.'
      },
      {
        q: 'Ben çay ... . Куда в турецком уходит глагол?',
        a: ['В начало предложения', 'В середину, как в русском', 'В самый конец'],
        ok: 2,
        fb: 'В конец. Всегда. Пока глагол не прозвучал, предложение для турка не закончилось.'
      },
      {
        q: 'Сколько родов у турецких существительных?',
        a: ['Три, как в русском', 'Два', 'Ноль'],
        ok: 2,
        fb: 'Ноль. И артиклей тоже ноль. «O güzel» работает для него, для неё и для оно.'
      }
    ];

    var i = 0, score = 0;

    function render() {
      var q = Q[i];
      stepEl.textContent = String(i + 1);
      barEl.style.width = (((i) / Q.length) * 100 + 33) + '%';
      qEl.textContent = q.q;
      fbEl.textContent = '';
      optsEl.innerHTML = '';
      q.a.forEach(function (a, k) {
        var b = document.createElement('button');
        b.className = 'qopt';
        b.textContent = a;
        b.addEventListener('click', function () { answer(k, b); });
        optsEl.appendChild(b);
      });
    }

    function answer(k, btn) {
      var q = Q[i];
      $$('.qopt', optsEl).forEach(function (b, n) {
        b.disabled = true;
        if (n === q.ok) b.classList.add('ok');
      });
      if (k !== q.ok) btn.classList.add('no'); else score++;
      fbEl.textContent = q.fb;
      setTimeout(function () {
        i++;
        if (i < Q.length) render(); else finish();
      }, 1500);
    }

    function finish() {
      box.hidden = true;
      res.hidden = false;
      scoreEl.textContent = String(score);
      txtEl.textContent = score === 3
        ? 'Три правила из этого гайда — и ты применил их, не открывая ни одной таблицы. Так устроена вся папка: правило, пример, практика.'
        : score === 2
        ? 'Два из трёх с первого прочтения — это нормально. Правила закрепляются на практике, а не на чтении. Практика лежит в папке.'
        : 'Не страшно. Гайд читается за двенадцать минут, а правил всего пять. Перечитай главу — они короткие.';
      res.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
    }

    again.addEventListener('click', function () {
      i = 0; score = 0; res.hidden = true; box.hidden = false; render();
    });
    render();
  })();

  /* ---------------------------------------------------------
     16. Физика в футере (MoMoney style)
     --------------------------------------------------------- */
  (function footPhysics() {
    var cv = $('#footCanvas'), foot = $('.foot');
    if (!cv || RM) return;
    var started = false;

    var obs = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting && !started) { started = true; obs.disconnect(); boot(); }
    }, { rootMargin: '200px' });
    obs.observe(foot);

    function boot() {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js';
      s.crossOrigin = 'anonymous';
      s.onload = run;
      s.onerror = function () { /* без физики — просто пустой фон */ };
      document.head.appendChild(s);
    }

    function run() {
      var M = window.Matter;
      if (!M) return;
      var W = foot.clientWidth, H = foot.clientHeight;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = W * dpr; cv.height = H * dpr;
      var ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);

      var engine = M.Engine.create();
      engine.gravity.y = 0.85;
      var world = engine.world;

      var wallOpt = { isStatic: true, restitution: 0.4 };
      var walls = [
        M.Bodies.rectangle(W / 2, H + 30, W + 200, 60, wallOpt),
        M.Bodies.rectangle(-30, H / 2, 60, H * 2, wallOpt),
        M.Bodies.rectangle(W + 30, H / 2, 60, H * 2, wallOpt)
      ];
      M.Composite.add(world, walls);

      var TOKENS = ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü', '-lar', '-ler', 'A1', 'B2', 'C1', 'ev', 'o', '$30'];
      var PINK = ['#ed3482', '#f9569b'];
      var bodies = [];
      var count = W < 620 ? 16 : 26;

      for (var i = 0; i < count; i++) {
        (function (i) {
          setTimeout(function () {
            var txt = TOKENS[i % TOKENS.length];
            var r = txt.length > 2 ? 30 : 24;
            var b = M.Bodies.circle(40 + Math.random() * (W - 80), -80 - Math.random() * 300, r, {
              restitution: 0.52, friction: 0.06, frictionAir: 0.012
            });
            b.__txt = txt;
            b.__r = r;
            b.__pink = i % 3 === 0;
            b.__col = b.__pink ? PINK[i % 2] : null;
            M.Composite.add(world, b);
            bodies.push(b);
          }, i * 190);
        })(i);
      }

      var mouse = M.Mouse.create(cv);
      var mc = M.MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: { stiffness: 0.16, render: { visible: false } }
      });
      M.Composite.add(world, mc);
      mouse.element.removeEventListener('wheel', mouse.mousewheel);
      mouse.element.removeEventListener('DOMMouseScroll', mouse.mousewheel);

      var grad = null;
      function chrome(ctx2, r) {
        if (!grad) {
          grad = ctx2.createLinearGradient(0, -r, 0, r);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.32, '#c9c9c9');
          grad.addColorStop(0.5, '#f2f2f2');
          grad.addColorStop(0.68, '#8a8a8a');
          grad.addColorStop(1, '#dcdcdc');
        }
        return grad;
      }

      function draw() {
        M.Engine.update(engine, 1000 / 60);
        ctx.clearRect(0, 0, W, H);
        bodies.forEach(function (b) {
          var p = b.position, r = b.__r;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(b.angle);
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          if (b.__pink) {
            var g = ctx.createLinearGradient(0, -r, 0, r);
            g.addColorStop(0, '#ff92c2'); g.addColorStop(0.55, b.__col); g.addColorStop(1, '#b81a5f');
            ctx.fillStyle = g;
          } else {
            ctx.fillStyle = chrome(ctx, r);
          }
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = 'rgba(255,255,255,.5)';
          ctx.stroke();
          ctx.fillStyle = b.__pink ? '#fff' : '#2a2a2a';
          ctx.font = '600 ' + (r * 0.62) + 'px Oswald, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(b.__txt, 0, 1);
          ctx.restore();
        });
        requestAnimationFrame(draw);
      }
      draw();

      window.addEventListener('resize', function () {
        W = foot.clientWidth; H = foot.clientHeight;
        cv.width = W * dpr; cv.height = H * dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
        M.Body.setPosition(walls[0], { x: W / 2, y: H + 30 });
        M.Body.setPosition(walls[2], { x: W + 30, y: H / 2 });
      });
    }
  })();

  /* ---------------------------------------------------------
     17. Салют из стикеров по CTA
     --------------------------------------------------------- */
  $$('#finalCta, .btn--pink').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      if (RM) return;
      var r = btn.getBoundingClientRect();
      for (var i = 0; i < 12; i++) {
        var d = document.createElement('span');
        d.textContent = ['✦', '★', '♥', '●'][i % 4];
        d.style.cssText = 'position:fixed;z-index:200;pointer-events:none;font-size:' +
          (10 + Math.random() * 12) + 'px;color:' + (i % 2 ? '#ed3482' : '#b9b9b9') +
          ';left:' + (r.left + r.width / 2) + 'px;top:' + (r.top + r.height / 2) + 'px';
        document.body.appendChild(d);
        (function (el) {
          el.animate([
            { transform: 'translate(-50%,-50%) scale(.4)', opacity: 1 },
            {
              transform: 'translate(' + (-50 + (Math.random() - 0.5) * 600) + '%,' +
                (-50 - Math.random() * 500) + '%) scale(1.1) rotate(' + (Math.random() * 360) + 'deg)',
              opacity: 0
            }
          ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' })
            .onfinish = function () { el.remove(); };
        })(d);
      }
    });
  });

})();
