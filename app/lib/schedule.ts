
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

    // Anchor: Feb 3 2026 is Fe (Week A)
    const anchorDate = new Date(2026, 1, 3); // Month is 0-indexed: 1 = Feb
    const oneDay = 24 * 60 * 60 * 1000;

    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay(); // 0Sun, 1Mon, 2Tue, 3Wed, 4Thu, 5Fri, 6Sat

        // Check if Tuesday (2) or Thursday (4)
        if (dayOfWeek === 2 || dayOfWeek === 4) {
            const dateStr = currentDate.toISOString().split('T')[0];

            // Check Holidays
            if (!HOLIDAYS_2026.includes(dateStr)) {
                // Calculate weeks from anchor to determine Cycle
                // anchorDate is Tue Feb 3.
                // Difference in weeks
                const diffTime = currentDate.getTime() - anchorDate.getTime();
                const diffWeeks = Math.floor(Math.round(diffTime / oneDay) / 7);

                // If diffWeeks is even: Week A (Same as Feb 3). If odd: Week B.
                // Note: This assumes simple alternating.

                const isCycleA = diffWeeks % 2 === 0;

                if (dayOfWeek === 2) { // Tuesday
                    if (isCycleA) schedule.push({ date: dateStr, groupName: 'Fe' });
                    else schedule.push({ date: dateStr, groupName: 'Caridad' });
                } else { // Thursday
                    if (isCycleA) schedule.push({ date: dateStr, groupName: 'Esperanza' });
                    else schedule.push({ date: dateStr, groupName: 'Amor' });
                }
            }
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }
    return schedule;
};
