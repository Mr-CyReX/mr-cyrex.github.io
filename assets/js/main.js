// Extracted JS from index.html + modal and before/after logic
(() => {
  /* ========================= INITIAL LOAD ========================= */
  document.documentElement.classList.add('js-ready');

  /* ========================= SCROLL PROGRESS + NAV ========================= */
  const progress = document.querySelector('.progress');
  const nav = document.querySelector('.nav');
  let isTicking = false;

  function updateScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? window.scrollY / max : 0;

    if (progress) {
      progress.style.transform = `scaleX(${ratio})`;
    }
    if (nav) {
      nav.classList.toggle('scrolled', window.scrollY > 24);
    }
    isTicking = false;
  }

  window.addEventListener('scroll', () => {
    if (!isTicking) {
      requestAnimationFrame(updateScroll);
      isTicking = true;
    }
  }, { passive: true });
  updateScroll();

  /* ========================= CURSOR GLOW ========================= */
  const glow = document.querySelector('.cursor-glow');
  const hasFinePointer = window.matchMedia('(pointer:fine)').matches;

  if (glow && hasFinePointer) {
    let targetX = innerWidth / 2;
    let targetY = innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let isAnimating = false;

    function animateGlow() {
      const dx = targetX - currentX;
      const dy = targetY - currentY;

      currentX += dx * 0.1;
      currentY += dy * 0.1;

      glow.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;

      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        requestAnimationFrame(animateGlow);
      } else {
        isAnimating = false;
      }
    }

    window.addEventListener('pointermove', (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
      glow.classList.add('on');

      if (!isAnimating) {
        isAnimating = true;
        requestAnimationFrame(animateGlow);
      }
    }, { passive: true });
  }

  /* ========================= CARD LIGHTING ========================= */
  if (hasFinePointer) {
    document.querySelectorAll('.card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--x', `${event.clientX - rect.left}px`);
        card.style.setProperty('--y', `${event.clientY - rect.top}px`);
      }, { passive: true });
    });
  }

  /* ========================= SCROLL REVEALS ========================= */
  const targets = document.querySelectorAll('.reveal,.stagger');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });

    targets.forEach((element) => observer.observe(element));
  } else {
    function revealVisible() {
      targets.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.88 && rect.bottom > 0) {
          element.classList.add('in');
        }
      });
    }
    window.addEventListener('scroll', revealVisible, { passive: true });
    revealVisible();
  }

  /* Fallback guarantee */
  setTimeout(() => {
    targets.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < window.innerHeight) {
        element.classList.add('in');
      }
    });
  }, 400);

  /* ========================= SHOWREEL MODAL HANDLING ========================= */
  const showBtn = document.querySelector('[data-showreel-button]');
  const modal = document.getElementById('showreel-modal');
  const modalClose = modal && modal.querySelector('.close-btn');
  const modalVideo = modal && modal.querySelector('video');

  function openModal() {
    if (!modal) return;
    modal.classList.add('open');
    // Autoplay attempt (muted recommended). If video is muted and has playsinline, this should play.
    try { modalVideo && modalVideo.play().catch(() => {}); } catch (e) {}
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    if (modalVideo) {
      modalVideo.pause();
      modalVideo.currentTime = 0;
    }
  }

  if (showBtn) showBtn.addEventListener('click', openModal);
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  /* ========================= BEFORE / AFTER SLIDER ========================= */
  (function setupBeforeAfter() {
    const container = document.querySelector('.ba-container');
    if (!container) return;
    const reveal = container.querySelector('.ba-reveal');
    const handle = container.querySelector('.ba-handle');
    const dot = container.querySelector('.ba-dot');

    let dragging = false;

    function setPositionFromClientX(clientX) {
      const rect = container.getBoundingClientRect();
      let x = clientX - rect.left;
      x = Math.max(0, Math.min(rect.width, x));
      const pct = (x / rect.width) * 100;
      reveal.style.width = pct + '%';
      handle.style.left = pct + '%';
    }

    handle.addEventListener('pointerdown', (e) => {
      dragging = true;
      handle.setPointerCapture(e.pointerId);
    });
    window.addEventListener('pointerup', (e) => { dragging = false; });
    window.addEventListener('pointermove', (e) => { if (!dragging) return; setPositionFromClientX(e.clientX); }, { passive: true });

    // allow dragging by clicking the container
    container.addEventListener('pointerdown', (e) => {
      setPositionFromClientX(e.clientX);
    });

    // init center
    reveal.style.width = '50%';
    handle.style.left = '50%';
  })();

})();
