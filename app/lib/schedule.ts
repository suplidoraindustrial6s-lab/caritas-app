
export const HOLIDAYS_2026 = [
    '2026-01-01', // Año Nuevo
    '2026-02-16', // Carnaval
    '2026-02-17', // Carnaval
    '2026-03-19', // San José (Feriado Bancario/Religioso a veces) -> User mentioned holidays generally.
    '2026-04-02', // Jueves Santo
    '2026-04-03', // Viernes Santo
    '2026-04-19', // Declaración Independencia
    '2026-05-01', // Día del Trabajo
    '2026-06-24', // Batalla de Carabobo
    '2026-07-05', // Independencia
    '2026-07-24', // Natalicio Bolívar
    '2026-10-12', // Resistencia Indígena
    '2026-12-24', // Navidad
    '2026-12-25', // Navidad
    '2026-12-31', // Fin de Año
];

// Seed dates from images
// Fe: 3/2/2026 (Tue) -> Week A
// Esperanza: 5/2/2026 (Thu) -> Week A
// Caridad: 10/2/2026 (Tue) -> Week B
// Amor: 12/2/2026 (Thu) -> Week B

export type ServiceDay = {
    date: string; // YYYY-MM-DD
    groupName: 'Fe' | 'Esperanza' | 'Caridad' | 'Amor';
    isExtraordinary?: boolean;
};

export const getServiceSchedule2026 = (): ServiceDay[] => {
    const schedule: ServiceDay[] = [];
    const startDate = new Date(2026, 0, 1); // Jan 1 2026
    const endDate = new Date(2026, 11, 31);

    // Group sequence: Fe -> Esperanza -> Caridad -> Amor
    const groups: ('Fe' | 'Esperanza' | 'Caridad' | 'Amor')[] = ['Fe', 'Esperanza', 'Caridad', 'Amor'];
    let groupIndex = 0;

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0Sun, 1Mon, 2Tue, 3Wed, 4Thu, 5Fri, 6Sat
        const dateStr = currentDate.toISOString().split('T')[0];
        const isHoliday = HOLIDAYS_2026.includes(dateStr);

        // Service days are Tuesdays (2) and Thursdays (4)
        if ((dayOfWeek === 2 || dayOfWeek === 4) && !isHoliday) {
            // Assign next group in sequence
            schedule.push({
                date: dateStr,
                groupName: groups[groupIndex % 4]
            });
            groupIndex++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }
    return schedule;
};
