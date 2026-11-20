import "./globals.css";

export const metadata = {
  title: "SB Wears",
  description: "SB Wears — ethnic and contemporary fashion.",
  icons: { icon: "/logowhite.png", apple: "/logowhite.png" },
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
