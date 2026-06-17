/* ============================================================
   common.js — DELTA アンカー忠実再現のモーション基盤
   Lenis慣性スクロール / OPローダー / FVイントロ / 語句リビール（c-word）/
   画像マスクリビール / navChange / count-up / sticky / accordion / tour
   iOS安全：パララックス無し・blur/blendアニメ無し・reduced-motionで全停止
   ============================================================ */

/* JSが動く環境でのみ初期不可視状態を有効化（no-JSでも全要素が見える） */
document.documentElement.classList.add('js-ready');

(() => {
  /* クライアント判断（2026-06）：参考サイト(DELTA)同様に prefers-reduced-motion を無視し、
     どの環境でも常にフルアニメーションを再生する。よって REDUCE は常に false に固定。 */
  const REDUCE = false;

  /* ----- Lenis 慣性スムーススクロール（reduced-motion時は無効） ----- */
  let lenis = null;
  if (!REDUCE && typeof window.Lenis === 'function') {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, smoothTouch: false });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const scrollToEl = (target, offset = 0) => {
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.1 });
    else {
      const top = (typeof target === 'number') ? target
        : target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  /* ----- スクロール連動パララックス（Lenis駆動・要素ごとに速度差／reduced-motionで無効） -----
     対象に .js-par を付与し CSS変数 --par を毎フレーム更新。CSS側で translate3d(0,var(--par),0)。
     ※ reveal-img のラッパーは transform 未使用なので競合しない。 */
  const PAR_SEL = [
    ['.about-cluster__cell--a', 0.035],
    ['.about-cluster__cell--b', 0.07],
    ['.about-cluster__cell--c', 0.10],
    ['.concept__media', 0.05],
    ['.treatment-hl__img', 0.05],
    ['.gallery-mosaic__item', 0.05],
    ['.sns-yt__thumb', 0.04]
  ];
  let parItems = [];
  if (lenis && !REDUCE) {
    PAR_SEL.forEach(([sel, sp]) => document.querySelectorAll(sel).forEach((el, i) => {
      el.classList.add('js-par');
      // 同種要素は交互に速度を少し変えて単調さを消す
      parItems.push({ el, sp: sp * (i % 2 ? 1.35 : 1) });
    }));
    const runPar = () => {
      const vh = window.innerHeight;
      for (const it of parItems) {
        const r = it.el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue; // 画面外はスキップ
        const c = (r.top + r.height / 2) - vh / 2;
        it.el.style.setProperty('--par', (-c * it.sp).toFixed(1) + 'px');
      }
    };
    lenis.on('scroll', runPar);
    window.addEventListener('resize', runPar);
    runPar();
  }

  /* ----- FEATURE：ピン留め区間の進行度で 01→06 を順に表示（PC/タブレット。SPは縦積み） ----- */
  const fPinwrap = document.querySelector('.feature__pinwrap');
  const fImgs = Array.from(document.querySelectorAll('.feature__img[data-idx]'));
  const fPanels = Array.from(document.querySelectorAll('.feature__panel[data-idx]'));
  const fCur = document.querySelector('.feature__media-cur');
  if (fPinwrap && fPanels.length) {
    const N = fPanels.length;
    let curIdx = -1;
    const setFeature = (idx) => {
      if (idx === curIdx) return;
      curIdx = idx;
      fImgs.forEach((im) => im.classList.toggle('is-active', +im.dataset.idx === idx));
      fPanels.forEach((p) => p.classList.toggle('is-current', +p.dataset.idx === idx));
      if (fCur) fCur.textContent = String(idx + 1).padStart(2, '0');
    };
    const runPin = () => {
      if (window.innerWidth <= 767) return; // SPはピン無し（全件表示）
      const r = fPinwrap.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      if (total <= 0) return;
      const scrolled = Math.min(Math.max(-r.top, 0), total);
      const idx = Math.min(N - 1, Math.floor((scrolled / total) * N * 0.999));
      setFeature(idx);
    };
    if (lenis) lenis.on('scroll', runPin);
    window.addEventListener('scroll', runPin, { passive: true });
    window.addEventListener('resize', runPin);
    runPin();
  }

  /* ----- 白背景セクションに常時ゆっくり回転する背景図形を注入（DELTAの常時可動図形） ----- */
  const FIG_SVG = '<svg viewBox="0 0 600 600" fill="none"><circle cx="300" cy="300" r="148"/><circle cx="300" cy="300" r="218"/><circle cx="300" cy="300" r="288"/><path d="M12 300h576M300 12v576M88 88l424 424M512 88L88 512"/></svg>';
  ['.concept', '.feature__inner', '.symptom', '.gallery', '.sns-section'].forEach((sel, i) => {
    const s = document.querySelector(sel);
    if (!s) return;
    s.classList.add('has-bg-figure');
    const f = document.createElement('div');
    f.className = 'bg-figure bg-figure--' + (i % 3);
    f.setAttribute('aria-hidden', 'true');
    f.innerHTML = FIG_SVG;
    s.prepend(f);
  });

  /* ----- 横スクロール画像帯（縦スクロールに連動して横移動） ----- */
  const hScroll = document.querySelector('.h-scroll');
  const hTrack = hScroll && hScroll.querySelector('.h-scroll__track');
  if (lenis && hScroll && hTrack) {
    const runH = () => {
      const r = hScroll.getBoundingClientRect();
      const vh = window.innerHeight;
      const prog = (vh - r.top) / (vh + r.height);
      const max = Math.max(0, hTrack.scrollWidth - window.innerWidth);
      const x = Math.max(0, Math.min(max, prog * max));
      hTrack.style.transform = 'translate3d(' + (-x).toFixed(1) + 'px,0,0)';
    };
    lenis.on('scroll', runH);
    window.addEventListener('resize', runH);
    runH();
  }

  /* ----- 語句リビール：reveal-mask の中身をトークン分割（EN=単語 / JP=文字） ----- */
  const splitTokens = (maskEl) => {
    const inner = maskEl.querySelector('span');
    const text = (inner ? inner.textContent : maskEl.textContent).trim();
    if (!text) return;
    const isHero = maskEl.classList.contains('reveal-mask--hero');
    const step = isHero ? 0.045 : 0.05;
    const base = maskEl.classList.contains('d3') ? (isHero ? 0.9 : 0.2)
               : maskEl.classList.contains('d2') ? (isHero ? 0.45 : 0.1) : 0;
    const tokens = /\s/.test(text) ? text.split(/(\s+)/) : Array.from(text);
    maskEl.innerHTML = '';
    let i = 0;
    tokens.forEach((tok) => {
      if (tok === '') return;
      if (/^\s+$/.test(tok)) { maskEl.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span'); w.className = 'rw';
      const inn = document.createElement('span'); inn.className = 'rw__in';
      inn.textContent = tok;
      inn.style.transitionDelay = (base + i * step).toFixed(3) + 's';
      w.appendChild(inn); maskEl.appendChild(w);
      i++;
    });
  };
  document.querySelectorAll('.reveal-mask').forEach(splitTokens);

  /* ----- 画像マスクリビール：対象コンテナに .reveal-img を付与 ----- */
  const IMG_SEL = [
    '.concept__media', '.treatment-hl__img',
    '.gallery-mosaic__item', '.sns-ig__cell', '.sns-yt__thumb', '.symptom-feature__img',
    '.staff__photo', '.equipment__img', '.sub-card__img', '.tour__photo',
    '.fv-detail__img', '.page-hero__img', '.reveal-img-auto'
  ];
  document.querySelectorAll(IMG_SEL.join(',')).forEach((el) => {
    if (el.querySelector(':scope > img, :scope > picture')) el.classList.add('reveal-img');
  });

  /* ----- IntersectionObserver reveal（HEROの中身は除外＝ロード後に手動発火） ----- */
  const hero = document.querySelector('.hero');
  const targets = Array.from(document.querySelectorAll(
    '.fade-up, .fade-in, .slide-in-left, .slide-in-right, .reveal-mask, .reveal-img'
  )).filter((el) => !(hero && hero.contains(el)));

  if (targets.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => io.observe(el));
  }

  /* ----- OPローダー → FVイントロ ----- */
  const heroIn = () => {
    if (!hero) return;
    hero.classList.add('is-in');
    hero.querySelectorAll('.reveal-mask').forEach((m) => m.classList.add('is-visible'));
  };
  const finishLoad = () => {
    document.documentElement.classList.add('is-loaded');
    heroIn();
  };
  if (REDUCE) {
    finishLoad();
  } else {
    let done = false;
    const go = () => { if (done) return; done = true; setTimeout(finishLoad, 1500); };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go);
    setTimeout(go, 3200); // セーフティ
  }

  document.addEventListener('DOMContentLoaded', () => {

    /* ----- ヘッダー：スクロールで背景／ダーク面で配色反転（navChange） ----- */
    const header = document.querySelector('.header');
    if (header) {
      const darkSections = Array.from(document.querySelectorAll('.js-dark-section'));
      const onScroll = () => {
        header.classList.toggle('is-scrolled', window.scrollY > 40);
        const line = (header.offsetHeight || 68) * 0.5;
        let overDark = false;
        for (const s of darkSections) {
          const r = s.getBoundingClientRect();
          if (r.top <= line && r.bottom >= line) { overDark = true; break; }
        }
        header.classList.toggle('is-on-dark', overDark);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      if (lenis) lenis.on('scroll', onScroll);
      onScroll();
    }

    /* ----- SP ハンバーガーメニュー ----- */
    const hamburger = document.querySelector('.header__hamburger');
    const overlay = document.querySelector('.sp-menu-overlay');
    if (hamburger && overlay) {
      hamburger.addEventListener('click', () => {
        const open = !hamburger.classList.contains('is-open');
        hamburger.classList.toggle('is-open', open);
        overlay.classList.toggle('is-open', open);
        if (lenis) { open ? lenis.stop() : lenis.start(); }
        document.body.style.overflow = open ? 'hidden' : '';
      });
      overlay.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          hamburger.classList.remove('is-open');
          overlay.classList.remove('is-open');
          if (lenis) lenis.start();
          document.body.style.overflow = '';
        });
      });
    }

    /* ----- カウントアップ ----- */
    const countEls = document.querySelectorAll('[data-count]');
    if (countEls.length) {
      const countObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseFloat(el.dataset.count);
          const suffix = el.dataset.suffix || '';
          const decimals = (target % 1 !== 0) ? 1 : 0;
          if (REDUCE) { el.textContent = target.toFixed(decimals) + suffix; countObserver.unobserve(el); return; }
          const duration = 1600;
          const start = performance.now();
          const animate = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = (target * eased).toFixed(decimals) + suffix;
            if (p < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          countObserver.unobserve(el);
        });
      }, { threshold: 0.5 });
      countEls.forEach((el) => countObserver.observe(el));
    }

    /* ----- Treatment Sticky Nav ----- */
    const stickyNav = document.querySelector('.treatment-nav-sticky');
    if (stickyNav) {
      const navItems = stickyNav.querySelectorAll('.treatment-nav-sticky__item');
      const sections = [];
      navItems.forEach((item) => {
        const id = item.getAttribute('href')?.replace('#', '');
        const sec = id && document.getElementById(id);
        if (sec) sections.push({ el: sec, nav: item });
      });
      if (sections.length) {
        const navObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              navItems.forEach((n) => n.classList.remove('active'));
              const m = sections.find((s) => s.el === entry.target);
              if (m) m.nav.classList.add('active');
            }
          });
        }, { rootMargin: '-120px 0px -60% 0px', threshold: 0 });
        sections.forEach((s) => navObserver.observe(s.el));
      }
      navItems.forEach((item) => {
        item.addEventListener('click', (e) => {
          e.preventDefault();
          const id = item.getAttribute('href')?.replace('#', '');
          const target = id && document.getElementById(id);
          if (target) {
            const headerH = window.innerWidth >= 768 ? 68 : 56;
            const navH = stickyNav.offsetHeight;
            scrollToEl(target, -(headerH + navH));
          }
        });
      });
    }

    /* ----- ページ内アンカーリンクをLenis経由でスムーズに ----- */
    document.querySelectorAll('a[href^="#"]:not(.treatment-nav-sticky__item)').forEach((a) => {
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const headerH = window.innerWidth >= 768 ? 84 : 64;
        scrollToEl(target, -headerH);
      });
    });

    /* ----- アコーディオン ----- */
    document.querySelectorAll('.accordion__header').forEach((h) => {
      h.addEventListener('click', () => {
        const item = h.closest('.accordion__item');
        const body = item.querySelector('.accordion__body');
        if (item.classList.contains('open')) {
          body.style.maxHeight = '0'; item.classList.remove('open');
        } else {
          body.style.maxHeight = body.scrollHeight + 'px'; item.classList.add('open');
        }
      });
    });

    /* ----- 院内ツアー タブ切替 ----- */
    const tourTabs = document.querySelectorAll('.tour__tab');
    const tourPanels = document.querySelectorAll('.tour__panel');
    if (tourTabs.length) {
      tourTabs.forEach((tab) => {
        tab.addEventListener('click', () => {
          const target = tab.dataset.target;
          tourTabs.forEach((t) => t.classList.remove('active'));
          tab.classList.add('active');
          tourPanels.forEach((p) => { p.style.display = p.dataset.panel === target ? 'flex' : 'none'; });
        });
      });
    }

  });
})();
