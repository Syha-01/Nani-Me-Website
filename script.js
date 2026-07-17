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
