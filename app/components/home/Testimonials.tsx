"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import styles from "./Testimonials.module.css";

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  location?: string;
  quote: string;
  /** 1 to 5 */
  rating: number;
}

// Placeholder data: replace with real customer reviews.
const DEFAULT_TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Customer Name",
    role: "Furniture Manufacturer",
    location: "City, State",
    quote: "Write your real customer feedback here.",
    rating: 5,
  },
  {
    id: "t2",
    name: "Customer Name",
    role: "Plastic Moulding Unit",
    location: "City, State",
    quote: "Write your real customer feedback here.",
    rating: 5,
  },
  {
    id: "t3",
    name: "Customer Name",
    role: "Mould Supplier",
    location: "City, State",
    quote: "Write your real customer feedback here.",
    rating: 4,
  },
];

const AUTOPLAY_MS = 5000;
const TRANSITION_MS = 450;
const SWIPE_THRESHOLD = 50;

interface TestimonialsProps {
  title?: string;
  subtitle?: string;
  testimonials?: Testimonial[];
  autoPlay?: boolean;
}

const initialsOf = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

export default function Testimonials({
  title = "What our customers say",
  subtitle = "Trusted by manufacturers and buyers across India",
  testimonials = DEFAULT_TESTIMONIALS,
  autoPlay = true,
}: TestimonialsProps) {
  const count = testimonials.length;
  const loop = count > 1;

  // With looping, a copy of the last slide sits before the first one and a
  // copy of the first sits after the last. After animating onto a copy we
  // jump (without animation) to the real slide, which makes the loop seamless.
  const slides = loop
    ? [
        { item: testimonials[count - 1], key: `${testimonials[count - 1].id}-head`, clone: true },
        ...testimonials.map((item) => ({ item, key: item.id, clone: false })),
        { item: testimonials[0], key: `${testimonials[0].id}-tail`, clone: true },
      ]
    : testimonials.map((item) => ({ item, key: item.id, clone: false }));

  const [position, setPosition] = useState(loop ? 1 : 0);
  const [animate, setAnimate] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const pausedRef = useRef(false);
  const startXRef = useRef(0);
  const widthRef = useRef(1);

  const active = loop ? (((position - 1) % count) + count) % count : 0;

  // Reset when the number of testimonials changes.
  useEffect(() => {
    setAnimate(false);
    setPosition(count > 1 ? 1 : 0);
  }, [count]);

  const next = useCallback(() => {
    if (!loop) return;
    setAnimate(true);
    setPosition((p) => Math.min(p + 1, count + 1));
  }, [loop, count]);

  const prev = useCallback(() => {
    if (!loop) return;
    setAnimate(true);
    setPosition((p) => Math.max(p - 1, 0));
  }, [loop]);

  const goTo = (index: number) => {
    setAnimate(true);
    setPosition(index + 1);
  };

  // Jump from a cloned slide to the matching real slide once the animation is done.
  useEffect(() => {
    if (!loop || (position !== 0 && position !== count + 1)) return;

    let raf1 = 0;
    let raf2 = 0;
    const timer = window.setTimeout(() => {
      setAnimate(false);
      setPosition(position === 0 ? count : 1);
      // Re-enable the transition after the browser has painted the jump.
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setAnimate(true));
      });
    }, TRANSITION_MS + 30);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [position, count, loop]);

  // Autoplay. Pauses on hover, focus and while dragging; respects reduced motion.
  useEffect(() => {
    if (!autoPlay || !loop) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const timer = window.setInterval(() => {
      if (pausedRef.current || reduced.matches) return;
      next();
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [autoPlay, loop, next]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!loop) return;
    startXRef.current = e.clientX;
    widthRef.current = e.currentTarget.clientWidth || 1;
    setDragging(true);
    pausedRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragX(e.clientX - startXRef.current);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const delta = e.clientX - startXRef.current;
    setDragging(false);
    setDragX(0);
    pausedRef.current = false;
    if (delta <= -SWIPE_THRESHOLD) next();
    else if (delta >= SWIPE_THRESHOLD) prev();
  };

  if (count === 0) return null;

  const offset = `calc(${-position * 100}% + ${dragX}px)`;

  return (
    <section
      className={styles.section}
      aria-roledescription="carousel"
      aria-labelledby="testimonials-title"
    >
      <div className={styles.inner}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Testimonials</span>
          <h2 id="testimonials-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </header>

        <div
          className={styles.viewport}
          onMouseEnter={() => (pausedRef.current = true)}
          onMouseLeave={() => (pausedRef.current = false)}
          onFocus={() => (pausedRef.current = true)}
          onBlur={() => (pausedRef.current = false)}
        >
          <div
            className={`${styles.track} ${dragging ? styles.trackDragging : ""}`}
            style={{
              transform: `translateX(${offset})`,
              transition: animate && !dragging ? `transform ${TRANSITION_MS}ms ease` : "none",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {slides.map(({ item, key, clone }) => {
              const rating = Math.max(0, Math.min(5, Math.round(item.rating)));

              return (
                <div
                  key={key}
                  className={styles.slide}
                  aria-roledescription="slide"
                  aria-hidden={clone || undefined}
                >
                  <figure className={styles.card}>
                    <span className={styles.quoteBadge} aria-hidden>
                      <Quote size={18} />
                    </span>

                    <div
                      className={styles.stars}
                      role="img"
                      aria-label={`${rating} out of 5 stars`}
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          size={18}
                          aria-hidden
                          className={n <= rating ? styles.starOn : styles.starOff}
                        />
                      ))}
                    </div>

                    <blockquote className={styles.quote}>{item.quote}</blockquote>

                    <figcaption className={styles.author}>
                      <span className={styles.avatar} aria-hidden>
                        {initialsOf(item.name)}
                      </span>
                      <span className={styles.authorText}>
                        <span className={styles.name}>{item.name}</span>
                        <span className={styles.meta}>
                          {item.role}
                          {item.location ? ` · ${item.location}` : ""}
                        </span>
                      </span>
                    </figcaption>
                  </figure>
                </div>
              );
            })}
          </div>
        </div>

        {loop && (
          <div className={styles.controls}>
            <button
              type="button"
              className={styles.arrow}
              onClick={prev}
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={18} aria-hidden />
            </button>

            <div className={styles.dots} role="tablist" aria-label="Choose testimonial">
              {testimonials.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={`${styles.dot} ${i === active ? styles.dotActive : ""}`}
                  onClick={() => goTo(i)}
                />
              ))}
            </div>

            <button
              type="button"
              className={styles.arrow}
              onClick={next}
              aria-label="Next testimonial"
            >
              <ChevronRight size={18} aria-hidden />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}