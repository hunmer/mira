"use client";

import { PlusIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/lib/i18n/i18n-provider";

export function FaqsSection() {
  const { t } = useI18n();
  const shouldReduceMotion = useReducedMotion();
  const faqs = t.faqs.items;

  return (
    <section className="mx-auto grid w-full max-w-5xl grid-cols-1 py-20 md:grid-cols-2 lg:border-x">
      <motion.div
        className="px-4 pt-12 pb-6"
        initial={shouldReduceMotion ? false : { opacity: 0, x: -24 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        viewport={{ once: true, margin: "-80px" }}
        whileInView={{ opacity: 1, x: 0 }}
      >
        <div className="space-y-5">
          <h2 className="text-balance font-bold text-4xl md:text-6xl lg:font-black">
            {t.faqs.title}
          </h2>
          <p className="text-muted-foreground">{t.faqs.subtitle}</p>
          <p className="text-muted-foreground">
            {t.faqs.contactLead}{" "}
            <a className="text-primary hover:underline" href="#">
              {t.faqs.contactLink}
            </a>
          </p>
        </div>
      </motion.div>
      <motion.div
        className="relative place-content-center"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
        transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
        viewport={{ once: true, margin: "-80px" }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        {/* vertical guide line */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 h-full w-px bg-border"
        />

        <Accordion collapsible type="single">
          {faqs.map((item, i) => (
            <AccordionItem
              className="group relative border-b pl-5 first:border-t last:border-b"
              key={`faq-${i}`}
              value={`item-${i + 1}`}
            >
              {/*  plus */}
              <PlusIcon
                aria-hidden="true"
                className="-bottom-[5.5px] -translate-x-1/2 pointer-events-none absolute left-[12.5px] size-2.5 text-muted-foreground group-last:hidden"
              />

              <AccordionTrigger className="px-4 py-4 text-[15px] leading-6 hover:no-underline">
                {item.title}
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4 text-muted-foreground">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </motion.div>
    </section>
  );
}
