import "./globals.css"
import { Nunito } from "next/font/google"

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: '--font-nunito',
})

export const metadata = {
  title: 'Letsee - Oyun Zamanı!',
  description: 'Arkadaşlarınla eğlenceli bir turnuva deneyimi',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${nunito.className} bg-gray-900 text-white`}>{children}</body>
    </html>
  )
}
