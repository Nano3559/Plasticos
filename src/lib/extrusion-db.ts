import { prisma } from "@/lib/prisma"
import type { ParteExtrusionDatos } from "@/lib/extrusion"
import type { AreaParte } from "@/lib/secciones-produccion"

export async function consultarExtrusion(ordenId?:string,area:AreaParte="EXTRUSION") {
  const partes = await prisma.parteExtrusion.findMany({where:{area,...(ordenId?{ordenId}:{})},orderBy:[{createdAt:"desc"},{id:"desc"}],include:{orden:{include:{cliente:true}},autor:{select:{nombre:true}}}})
  const vistos=new Set<string>()
  return partes.filter(p=>{if(vistos.has(p.ordenId))return false;vistos.add(p.ordenId);return true}).map(p=>({...p,datos:p.datos as unknown as ParteExtrusionDatos}))
}

export async function historialExtrusion(ordenId?:string,area:AreaParte="EXTRUSION") {
  return prisma.parteExtrusion.findMany({
    where: {area,...(ordenId?{ordenId}:{})},
    orderBy: [{createdAt:"desc"},{id:"desc"}],
    take: 20,
    select: {
      id:true, archivo:true, hoja:true, createdAt:true,
      autor:{select:{nombre:true}},
      orden:{select:{numero:true,refExterna:true}},
    },
  })
}
