export const categoriesGlider = ['A', 'B', 'C', 'D', 'O', 'K', 'bi'] as const;
export const directionsWind = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] as const;
export const categoriesScore = [{to: 50}, {from: 50, to: 100}, {from: 100, to: 200}, {from: 200, to: 300}, {from: 300}];
export const namesMonth = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export type categoryGlider = {
    [Property in typeof categoriesGlider[number]]: boolean;
};
export type selectionMonth = {
    [Property in typeof namesMonth[number]]: boolean;
};
export type directionWind = {
    [Property in typeof directionsWind[number]]: boolean;
};
