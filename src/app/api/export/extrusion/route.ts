import { NextRequest } from "next/server"
import { exportarPartes } from "@/lib/partes-export"
export async function GET(req:NextRequest) { return exportarPartes(req,"EXTRUSION") }
