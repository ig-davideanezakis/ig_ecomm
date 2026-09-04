import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SkipNav } from "@/components/skip-nav";
import ScrollToTop from "@/components/scroll-to-top";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Infograf — Computer Store | Since 1992",
  description:
    "Infograf — Il tuo punto di riferimento per computer, componenti e assistenza IT a Palermo. Dal 1992.",
};

/** Inline script that blocks rendering until the correct theme class is applied */
const themeScript = `
(function() {
  var theme = localStorage.getItem('theme');
  if (!theme) theme = 'dark';
  var cl = document.documentElement.classList;
  if (theme === 'dark') cl.add('dark');
  else cl.remove('dark');
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="it"
      suppressHydrationWarning
      className={`dark ${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SkipNav />
        <Providers>
          <div id="main-content" tabIndex={-1} className="flex flex-col flex-1 outline-none">
            {children}
          </div>
          <ScrollToTop />
        </Providers>
      </body>
    </html>
  );
}
