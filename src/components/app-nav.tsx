import type { IconType } from "react-icons";
import { LuBookOpen, LuFlaskConical, LuGithub, LuHouse, LuLightbulb } from "react-icons/lu";

import { LanguageToggle } from "@/components/language-toggle";
import { useAutoHideNav } from "@/hooks/use-auto-hide-nav";
import { useScrollSectionHash } from "@/hooks/use-scroll-section-hash";
import { useI18n } from "@/i18n";
import logoUrl from "@/logo.svg";

const navItems = [
  { id: "overview", href: "#overview", key: "overview", icon: LuHouse },
  {
    id: "highlights",
    href: "#highlights",
    key: "highlights",
    icon: LuLightbulb,
  },
  { id: "summary", href: "#summary", key: "summary", icon: LuBookOpen },
  {
    id: "playground",
    href: "#playground",
    key: "playground",
    icon: LuFlaskConical,
  },
] as const;

const externalItems = [
  {
    href: "https://github.com/TokenFlow-chat/emlib",
    key: "github",
    icon: LuGithub,
  },
] as const satisfies readonly {
  href: string;
  key: "github";
  icon: IconType;
}[];

export function AppNav() {
  const { messages } = useI18n();
  const { activeId } = useScrollSectionHash(navItems.map((item) => item.id));
  const { isVisible } = useAutoHideNav();

  return (
    <header
      className={`app-nav-frame sticky top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4 lg:px-6 lg:pt-5 ${isVisible ? "app-nav-frame-visible" : "app-nav-frame-hidden"}`}
    >
      <div className="app-nav-shell mx-auto max-w-370">
        <div className="app-nav flex flex-col gap-3 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <a
            href="#overview"
            className="inline-flex min-h-10 items-center gap-3 text-[color:var(--ink)] no-underline"
          >
            <img
              src={logoUrl}
              alt=""
              aria-hidden="true"
              className="size-9 shrink-0 rounded-full border border-[color:var(--line)]/80 bg-black/92 p-1 shadow-[0_10px_24px_rgba(23,33,44,0.12)]"
            />
            <span className="flex items-center pt-[0.02em] font-display text-[1.35rem] leading-none">
              {messages.app.title}
            </span>
          </a>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:flex-1 lg:justify-end">
            <nav
              aria-label="Primary"
              className="flex min-w-0 items-center gap-1 overflow-x-auto pb-1 sm:pb-0"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeId === item.id;

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`app-nav-link gap-2 ${isActive ? "app-nav-link-active" : ""}`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {messages.app.nav[item.key]}
                  </a>
                );
              })}
              {externalItems.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    className="app-nav-link gap-2"
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {messages.app.nav[item.key]}
                  </a>
                );
              })}
            </nav>
            <div className="not-sm:hidden">
              <LanguageToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
