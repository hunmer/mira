"use client";

import { useI18n } from "@/lib/i18n/i18n-provider";

const PRIVACY_POLICY_LAST_UPDATED = "2026-08-24";

export function PrivacySection() {
  const { locale, t } = useI18n();
  const p = t.footer.privacy;
  const lastUpdated = new Intl.DateTimeFormat(
    locale === "zh" ? "zh-CN" : "en-US",
    { dateStyle: "long" }
  ).format(new Date(PRIVACY_POLICY_LAST_UPDATED));

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 md:px-6 md:py-24">
      <h1 className="text-3xl font-bold md:text-4xl">{p.title}</h1>
      <p className="text-muted-foreground mt-3 text-sm">
        {p.lastUpdatedLabel}: {lastUpdated}
      </p>
      <div className="mt-10 space-y-8">
        {p.sections.map((section) => (
          <section className="space-y-3" key={section.title}>
            <h2 className="text-lg font-semibold">{section.title}</h2>
            {section.lead && (
              <p className="text-muted-foreground leading-relaxed">
                {section.lead}
              </p>
            )}
            {section.items.length > 0 && (
              <ul className="text-muted-foreground list-disc space-y-1 ps-5 leading-relaxed">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{p.contactTitle}</h2>
          <p className="text-muted-foreground leading-relaxed">
            {p.contactLead}{" "}
            <a
              className="transition-colors hover:text-foreground"
              href="mailto:liaoyanjie2000@gmail.com"
            >
              liaoyanjie2000@gmail.com
            </a>
          </p>
        </section>
      </div>
    </section>
  );
}
