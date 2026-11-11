const header = document.querySelector<HTMLElement>('[data-header]');

function syncHeader(): void {
  header?.classList.toggle('is-scrolled', window.scrollY > 8);
}

syncHeader();
window.addEventListener('scroll', syncHeader, { passive: true });

const reveals = document.querySelectorAll<HTMLElement>('.reveal');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reducedMotion || !('IntersectionObserver' in window)) {
  reveals.forEach((element) => element.classList.add('is-visible'));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );

  reveals.forEach((element) => observer.observe(element));
}
