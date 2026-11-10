import {
  BarChart3,
  Calculator,
  Factory,
  Home,
  Package,
  Receipt,
  type LucideIcon,
} from "lucide-react"

export type Rol = "OPERADOR" | "ALMACEN" | "ADMIN" | "GERENCIA"

export type Modulo = {
  href: string
  label: string
  descripcion: string
  icon: LucideIcon
  /** Color del módulo (paleta de proyectos de Todoist), usado en los íconos de acceso. */
  color: string
  roles: Rol[]
}

export const MODULOS: Modulo[] = [
  { href: "/dashboard", label: "Inicio", descripcion: "Resumen del día", icon: Home, color: "#07899b", roles: ["OPERADOR", "ALMACEN", "ADMIN", "GERENCIA"] },
  { href: "/inventario", label: "Inventario", descripcion: "Materia prima y vales", icon: Package, color: "#246fe0", roles: ["ALMACEN", "ADMIN", "GERENCIA"] },
  { href: "/produccion", label: "Producción", descripcion: "Órdenes y pesajes", icon: Factory, color: "#eb8909", roles: ["OPERADOR", "ADMIN", "GERENCIA"] },
  { href: "/produccion/extrusion", label: "Extrusión", descripcion: "Partes, bobinas y reportes", icon: Factory, color: "#07899b", roles: ["OPERADOR", "ALMACEN", "ADMIN", "GERENCIA"] },
  { href: "/produccion/impresion", label: "Impresión", descripcion: "Partes impresos y reportes", icon: Factory, color: "#884dff", roles: ["OPERADOR", "ALMACEN", "ADMIN", "GERENCIA"] },
  { href: "/costos", label: "Costos", descripcion: "Costo por 100 kg", icon: Calculator, color: "#884dff", roles: ["ADMIN", "GERENCIA"] },
  { href: "/cobranzas", label: "Cobranzas", descripcion: "Cartera y pagos", icon: Receipt, color: "#299438", roles: ["ADMIN", "GERENCIA"] },
  { href: "/reportes", label: "Reportes", descripcion: "Exportar a Excel", icon: BarChart3, color: "#b8255f", roles: ["ADMIN", "GERENCIA"] },
]

/** Acción principal de cada rol: el botón grande de la barra de turno. */
export const ACCION_PRINCIPAL: Record<Rol, { href: string; label: string }> = {
  OPERADOR: { href: "/produccion/registro", label: "Registrar producción" },
  ALMACEN: { href: "/inventario/salida", label: "Nuevo vale de salida" },
  ADMIN: { href: "/cobranzas/pago", label: "Registrar pago" },
  GERENCIA: { href: "/produccion/ordenes/nueva", label: "Nueva orden" },
}

export const ROL_LABEL: Record<Rol, string> = {
  OPERADOR: "Operador",
  ALMACEN: "Almacén",
  ADMIN: "Administración",
  GERENCIA: "Gerencia",
}
