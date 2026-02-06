"use client"

import { useState } from "react"
import Image from "next/image"

export default function HomePage() {
  const [touchedButton, setTouchedButton] = useState<string | null>(null)

  const handleTouchStart = (button: string) => {
    setTouchedButton(button)
  }

  const handleTouchEnd = () => {
    setTimeout(() => setTouchedButton(null), 300)
  }

  return (
    <main className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 py-12">
      {/* Brand Header */}
      <header className="mb-10 text-center">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight">
          El{" "}
          <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
            Súper
          </span>{" "}
          <span className="text-yellow-400">Agropecuario</span>
        </h1>
        <p className="mt-3 text-base md:text-lg text-muted-foreground">
          <span className="text-foreground">¿</span>Qué estás buscando hoy<span className="text-foreground">?</span>
        </p>
      </header>

      {/* Buttons Container */}
      <div className="w-full max-w-xl flex flex-col md:flex-row gap-5">
        {/* Mascotas Button */}
        <a
          href="#mascotas"
          className={`
            group relative flex-1 flex flex-col items-center justify-center
            rounded-2xl p-8 min-h-[200px]
            transition-all duration-300 ease-out
            cursor-pointer overflow-hidden
            bg-gradient-to-br from-orange-500 via-red-500 to-pink-500
            shadow-[0_8px_32px_rgba(255,71,87,0.3)]
            hover:shadow-[0_12px_48px_rgba(255,71,87,0.5)]
            hover:scale-[1.03] active:scale-[0.98]
            ${touchedButton === "mascotas" ? "scale-[1.03] shadow-[0_12px_48px_rgba(255,71,87,0.5)]" : ""}
          `}
          onTouchStart={() => handleTouchStart("mascotas")}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="relative w-24 h-24 mb-4">
            {/* Logo Rojo - Default */}
            <Image
              src="/images/logo-rojo.jpg"
              alt="Mascotas"
              width={96}
              height={96}
              className={`
                absolute inset-0 w-full h-full object-contain rounded-full
                transition-all duration-300
                ${touchedButton === "mascotas" ? "opacity-0 scale-90" : "opacity-100 scale-100"}
                group-hover:opacity-0 group-hover:scale-90
              `}
            />
            {/* Logo Blanco - Hover */}
            <Image
              src="/images/logo-blanco.jpg"
              alt="Mascotas"
              width={96}
              height={96}
              className={`
                absolute inset-0 w-full h-full object-contain rounded-full
                transition-all duration-300
                ${touchedButton === "mascotas" ? "opacity-100 scale-110" : "opacity-0 scale-100"}
                group-hover:opacity-100 group-hover:scale-110
              `}
            />
          </div>
          <span className="text-xl md:text-2xl font-extrabold text-white uppercase tracking-wide">
            Mascotas
          </span>
          <span 
            className={`
              text-sm text-white/90 mt-1
              transition-all duration-300
              ${touchedButton === "mascotas" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
              group-hover:opacity-100 group-hover:translate-y-0
            `}
          >
            Perrote y Gatote
          </span>
        </a>

        {/* Herramientas Button */}
        <a
          href="#herramientas"
          className={`
            group relative flex-1 flex flex-col items-center justify-center
            rounded-2xl p-8 min-h-[200px]
            transition-all duration-300 ease-out
            cursor-pointer overflow-hidden
            bg-gradient-to-br from-yellow-400 via-yellow-600 to-neutral-900
            shadow-[0_8px_32px_rgba(245,197,24,0.3)]
            hover:shadow-[0_12px_48px_rgba(245,197,24,0.5)]
            hover:scale-[1.03] active:scale-[0.98]
            ${touchedButton === "herramientas" ? "scale-[1.03] shadow-[0_12px_48px_rgba(245,197,24,0.5)]" : ""}
          `}
          onTouchStart={() => handleTouchStart("herramientas")}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className="relative w-24 h-24 mb-4">
            {/* Toro Amarillo - Default */}
            <Image
              src="/images/toro-amarillo.png"
              alt="Herramientas"
              width={96}
              height={96}
              className={`
                absolute inset-0 w-full h-full object-contain rounded-full
                transition-all duration-300
                ${touchedButton === "herramientas" ? "opacity-0 scale-90" : "opacity-100 scale-100"}
                group-hover:opacity-0 group-hover:scale-90
              `}
            />
            {/* Toro Negro - Hover */}
            <Image
              src="/images/toro-negro.png"
              alt="Herramientas"
              width={96}
              height={96}
              className={`
                absolute inset-0 w-full h-full object-contain rounded-full
                transition-all duration-300
                ${touchedButton === "herramientas" ? "opacity-100 scale-110" : "opacity-0 scale-100"}
                group-hover:opacity-100 group-hover:scale-110
              `}
            />
          </div>
          <span className="text-xl md:text-2xl font-extrabold text-white uppercase tracking-wide">
            Herramientas
          </span>
          <span 
            className={`
              text-sm text-white/90 mt-1
              transition-all duration-300
              ${touchedButton === "herramientas" ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
              group-hover:opacity-100 group-hover:translate-y-0
            `}
          >
            Súper Agro Herramientas
          </span>
        </a>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-xs text-muted-foreground text-center">
        © 2026 El Súper Agropecuario. Todos los derechos reservados.
      </footer>
    </main>
  )
}
