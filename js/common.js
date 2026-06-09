/* ============================================================
   common.js — ヘッダースクロール / SPメニュー / Intersection Observer
   HIDAMARI DENTAL
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* -------------------------------------------------------
     ヘッダー スクロール背景変化
     ------------------------------------------------------- */
  const header = document.querySelector('.header');
  if (header) {
    const onScroll = () => {
      if (window.scrollY > 50) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* -------------------------------------------------------
     SP ハンバーガーメニュー
     ------------------------------------------------------- */
  const hamburger = document.querySelector('.header__hamburger');
  const overlay = document.querySelector('.sp-menu-overlay');

  if (hamburger && overlay) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('is-open');
      overlay.classList.toggle('is-open');
      document.body.style.overflow = overlay.classList.contains('is-open') ? 'hidden' : '';
    });

    overlay.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('is-open');
        overlay.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });
  }

  /* -------------------------------------------------------
     Intersection Observer — スクロールアニメーション
     ------------------------------------------------------- */
  const animTargets = document.querySelectorAll('.fade-up, .fade-in, .slide-in-left, .slide-in-right');

  if (animTargets.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -40px 0px'
    });

    animTargets.forEach(el => observer.observe(el));
  }

  /* -------------------------------------------------------
     カウントアップアニメーション
     ------------------------------------------------------- */
  const countEls = document.querySelectorAll('[data-count]');

  if (countEls.length > 0) {
    const countObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.dataset.count);
          const suffix = el.dataset.suffix || '';
          const decimals = (target % 1 !== 0) ? 1 : 0;
          const duration = 1500;
          const start = performance.now();

          const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            el.textContent = current.toFixed(decimals) + suffix;

            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };

          requestAnimationFrame(animate);
          countObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    countEls.forEach(el => countObserver.observe(el));
  }

  /* -------------------------------------------------------
     パララックス（PCのみ）
     ------------------------------------------------------- */
  const parallaxEls = document.querySelectorAll('[data-parallax]');

  if (parallaxEls.length > 0 && window.innerWidth >= 1024) {
    const onParallax = () => {
      const scrollY = window.scrollY;
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.3;
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + scrollY - window.innerHeight / 2) * speed;
        el.style.transform = `translateY(${-offset * 0.1}px)`;
      });
    };
    window.addEventListener('scroll', onParallax, { passive: true });
  }

  /* -------------------------------------------------------
     Treatment Sticky Nav — アクティブ状態管理
     ------------------------------------------------------- */
  const stickyNav = document.querySelector('.treatment-nav-sticky');
  if (stickyNav) {
    const navItems = stickyNav.querySelectorAll('.treatment-nav-sticky__item');
    const sections = [];

    navItems.forEach(item => {
      const targetId = item.getAttribute('href')?.replace('#', '');
      if (targetId) {
        const section = document.getElementById(targetId);
        if (section) sections.push({ el: section, nav: item });
      }
    });

    if (sections.length > 0) {
      const navObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            navItems.forEach(n => n.classList.remove('active'));
            const match = sections.find(s => s.el === entry.target);
            if (match) match.nav.classList.add('active');
          }
        });
      }, {
        rootMargin: '-100px 0px -60% 0px',
        threshold: 0
      });

      sections.forEach(s => navObserver.observe(s.el));
    }

    /* スムーススクロール */
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = item.getAttribute('href')?.replace('#', '');
        const target = document.getElementById(targetId);
        if (target) {
          const headerH = window.innerWidth >= 768 ? 72 : 60;
          const navH = stickyNav.offsetHeight;
          const top = target.getBoundingClientRect().top + window.scrollY - headerH - navH;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      });
    });
  }

  /* -------------------------------------------------------
     アコーディオン
     ------------------------------------------------------- */
  document.querySelectorAll('.accordion__header').forEach(header => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion__item');
      const body = item.querySelector('.accordion__body');
      const isOpen = item.classList.contains('open');

      if (isOpen) {
        body.style.maxHeight = '0';
        item.classList.remove('open');
      } else {
        body.style.maxHeight = body.scrollHeight + 'px';
        item.classList.add('open');
      }
    });
  });

  /* -------------------------------------------------------
     院内ツアー タブ切替
     ------------------------------------------------------- */
  const tourTabs = document.querySelectorAll('.tour__tab');
  const tourPanels = document.querySelectorAll('.tour__panel');

  if (tourTabs.length > 0) {
    tourTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.target;
        tourTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        tourPanels.forEach(panel => {
          panel.style.display = panel.dataset.panel === target ? 'flex' : 'none';
        });
      });
    });
  }

});
