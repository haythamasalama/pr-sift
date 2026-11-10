import './style.css'

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('shown')
        observer.unobserve(entry.target)
      }
    }
  },
  { rootMargin: '0px 0px -10% 0px' },
)
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))

fetch('https://api.github.com/repos/haythamasalama/pr-sift')
  .then((res) => (res.ok ? res.json() : null))
  .then((repo) => {
    if (!repo?.stargazers_count) return
    document.querySelectorAll('[data-stars]').forEach((el) => (el.textContent = String(repo.stargazers_count)))
  })
  .catch(() => undefined)
