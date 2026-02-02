// script.js — unified header behavior, projects (localStorage), small UX helpers
document.addEventListener('DOMContentLoaded', () => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------
     UTILS
     ---------------------------- */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = s => (s||'').toString().replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));

  /* ----------------------------
     Header: mobile burger + active nav
     ---------------------------- */
  (function headerInit(){
    const burger = $('#burger');
    const nav = $('#nav');
    if (burger && nav) {
      burger.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      // close nav on link click
      $$('#nav a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
    }
    // mark active link based on pathname (works for relative paths)
    const path = location.pathname.split('/').pop() || 'index.html';
    $$('#nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const target = href.split('/').pop();
      if (target === path) {
        a.classList.add('active');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('active');
        a.removeAttribute('aria-current');
      }
    });
  })();

  /* ----------------------------
     Theme toggle
     ---------------------------- */
  (function theme(){
    const root = document.documentElement;
    const t = $('#themeToggle');
    if (!t) return;
    const saved = localStorage.getItem('theme');
    if (saved === 'light') root.classList.add('light');
    const update = () => t.textContent = root.classList.contains('light') ? '🌞' : '🌙';
    update();
    t.addEventListener('click', () => {
      const now = root.classList.toggle('light');
      localStorage.setItem('theme', now ? 'light' : 'dark');
      update();
    });
  })();

  /* ----------------------------
     Simple reveal on load / intersection
     ---------------------------- */
  (function reveal(){
    const items = $$('.reveal');
    if (!items.length) return;
    if (prefersReduced) { items.forEach(i => i.classList.add('visible')); return; }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); obs.unobserve(entry.target); }
      });
    }, { root: null, threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
    items.forEach(i => io.observe(i));
  })();

  /* ----------------------------
     Floating controls
     ---------------------------- */
  (function floating(){
    $('#goTop')?.addEventListener('click', () => window.scrollTo({ top:0, behavior: prefersReduced ? 'auto' : 'smooth' }));
    $('#goBottom')?.addEventListener('click', () => document.querySelector('footer')?.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' }));
    $('#goBack')?.addEventListener('click', () => { if (history.length > 1) history.back(); else location.href = 'index.html'; });
  })();

  /* ----------------------------
     Projects manager (localStorage)
     - Images and URLs are used as provided (relative paths allowed)
     - Images are loaded with placeholder fallback
     ---------------------------- */
  (function projects(){
    const key = 'portfolio.projects.v1';
    const grid = $('#projectsGrid');
    const homeGrid = $('#homeProjectsGrid');
    const addBtn = $('#addProjectBtn');
    const modal = $('#projectModal');
    const closeModal = $('#closeModal');
    const cancelBtn = $('#cancelProject');
    const form = $('#projectForm');

    const sample = [
      { id:'p-todo', title:'App Todo', description:'Gestion simple de tâches, responsive et accessible.', tech:'Vanilla JS • LocalStorage', url:'#', image:'images/sample-todo.jpg' },
      { id:'p-site', title:'Site statique', description:'Portfolio statique optimisé pour la performance et l’accessibilité.', tech:'HTML • CSS', url:'#', image:'images/sample-site.jpg' },
      { id:'p-lib', title:'Lib UI', description:'Petite bibliothèque de composants réutilisables.', tech:'JS • CSS', url:'#', image:'' }
    ];

    function load(){
      try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch(e){ return null; }
    }
    function save(list){
      localStorage.setItem(key, JSON.stringify(list));
    }
    function ensure(){
      const r = load();
      if (!r) { save(sample); return sample; }
      return r;
    }

    function createCard(p){
      const a = document.createElement('article'); a.className='project-card reveal'; a.dataset.id = p.id;

      const link = document.createElement('a'); link.className = 'card-link';
      link.href = p.url || '#';
      if (p.url) link.target = '_blank';
      link.rel = 'noopener';

      const fig = document.createElement('figure'); fig.className = 'thumb';
      // placeholder while loading or if no image
      const ph = document.createElement('div'); ph.className = 'placeholder'; ph.textContent = p.title;

      if (p.image) {
        const img = document.createElement('img');
        img.alt = p.title;
        img.loading = 'lazy';
        // Use the URL exactly as provided (so relative paths work)
        img.src = p.image;

        // show placeholder until image loads
        fig.appendChild(ph);
        img.addEventListener('load', () => {
          if (fig.contains(ph)) fig.removeChild(ph);
          fig.appendChild(img);
        });
        img.addEventListener('error', () => {
          if (fig.contains(img)) fig.removeChild(img);
          if (!fig.contains(ph)) fig.appendChild(ph);
        });
        // Append the image right away — if it loads fast it will be visible; otherwise placeholder remains until load
        fig.appendChild(img);
      } else {
        fig.appendChild(ph);
      }

      const body = document.createElement('div'); body.className = 'card-body';
      const title = document.createElement('h3'); title.innerHTML = esc(p.title);
      const desc = document.createElement('p'); desc.textContent = p.description || '';
      const meta = document.createElement('div'); meta.className = 'meta';
      const tech = document.createElement('div'); tech.className = 'tech'; tech.textContent = p.tech || '';
      const actions = document.createElement('div');
      actions.innerHTML = `<button class="btn ghost open-detail" data-id="${p.id}">Détail</button> <button class="btn ghost remove-project" data-id="${p.id}">✖</button>`;

      meta.appendChild(tech); meta.appendChild(actions);

      body.appendChild(title); body.appendChild(desc); body.appendChild(meta);

      link.appendChild(fig); link.appendChild(body); a.appendChild(link);

      return a;
    }

    function render(target, list){
      if (!target) return;
      target.innerHTML = '';
      if (!list.length) {
        const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Aucun projet.';
        target.appendChild(p); return;
      }
      list.forEach(item => {
        const c = createCard(item);
        target.appendChild(c);
        requestAnimationFrame(() => c.classList.add('visible'));
      });

      // wire actions
      target.querySelectorAll('.remove-project').forEach(btn => {
        btn.onclick = () => {
          if (!confirm('Supprimer ce projet ?')) return;
          let L = load() || [];
          L = L.filter(x => String(x.id) !== String(btn.dataset.id));
          save(L);
          rerender();
        };
      });
      target.querySelectorAll('.open-detail').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          const p = (load() || []).find(x => String(x.id) === String(id));
          if (p) alert(`Titre: ${p.title}\nTech: ${p.tech}\nDesc: ${p.description}\nURL: ${p.url || '—'}`);
        };
      });
    }

    function rerender(){
      const L = ensure();
      render(grid, L);
      render(homeGrid, L.slice(0,3));
    }

    // modal helpers
    function showModal(){ if (!modal) return; modal.setAttribute('aria-hidden','false'); modal.style.display = 'flex'; setTimeout(()=> modal.querySelector('input[name="title"]')?.focus(),80);}
    function hideModal(){ if (!modal) return; modal.setAttribute('aria-hidden','true'); modal.style.display = 'none'; form?.reset(); }

    addBtn?.addEventListener('click', showModal);
    closeModal?.addEventListener('click', hideModal);
    cancelBtn?.addEventListener('click', hideModal);
    modal?.addEventListener('click', e => { if (e.target === modal) hideModal(); });

    form?.addEventListener('submit', e => {
      e.preventDefault();
      const fd = new FormData(form);
      const title = (fd.get('title') || '').toString().trim();
      const description = (fd.get('description') || '').toString().trim();
      const tech = (fd.get('tech') || '').toString().trim();
      const url = (fd.get('url') || '').toString().trim();
      const image = (fd.get('image') || '').toString().trim();
      if (!title || !description) { alert('Titre et description requis'); return; }
      const proj = { id: Date.now().toString(), title, description, tech, url, image, createdAt: new Date().toISOString() };
      const L = ensure(); L.unshift(proj); save(L); rerender(); hideModal();
      // scroll to new card if on projects page
      setTimeout(()=> {
        const el = document.querySelector(`[data-id="${proj.id}"]`);
        if (el) el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'center' });
      }, 120);
    });

    rerender();
    // expose for debugging
    window.__portfolio_projects_render = rerender;
  })();

  /* ----------------------------
     Accessibility: set current year
     ---------------------------- */
  (function year(){ const y = new Date().getFullYear(); const el = document.getElementById('year'); if (el) el.textContent = y; })();

  /* ----------------------------
     Small enhancement: hide mobile nav on resize to desktop
     ---------------------------- */
  (function resizeHideNav(){
    let last = innerWidth;
    window.addEventListener('resize', () => {
      if (innerWidth > 900 && last <= 900) {
        const nav = $('#nav'); if (nav) nav.classList.remove('open');
      }
      last = innerWidth;
    }, { passive: true });
  })();
});