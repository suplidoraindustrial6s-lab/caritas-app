import { google } from '@ai-sdk/google';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import prisma from '@/app/lib/prisma';
import { getDocumentContext } from '@/app/lib/rag';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    // Load context from the specific PDF
    const pdfContext = await getDocumentContext('presentación Cáritas y SAMAN.pdf');

    const result = await streamText({
        model: google('gemini-1.5-pro-latest'),
        system: `Eres un asistente útil y amable para la aplicación interna de Cáritas Parroquial.
    
    Tienes acceso a dos fuentes de información:
    1.  **Base de Datos**: Puedes consultar información real sobre beneficiarios, grupos y jornadas usando las herramientas disponibles.
    2.  **Documentación**: Tienes el siguiente contexto extraído del documento "Presentación Cáritas y SAMAN":
        ---
        ${pdfContext.slice(0, 20000)} // Limitar contexto para no exceder tokens si es muy largo
        ---
    
    Si te preguntan algo sobre la base de datos (cuántos beneficiarios hay, quién es tal persona, etc.), USA LAS HERRAMIENTAS.
    Si te preguntan sobre programas, visión, misión o funcionamiento general, USA EL CONTEXTO del documento.
    Si no sabes la respuesta, dilo honestamente. Responde siempre en español.`,
        messages,
        tools: {
            getBeneficiaryCount: tool({
                description: 'Get the total number of beneficiaries',
                parameters: z.object({}),
                execute: async () => {
                    const count = await prisma.beneficiary.count();
                    return count;
                },
            }),
            searchBeneficiary: tool({
                description: 'Search for a beneficiary by name or ID card (cedula)',
                parameters: z.object({ query: z.string() }),
                execute: async ({ query }) => {
                    const beneficiaries = await prisma.beneficiary.findMany({
                        where: {
                            OR: [
                                { fullName: { contains: query } },
                                { nationalId: { contains: query } },
                            ],
                        },
                        take: 5,
                    });
                    return beneficiaries;
                },
            }),
            getServiceSummary: tool({
                description: 'Get summary of services provided (food, clothes, medical)',
                parameters: z.object({}),
                execute: async () => {
                    const food = await prisma.attendance.count({ where: { receivedFood: true } });
                    const clothesAgg = await prisma.attendance.aggregate({ where: { receivedClothes: true }, _sum: { clothesQuantity: true } });
                    const medical = await prisma.attendance.count({ where: { receivedMedical: true } });
                    return { foodPackages: food, clothesItems: clothesAgg._sum.clothesQuantity || 0, medicalAttentions: medical };
                }
            })
        },
    });

    return result.toDataStreamResponse();
}
