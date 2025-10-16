
document.addEventListener('DOMContentLoaded', () => {
  const chapterSelect = document.querySelector('.chapter-select');
  if (chapterSelect) {
    chapterSelect.addEventListener('change', () => {
      window.location.href = chapterSelect.value;
    });
  }

  const pageSelect = document.querySelector('.page-select');
  if (pageSelect) {
    pageSelect.addEventListener('change', () => {
      const targetPageId = pageSelect.value;
      const targetPage = document.querySelector(targetPageId);
      if (targetPage) {
        targetPage.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  const fullscreenBtn = document.getElementById('fullscreen-button');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    });
  }

  const goToTopBtn = document.getElementById('go-to-top-button');
  const goToTopBtnMobile = document.getElementById('go-to-top-button-mobile');
  if (goToTopBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 200) {
        goToTopBtn.style.display = 'block';
      } else {
        goToTopBtn.style.display = 'none';
      }
    });

    goToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  if (goToTopBtnMobile) {
    goToTopBtnMobile.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  let currentPage = 1;
  const pages = document.querySelectorAll('.page-container img');
  const totalPages = pages.length;

  // Reading mode and fit toggles
  let mode = localStorage.getItem('reader.mode') || 'long'; // long | single
  let fit = localStorage.getItem('reader.fit') || 'width'; // width | height
  const applyFit = () => {
    pages.forEach(img => {
      img.style.maxWidth = '';
      img.style.height = '';
      img.style.width = '';
      if (fit === 'width') {
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
      } else {
        img.style.height = '100vh';
        img.style.width = 'auto';
      }
    });
  };
  const applyMode = () => {
    if (mode === 'single') {
      pages.forEach((img, idx) => {
        const n = idx + 1;
        img.parentElement.style.display = (n === currentPage) ? 'block' : 'none';
      });
    } else {
      pages.forEach(img => img.parentElement.style.display = 'block');
    }
  };
  applyFit();
  applyMode();

  const fitWidthBtn = document.getElementById('fit-width');
  const fitHeightBtn = document.getElementById('fit-height');
  const modeLongBtn = document.getElementById('mode-long');
  const modeSingleBtn = document.getElementById('mode-single');
  if (fitWidthBtn) fitWidthBtn.addEventListener('click', () => { fit = 'width'; localStorage.setItem('reader.fit','width'); applyFit(); });
  if (fitHeightBtn) fitHeightBtn.addEventListener('click', () => { fit = 'height'; localStorage.setItem('reader.fit','height'); applyFit(); });
  if (modeLongBtn) modeLongBtn.addEventListener('click', () => { mode = 'long'; localStorage.setItem('reader.mode','long'); applyMode(); });
  if (modeSingleBtn) modeSingleBtn.addEventListener('click', () => { mode = 'single'; localStorage.setItem('reader.mode','single'); applyMode(); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      currentPage = Math.min(currentPage + 1, totalPages);
      document.getElementById(`page-${currentPage}`).scrollIntoView({ behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft') {
      currentPage = Math.max(currentPage - 1, 1);
      document.getElementById(`page-${currentPage}`).scrollIntoView({ behavior: 'smooth' });
    }
    if (mode === 'single') applyMode();
  });

  // Tap zones for mobile
  const createZone = (side) => {
    const z = document.createElement('div');
    z.style.position = 'fixed';
    z.style.top = '0';
    z.style.bottom = '0';
    z.style[side] = '0';
    z.style.width = '33%';
    z.style.zIndex = '30';
    z.style.background = 'transparent';
    z.addEventListener('click', () => {
      if (side === 'left') {
        currentPage = Math.max(currentPage - 1, 1);
      } else {
        currentPage = Math.min(currentPage + 1, totalPages);
      }
      document.getElementById(`page-${currentPage}`).scrollIntoView({ behavior: 'smooth' });
      if (mode === 'single') applyMode();
    });
    return z;
  };
  document.body.appendChild(createZone('left'));
  document.body.appendChild(createZone('right'));

  // Prefetch next two images when one becomes visible
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const idx = Array.from(pages).indexOf(entry.target);
      for (let k=1;k<=2;k++){
        const n = idx + k;
        if (pages[n]) {
          const src = pages[n].getAttribute('src');
          if (src){
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = src;
            document.head.appendChild(link);
          }
        }
      }
    });
  }, { rootMargin: '200px 0px' });
  pages.forEach(img => io.observe(img));
});
