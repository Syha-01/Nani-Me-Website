/* Motion is deliberately concentrated: one painted opening in the hero, and
   after that the page only moves in answer to the scroll — the stroke under a
   heading drawing itself, the screenshots drifting, and the dot crossing the
   margin. Nothing fades up on its own.

   Everything below is additive. If a CDN does not answer, or the reader has
   asked for less motion, the page is already in its finished state and this
   file does nothing to it. */

(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bar = document.querySelector('.bar');

    /* ── the bar ──────────────────────────────────────────────────────── */
    const stick = () => bar.classList.toggle('is-stuck', window.scrollY > 24);
    stick();
    window.addEventListener('scroll', stick, { passive: true });

    /* ── smooth scroll ────────────────────────────────────────────────── */
    let lenis = null;
    if (window.Lenis && !reduced) {
        lenis = new window.Lenis({ duration: 1.05, smoothWheel: true, touchMultiplier: 1.6 });
    }

    // The bar floats over the page, so an anchor has to stop short of it.
    const jump = (el) => {
        const top = el.getBoundingClientRect().top + window.scrollY - 86;
        if (lenis) lenis.scrollTo(top, { duration: 1.1 });
        else window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
    };

    document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
            const el = document.querySelector(a.getAttribute('href'));
            if (!el) return;
            e.preventDefault();
            jump(el);
            history.replaceState(null, '', a.getAttribute('href'));
        });
    });

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger || reduced) return;

    gsap.registerPlugin(ScrollTrigger);

    if (lenis) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    /* ── the opening ──────────────────────────────────────────────────── */
    const hat = document.querySelector('.hero-hat');
    const wipe = { at: 0 };

    // The hat is revealed through a mask cut from noise, so the edge that
    // travels across it is ragged the way a loaded brush is, not a straight
    // wipe. `--wipe` slides that mask; 100% is the whole painting.
    if (hat) hat.style.setProperty('--wipe', '0%');

    const open = gsap.timeline({ defaults: { ease: 'power3.out' } });

    open.from('.sun', { y: -90, scale: 0.3, opacity: 0, duration: 1.1 });

    if (hat) {
        open.to(wipe, {
            at: 100,
            duration: 1.5,
            ease: 'power2.inOut',
            onUpdate: () => hat.style.setProperty('--wipe', wipe.at + '%'),
        }, 0.15);
    }

    open.from('.hero-mark img', { opacity: 0, y: 26, filter: 'blur(9px)', duration: 1 }, 0.5)
        .from('.hero-line .ln > span', { yPercent: 112, duration: 1, stagger: 0.09 }, 0.72)
        .from('.hero-lede', { opacity: 0, y: 16, duration: .8 }, 1.15)
        .from('.hero-do > *', { opacity: 0, y: 14, duration: .7, stagger: 0.07 }, 1.28)
        .from('.hero-meta', { opacity: 0, duration: .7 }, 1.5)
        .from('.endcard', { clipPath: 'inset(0 0 100% 0)', opacity: 0, duration: 1.1 }, 1.45);

    /* ── the dot crosses the margin as you read ───────────────────────── */
    gsap.to('.sun', {
        y: () => window.innerHeight * 0.66,
        scale: 1.12,
        ease: 'none',
        scrollTrigger: {
            trigger: document.body,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            invalidateOnRefresh: true,
        },
    });

    /* ── a heading's stroke paints itself ─────────────────────────────── */
    gsap.utils.toArray('.rule').forEach((rule) => {
        gsap.fromTo(rule,
            { clipPath: 'inset(0 100% 0 0)' },
            {
                clipPath: 'inset(0 0% 0 0)',
                duration: 1.15,
                ease: 'power2.inOut',
                scrollTrigger: { trigger: rule, start: 'top 88%' },
            });
    });

    /* ── the screenshots sit slightly off the page ────────────────────── */
    gsap.utils.toArray('.shot').forEach((shot) => {
        gsap.fromTo(shot, { y: 18 }, {
            y: -18,
            ease: 'none',
            scrollTrigger: {
                trigger: shot,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
            },
        });
    });

    // Web fonts land after the first measure and move everything down a little.
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
})();
