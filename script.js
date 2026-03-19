// ── PAGE TRANSITIONS & INITIALIZATION ───────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

(function injectScrollProgress() {
    const bar = document.createElement('div');
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);
    window.addEventListener('scroll', () => {
        const scrolled = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        bar.style.width = scrolled + '%';
    }, { passive: true });
})();

// ── CURSOR GLOW (desktop only) ─────────────────────────────
(function injectCursorGlow() {
    if (window.innerWidth < 768) return;
    const glow = document.createElement('div');
    glow.id = 'cursor-glow';
    document.body.appendChild(glow);
    window.addEventListener('mousemove', (e) => {
        glow.style.left = e.clientX + 'px';
        glow.style.top  = e.clientY + 'px';
    }, { passive: true });
})();

function initApp() {
    renderHeader();
    renderFooter();
    
    // Initial page load
    initPageStructure(window.location.pathname);
    
    setupMobileMenu();
    setupThemeToggle();
    setupEmailLinks();
    setupNavScroll();
    
    // Global fade-in
    requestAnimationFrame(() => document.body.classList.add('page-ready'));
}

function initPageStructure(path) {
    const page = path.split("/").pop().split('?')[0].split('#')[0] || 'index.html';

    
    // Re-initialize dynamic elements, counters, observers
    setupScrollReveal();
    setupCardTilt();
    updateNavLinks(page);
    
    // Scroll to top or hash smoothly on load
    const hashMatch = path.match(/#([^?]+)/);
    if (hashMatch) {
        // Wait a small tick for dynamic content to be rendered into DOM
        setTimeout(() => {
            const el = document.getElementById(hashMatch[1]);
            if (el) el.scrollIntoView({ behavior: 'instant' });
            else window.scrollTo({ top: 0, behavior: 'instant' });
        }, 50);
    } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}

function updateNavLinks(currentPage) {
    const navLinks = document.querySelectorAll('header ul a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        const span = link.nextElementSibling;
        
        if (href === currentPage || (currentPage === '' && href === 'index.html')) {
            link.classList.add('text-blue-600');
            link.classList.remove('text-gray-400', 'dark:text-slate-500');
            if(span) {
                span.classList.remove('scale-x-0', 'group-hover:scale-x-100');
                span.classList.add('scale-x-100');
            }
        } else {
            link.classList.remove('text-blue-600');
            link.classList.add('text-gray-400', 'dark:text-slate-500');
            if(span) {
                span.classList.remove('scale-x-100');
                span.classList.add('scale-x-0', 'group-hover:scale-x-100');
            }
        }
    });
}

// ── SPA NAVIGATION SYSTEM ──────────────────────────────────
document.addEventListener('click', async (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    const target = link.target;
    
    // Skip external, hash, or new-tab links
    if (!href || href.startsWith('#') || href.startsWith('http') ||
        href.startsWith('mailto') || href.startsWith('tel') ||
        target === '_blank') return;

    e.preventDefault();
    
    // Prevent navigating to the exact same page
    const currentPath = window.location.pathname.split("/").pop() || 'index.html';
    const targetPath = href.split("/").pop() || 'index.html';
    if(currentPath === targetPath) {
        // Just scroll to top if already on page
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
    }

    await navigateTo(href);
}, true);

window.addEventListener('popstate', async () => {
    await navigateTo(window.location.pathname, true);
});

async function navigateTo(url, isPopState = false) {
    const mainEl = document.querySelector('main');
    
    // Fade out main content
    mainEl.classList.add('page-exit');
    
    // Close mobile menu if it's open
    const nav = document.querySelector('header ul');
    if (nav && !nav.classList.contains('hidden') && window.innerWidth < 768) {
        nav.classList.add('hidden');
        nav.classList.remove('flex', 'flex-col', 'absolute', 'top-20', 'left-0', 'w-full', 'bg-white', 'dark:bg-black', 'p-8', 'border-b', 'dark:border-slate-800', 'shadow-2xl', 'z-50');
    }
    
    try {
        const response = await fetch(url);
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const newMain = doc.querySelector('main');
        if (newMain) {
            // Wait for fade out animation to finish before swapping DOM
            await new Promise(r => setTimeout(r, 200));
            
            mainEl.innerHTML = newMain.innerHTML;
            
            // Execute any script tags found in the new main content
            const scripts = mainEl.querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
                newScript.textContent = oldScript.textContent;
                oldScript.parentNode.replaceChild(newScript, oldScript);
            });
            document.title = doc.title;
            
            if (!isPopState) {
                window.history.pushState({}, '', url);
            }
            
            initPageStructure(url);
            
            // Wait a tiny bit for render to finish, then fade back in
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    mainEl.classList.remove('page-exit');
                });
            });
        }
    } catch (err) {
        console.error('SPA Navigation Error:', err);
        window.location.href = url; // fallback
    }
}

// ── SCROLL REVEAL ENGINE ───────────────────────────────────
function setupScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Animate counters when they enter view
                const counters = entry.target.querySelectorAll('[data-count]');
                counters.forEach(el => animateCounter(el));
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    // Auto-attach to all .reveal elements (including dynamically added ones)
    function attachObservers() {
        document.querySelectorAll('.reveal:not([data-observed])').forEach(el => {
            el.setAttribute('data-observed', '1');
            observer.observe(el);
        });
    }
    attachObservers();
    // Re-run after dynamic content renders
    setTimeout(attachObservers, 300);
    setTimeout(attachObservers, 800);
}

// ── COUNTER ANIMATION ──────────────────────────────────────
function animateCounter(el) {
    if (el.dataset.animated) return;
    el.dataset.animated = '1';
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    const duration = 1800;
    const startTime = performance.now();

    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = target * eased;
        el.textContent = prefix + (Number.isInteger(target) ? Math.round(current) : current.toFixed(1)) + suffix;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

// ── 3D CARD TILT ──────────────────────────────────────────
function setupCardTilt() {
    function attachTilt() {
        document.querySelectorAll('.card-tilt:not([data-tilt])').forEach(card => {
            card.setAttribute('data-tilt', '1');
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width - 0.5) * 12;
                const y = ((e.clientY - rect.top) / rect.height - 0.5) * -12;
                card.style.transform = `perspective(600px) rotateX(${y}deg) rotateY(${x}deg) translateY(-6px)`;
                card.style.boxShadow = `${-x * 2}px ${y * 2}px 30px rgba(59,130,246,0.15)`;
            });
            card.addEventListener('mouseleave', () => {
                card.style.transform = '';
                card.style.boxShadow = '';
            });
        });
    }
    attachTilt();
    setTimeout(attachTilt, 500);
}

// ── NAV SCROLL SHADOW ─────────────────────────────────────
function setupNavScroll() {
    const headerEl = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (!headerEl) return;
        if (window.scrollY > 20) {
            headerEl.classList.add('nav-scrolled');
        } else {
            headerEl.classList.remove('nav-scrolled');
        }
    }, { passive: true });
}


function renderHeader() {
    const header = document.getElementById('main-header');
    if (!header) return;

    const navItems = [
        { name: 'Home', link: 'index.html' },
        { name: 'Services', link: 'services.html' },
        { name: 'Portfolio', link: 'portfolio.html' },
        { name: 'Contact', link: 'contact.html' },
        { name: 'About', link: 'about.html' }
    ];

    const currentPage = window.location.pathname.split("/").pop() || 'index.html';

    header.innerHTML = `
        <header class="sticky top-0 z-50 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-800/50 transition-all duration-300">
            <nav class="max-w-[1100px] mx-auto px-6 h-28 flex justify-between items-center">
                <a href="index.html" class="flex items-center group">
                    <img src="logo.png" alt="${siteData.name}" class="h-24 w-auto group-hover:scale-105 transition-transform duration-300">
                </a>
                
                <ul class="hidden md:flex items-center gap-8">
                    ${navItems.map(item => `
                        <li class="relative group flex items-center h-full">
                            <a href="${item.link}" class="px-2 py-6 text-[11px] font-black uppercase tracking-[0.3em] transition-colors duration-200 ${currentPage === item.link ? 'text-blue-600' : 'text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400'}">
                                ${item.name}
                            </a>
                            <span class="absolute bottom-5 left-2 w-[calc(100%-16px)] h-0.5 bg-blue-600 transition-transform duration-200 origin-left ${currentPage === item.link ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}"></span>
                        </li>
                    `).join('')}
                </ul>
                
                <div class="flex items-center gap-6">
                    <button id="theme-toggle" class="p-3 -m-3 text-xl text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-yellow-400 transition-colors duration-200 active:scale-90" title="Toggle Theme">
                        <i class="fa-solid fa-moon"></i>
                    </button>
                    <button class="md:hidden p-3 -m-3 text-gray-900 dark:text-white" id="mobile-toggle">
                        <i class="fa-solid fa-bars-staggered text-2xl"></i>
                    </button>
                </div>
            </nav>
        </header>
    `;
}

function renderFooter() {
    const footer = document.getElementById('main-footer');
    if (!footer) return;

    const whatsappNumber = siteData.phone.replace(/[^\d]/g, '');
    const whatsappMsg = encodeURIComponent('Hi! I found your website and I\'m interested in growing my business online. Can we talk?');

    footer.innerHTML = `
        <footer class="bg-white dark:bg-black pt-24 pb-12 border-t border-gray-100 dark:border-slate-900 transition-all duration-300">
            <div class="max-w-[1100px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
                <div class="space-y-8">
                    <a href="index.html" class="flex items-center group">
                        <img src="logo.png" alt="${siteData.name}" class="h-24 w-auto group-hover:scale-105 transition-transform duration-300">
                    </a>
                    <p class="text-gray-500 dark:text-slate-400 leading-relaxed text-sm">
                        ${siteData.tagline}
                    </p>
                </div>
                <div>
                        <li><a href="portfolio.html" class="block py-2 text-sm font-bold text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Portfolio</a></li>
                        <li><a href="about.html" class="block py-2 text-sm font-bold text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a></li>
                    </ul>
                </div>
                <div>
                    <h4 class="text-xs font-black uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500 mb-8">Support</h4>
                    <ul class="space-y-4">
                        <li><a href="contact.html" class="block py-2 text-sm font-bold text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Contact Us</a></li>
                    </ul>
                </div>
                <div>
                    <div class="space-y-6 text-sm font-bold text-gray-600 dark:text-slate-400 mb-10">
                        <a href="mailto:${siteData.email}" class="relative z-10 flex items-center gap-3 group cursor-pointer hover:text-blue-600 transition-colors">
                            <i class="fa-solid fa-envelope text-xl transition-transform group-hover:scale-110"></i>
                            <span class="border-b border-transparent group-hover:border-blue-500/30 transition-all">${siteData.email}</span>
                        </a>
                        <a href="tel:${siteData.phone.replace(/\s/g, '')}" class="flex items-center gap-3 group cursor-pointer hover:text-blue-600 transition-colors">
                            <i class="fa-solid fa-phone text-xl transition-transform group-hover:scale-110"></i>
                            ${siteData.phone}
                        </a>
                    </div>
                    <div class="flex gap-3">
                        ${renderSocialLinksMarkup()}
                    </div>
                </div>
            </div>
            <div class="max-w-[1100px] mx-auto px-6 pt-12 border-t border-gray-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-6 text-gray-400 dark:text-slate-600 text-[11px] font-bold uppercase tracking-widest">
                <p>&copy; ${new Date().getFullYear()} ${siteData.name}. All rights reserved.</p>
                <div class="flex gap-8">
                    <a href="#" class="hover:text-blue-600 transition-colors">Privacy Policy</a>
                    <a href="#" class="hover:text-blue-600 transition-colors">Terms of Service</a>
                </div>
            </div>
        </footer>
    `;

    // Inject sticky WhatsApp floating button (once per page)
    if (!document.getElementById('whatsapp-fab')) {
        const fab = document.createElement('div');
        fab.id = 'whatsapp-fab';
        fab.innerHTML = `
            <a href="https://wa.me/${whatsappNumber}?text=${whatsappMsg}" target="_blank" rel="noopener"
               title="Chat with us on WhatsApp"
               class="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 group">
                <!-- Pulse ring -->
                <span class="absolute inset-0 rounded-full bg-green-400 opacity-30 animate-ping"></span>
                <!-- Button -->
                <span class="relative flex items-center justify-center w-16 h-16 rounded-full bg-green-500 hover:bg-green-400 shadow-xl shadow-green-500/40 hover:shadow-green-500/60 transition-all hover:scale-110">
                    <i class="fa-brands fa-whatsapp text-white text-4xl"></i>
                </span>
                <!-- Tooltip -->
                <span class="relative hidden group-hover:flex items-center px-4 py-2 bg-gray-900 dark:bg-slate-700 text-white text-xs font-black rounded-full whitespace-nowrap shadow-lg -translate-x-2 group-hover:translate-x-0 transition-all">
                    Get Free Consultation
                </span>
            </a>
        `;
        document.body.appendChild(fab);
    }
}


function renderSocialLinksMarkup() {
    const icons = {
        github: 'fa-github',
        linkedin: 'fa-linkedin-in',
        instagram: 'fa-instagram',
        youtube: 'fa-youtube',
        facebook: 'fa-facebook-f',
        twitter: 'fa-x-twitter',
        reddit: 'fa-reddit-alien'
    };

    return Object.entries(siteData.socials).map(([key, url]) => `
        <a href="${url}" class="p-2 -m-2 text-2xl text-gray-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all transform hover:-translate-y-1" target="_blank" title="${key}">
            <i class="fa-brands ${icons[key] || 'fa-globe'}"></i>
        </a>
    `).join('');
}

function setupMobileMenu() {
    const toggle = document.getElementById('mobile-toggle');
    const nav = document.querySelector('header ul');
    
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('hidden');
            nav.classList.toggle('flex');
            nav.classList.toggle('flex-col');
            nav.classList.toggle('absolute');
            nav.classList.toggle('top-20');
            nav.classList.toggle('left-0');
            nav.classList.toggle('w-full');
            nav.classList.toggle('bg-white');
            nav.classList.toggle('dark:bg-black');
            nav.classList.toggle('p-8');
            nav.classList.toggle('border-b');
            nav.classList.toggle('dark:border-slate-800');
            nav.classList.toggle('shadow-2xl');
            nav.classList.toggle('z-50');
        });

        // Close menu on link click
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.add('hidden');
                nav.classList.remove('flex', 'flex-col', 'absolute', 'top-20', 'left-0', 'w-full', 'bg-white', 'dark:bg-black', 'p-8', 'border-b', 'dark:border-slate-800', 'shadow-2xl', 'z-50');
            });
        });
    }
}

function setupThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    
    // Check for saved theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        html.classList.add('dark');
        updateThemeIcon(false);
    } else {
        html.classList.remove('dark');
        updateThemeIcon(true);
    }

    if (toggle) {
        toggle.addEventListener('click', () => {
            const isDark = html.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcon(!isDark);
        });
    }
}

function setupEmailLinks() {
    document.addEventListener('click', (e) => {
        const mailLink = e.target.closest('a[href^="mailto:"]');
        if (mailLink) {
            console.log('Email link clicked:', mailLink.getAttribute('href'));
            // Remove e.preventDefault() to let the native link work if possible, 
            // but also try manual redirection as a fallback.
            // window.location.href = mailLink.getAttribute('href');
        }
    });
}

function updateThemeIcon(isLight) {
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.innerHTML = isLight ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun text-yellow-500"></i>';
    }
}
