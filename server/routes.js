/**
 * Legon Campus Shuttle Route Data
 * Pre-defined stops and route information
 */

const legonStops = [
    {
        id: 'ugbs',
        name: 'UGBS',
        coordinates: [5.6528187834024894, -0.1889719836543335],
        description: 'University of Ghana Business School'
    },
    {
        id: 'centralCafeteria',
        name: 'CC',
        coordinates: [5.647024205093812, -0.1868756662706847],
        description: 'Central Cafeteria'
    },
    {
        id: 'jqb',
        name: 'JQB',
        coordinates: [5.6525834611765005, -0.18174035739304048],
        description: 'Lecture Building'
    },
    {
        id: 'pentagon',
        name: 'Pentagon',
        coordinates: [5.657448763209479, -0.18177955790804562],
        description: 'Pentagon hostel area'
    },
    {
        id: 'math',
        name: 'Maths Dept',
        coordinates: [5.654102662727119, -0.18442869140145893],
        description: 'Mathematics Department'
    },
    {
        id: 'NNB',
        name: 'NNB',
        coordinates: [5.656213632021257, -0.18770534351577942],
        description: 'Lecture Hall'
    }
];

const defaultRoute = {
    id: 'main-route',
    name: 'Main Campus Loop',
    stops: legonStops.map(stop => stop.id),
    color: '#3B82F6'
};

module.exports = {
    legonStops,
    defaultRoute
};
