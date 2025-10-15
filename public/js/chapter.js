
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

  let currentPage = 1;
  const pages = document.querySelectorAll('.page-container img');
  const totalPages = pages.length;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') {
      currentPage = Math.min(currentPage + 1, totalPages);
      document.getElementById(`page-${currentPage}`).scrollIntoView({ behavior: 'smooth' });
    } else if (e.key === 'ArrowLeft') {
      currentPage = Math.max(currentPage - 1, 1);
      document.getElementById(`page-${currentPage}`).scrollIntoView({ behavior: 'smooth' });
    }
  });
});
