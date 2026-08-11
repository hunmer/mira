"use client";
import { motion, useReducedMotion } from "motion/react";
import React from "react";
import { useI18n } from "@/lib/i18n/i18n-provider";

type Testimonial = {
  text: string;
  image: string;
  name: string;
  role: string;
};

const IMAGES = [
  "https://randomuser.me/api/portraits/women/1.jpg",
  "https://randomuser.me/api/portraits/men/2.jpg",
  "https://randomuser.me/api/portraits/women/3.jpg",
  "https://randomuser.me/api/portraits/men/4.jpg",
  "https://randomuser.me/api/portraits/women/5.jpg",
  "https://randomuser.me/api/portraits/women/6.jpg",
  "https://randomuser.me/api/portraits/men/7.jpg",
  "https://randomuser.me/api/portraits/women/8.jpg",
  "https://randomuser.me/api/portraits/men/9.jpg",
];

function TestimonialsColumn(props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) {
  return (
    <div className={props.className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        className="flex flex-col gap-6 pb-6"
        transition={{
          duration: props.duration || 10,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
          repeatType: "loop",
        }}
      >
        {[
          ...new Array(2).fill(0).map((_, index) => (
            <React.Fragment key={`column-${index}`}>
              {props.testimonials.map(({ text, image, name, role }) => (
                <div
                  className="w-full max-w-xs rounded-3xl border bg-card p-8 shadow-lg dark:bg-card/20 dark:shadow-foreground/10"
                  key={name}
                >
                  <div>{text}</div>
                  <div className="mt-5 flex items-center gap-2">
                    <img
                      alt={name}
                      className="h-10 w-10 rounded-full"
                      height={40}
                      src={image}
                      width={40}
                    />
                    <div className="flex flex-col">
                      <div className="font-medium leading-5 tracking-tight">
                        {name}
                      </div>
                      <div className="leading-5 tracking-tight opacity-60">
                        {role}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </React.Fragment>
          )),
        ]}
      </motion.div>
    </div>
  );
}

export function TestimonialsSection() {
  const { t } = useI18n();
  const shouldReduceMotion = useReducedMotion();
  const items = t.testimonials.items.map((it, i) => ({
    ...it,
    image: IMAGES[i] ?? IMAGES[0],
  }));
  const firstColumn = items.slice(0, 3);
  const secondColumn = items.slice(3, 6);
  const thirdColumn = items.slice(6, 9);

  return (
    <section className="relative py-10">
      <div className="mx-auto max-w-5xl">
        <motion.div
          className="mx-auto flex max-w-sm flex-col items-center justify-center gap-4"
          initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          viewport={{ once: true, margin: "-60px" }}
          whileInView={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-center">
            <div className="rounded-lg border px-4 py-1">{t.testimonials.tag}</div>
          </div>

          <h2 className="font-bold text-3xl tracking-tighter lg:text-4xl">
            {t.testimonials.title}
          </h2>
          <p className="text-center text-muted-foreground text-sm">
            {t.testimonials.subtitle}
          </p>
        </motion.div>

        <div className="mt-10 flex max-h-[740px] justify-center gap-6 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]">
          <TestimonialsColumn duration={16} testimonials={firstColumn} />
          <TestimonialsColumn
            className="hidden md:block"
            duration={20}
            testimonials={secondColumn}
          />
          <TestimonialsColumn
            className="hidden lg:block"
            duration={18}
            testimonials={thirdColumn}
          />
        </div>
      </div>
    </section>
  );
}
