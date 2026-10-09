import "leaflet/dist/leaflet.css";
import "./globals.css";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";

export const metadata = {
  title: "GasoCerca — gasolineras y precios en México",
  description:
    "Encuentra las gasolineras más cercanas y los precios más baratos por litro en México.",
  applicationName: "GasoCerca",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "GasoCerca",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon-192.svg", type: "image/svg+xml" }, { url: "/icon-192.png" }],
    apple: ["/apple-touch-icon.png", "/icon-192.svg"],
  },
};

export const viewport = {
  themeColor: "#153846",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es-MX">
      <body>
        {children}
        {process.env.NODE_ENV === "production" && <ServiceWorkerRegistration />}
      </body>
    </html>
  );
}
