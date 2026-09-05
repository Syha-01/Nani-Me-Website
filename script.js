document.addEventListener('DOMContentLoaded', () => {

    /* ==========================================================================
       Header Shrink on Scroll (Fallback / Progressive Enhancement)
       ========================================================================== */
    const header = document.getElementById('main-header');
    
    const handleHeaderScroll = () => {
        if (window.scrollY > 40) {
            header.classList.add('shrinked');
        } else {
            header.classList.remove('shrinked');
        }
    };
    
    // Run on init and scroll
    handleHeaderScroll();
    window.addEventListener('scroll', handleHeaderScroll, { passive: true });


    /* ==========================================================================
       Tab Switcher (Mobile vs TV Panels)
       ========================================================================== */
    const tabMobileBtn = document.getElementById('tab-mobile-btn');
    const tabTvBtn = document.getElementById('tab-tv-btn');
    const panelMobile = document.getElementById('panel-mobile');
    const panelTv = document.getElementById('panel-tv');

    const switchTab = (activeBtn, inactiveBtn, activePanel, inactivePanel) => {
        // Toggle Buttons
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-selected', 'true');
        activeBtn.setAttribute('tabindex', '0');
        
        inactiveBtn.classList.remove('active');
        inactiveBtn.setAttribute('aria-selected', 'false');
        inactiveBtn.setAttribute('tabindex', '-1');

        // Toggle Panels with a smooth transition
        inactivePanel.classList.remove('active');
        setTimeout(() => {
            inactivePanel.setAttribute('hidden', 'true');
            activePanel.removeAttribute('hidden');
            // Force reflow for transition
            activePanel.offsetHeight;
            activePanel.classList.add('active');
        }, 200); // Matches transition duration
    };

    if (tabMobileBtn && tabTvBtn) {
        tabMobileBtn.addEventListener('click', () => {
            if (!tabMobileBtn.classList.contains('active')) {
                switchTab(tabMobileBtn, tabTvBtn, panelMobile, panelTv);
            }
        });

        tabTvBtn.addEventListener('click', () => {
            if (!tabTvBtn.classList.contains('active')) {
                switchTab(tabTvBtn, tabMobileBtn, panelTv, panelMobile);
            }
        });

        // Keyboard navigation support for accessibility
        const tabs = [tabMobileBtn, tabTvBtn];
        tabs.forEach((tab, index) => {
            tab.addEventListener('keydown', (e) => {
                let targetTab = null;
                if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                    targetTab = tabs[(index + 1) % tabs.length];
                } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                    targetTab = tabs[(index - 1 + tabs.length) % tabs.length];
                }
                
                if (targetTab) {
                    targetTab.focus();
                    targetTab.click();
                    e.preventDefault();
                }
            });
        });
    }


    /* ==========================================================================
       Placeholder APK Buttons
       While the download hrefs are still "#", show a hint instead of jumping
       to the top of the page. Remove-safe: once real APK URLs are set on the
       buttons, this code does nothing.
       ========================================================================== */
    document.querySelectorAll('#dl-mobile-apk, #dl-tv-apk').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn.getAttribute('href') === '#') {
                e.preventDefault();
                const original = btn.textContent;
                btn.textContent = 'Download link coming soon';
                btn.setAttribute('aria-disabled', 'true');
                setTimeout(() => {
                    btn.textContent = original;
                    btn.removeAttribute('aria-disabled');
                }, 2000);
            }
        });
    });


    /* ==========================================================================
       Tsuzuku Screenshot Carousel
       One slide at a time, with arrows, dots, arrow keys and a swipe. Absent
       on every other page, so it does nothing when the markup is not there.
       ========================================================================== */
    document.querySelectorAll('[data-shot-carousel]').forEach(carousel => {
        const slides = Array.from(carousel.querySelectorAll('.shot-slide'));
        const dots = Array.from(carousel.querySelectorAll('[data-shot-dot]'));
        const viewport = carousel.querySelector('.shot-viewport');
        if (!slides.length) return;

        let current = 0;

        // Every slide sits in the same grid cell, so the card would otherwise
        // take the height of the tallest — leaving the one landscape shot
        // floating in a box built for a portrait one.
        const fit = () => { viewport.style.height = slides[current].offsetHeight + 'px'; };

        const show = (next) => {
            // Wraps both ways, so the arrows are never dead at either end.
            current = (next + slides.length) % slides.length;
            slides.forEach((slide, i) => {
                const on = i === current;
                slide.classList.toggle('is-active', on);
                // Hidden slides are stacked under the visible one, so they are
                // taken out of the reading order rather than just made invisible.
                slide.toggleAttribute('aria-hidden', !on);
            });
            dots.forEach((dot, i) => dot.classList.toggle('is-active', i === current));
            fit();
        };

        carousel.querySelector('[data-shot-prev]').addEventListener('click', () => show(current - 1));
        carousel.querySelector('[data-shot-next]').addEventListener('click', () => show(current + 1));
        dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));

        // Only once the carousel has focus — arrow keys still scroll the page
        // for anyone who has not reached it.
        carousel.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') { show(current - 1); e.preventDefault(); }
            else if (e.key === 'ArrowRight') { show(current + 1); e.preventDefault(); }
        });

        // Horizontal swipe. The vertical check keeps a scroll down the page
        // from being read as a lazy sideways drag.
        let startX = 0, startY = 0;
        carousel.addEventListener('touchstart', (e) => {
            startX = e.changedTouches[0].clientX;
            startY = e.changedTouches[0].clientY;
        }, { passive: true });

        carousel.addEventListener('touchend', (e) => {
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
        }, { passive: true });

        show(0);
        window.addEventListener('resize', fit, { passive: true });
        // The shots are lazy-loaded, so the first measurement can land before
        // the image has a height to report.
        carousel.querySelectorAll('img').forEach(img => img.addEventListener('load', fit));
    });


    /* ==========================================================================
       Scrollspy (Highlight Active Navbar Link)
       ========================================================================== */
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    const scrollspy = () => {
        const scrollPosition = window.scrollY + 120; // Offset for sticky header

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', scrollspy, { passive: true });


    /* ==========================================================================
       Scroll Reveal Animations Fallback (IntersectionObserver)
       ========================================================================== */
    // Only apply JavaScript-based IntersectionObserver animations if the browser does not support CSS view timelines natively
    if (!CSS.supports('animation-timeline: view()')) {
        const revealElements = document.querySelectorAll('.highlight-card, .download-card, .showcase-grid, .compare-table-wrapper, .install-card, .faq-item');
        
        // Add basic inline style setup for JS fallback animation
        revealElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
        });

        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target); // Animate only once
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => {
            revealObserver.observe(el);
        });
    }

});
