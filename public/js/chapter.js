
document.addEventListener('DOMContentLoaded', () => {
  const chapterSelect = document.querySelector('.chapter-select');
  if (chapterSelect) {
    chapterSelect.addEventListener('change', () => {
      window.location.href = chapterSelect.value;
    });
  }
});
