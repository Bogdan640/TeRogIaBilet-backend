//concert.js
// Define the Concert model structure
const concertSchema = {
    id: Number,
    name: String,
    genre: String,
    price: String,
    location: String,
    date: String,
    imageUrl: String
};

// In-memory storage for concerts
let concerts = [
    { id: 1, name: "Rock Night", genre: "Rock", price: "$30", location: "London", date: "2025-04-12", imageUrl: '/EventPageImages/0066_large.webp' },
    { id: 2, name: "Metal Madness", genre: "Metal", price: "$40", location: "Berlin", date: "2025-06-23", imageUrl: '/EventPageImages/Black-Sabbath-BTTB-SQ-740x740.jpg' },
    { id: 3, name: "Alternative Echoes", genre: "Alternative Rock", price: "$25", location: "New Orleans", date: "2025-05-14", imageUrl: '/EventPageImages/Gemini_Generated_Image_3mv6w03mv6w03mv6.jpeg' },
    { id: 8, name: "Punk Attack", genre: "Punk", price: "$38", location: "Los Angeles", date: "2025-11-05", imageUrl: '/EventPageImages/Gemini_Generated_Image_64cjjf64cjjf64cj.jpeg' },
    { id: 13, name: "Rock Revival", genre: "Rock", price: "$32", location: "Manchester", date: "2026-04-20", imageUrl: '/EventPageImages/Gemini_Generated_Image_bgpipebgpipebgpi.jpeg' },
    { id: 14, name: "Metal Mayhem", genre: "Metal", price: "$42", location: "Stockholm", date: "2026-06-28", imageUrl: '/EventPageImages/Gemini_Generated_Image_lyfxgzlyfxgzlyfx.jpeg' },
    { id: 15, name: "Alternative Anthems", genre: "Alternative Rock", price: "$27", location: "Seattle", date: "2026-05-18", imageUrl: '/EventPageImages/heavy-metal-concert-poster-template-6f2464a997dc0094c7c82b005cdeaff4_screen.jpg' },
    { id: 16, name: "Hard Rock Heroes", genre: "Rock", price: "$35", location: "Detroit", date: "2026-07-15", imageUrl: '/EventPageImages/images.jpeg'},
    { id: 17, name: "Thrash Titans", genre: "Metal", price: "$45", location: "Sao Paulo", date: "2026-08-25", imageUrl: '/EventPageImages/images (1).jpeg' },
    { id: 18, name: "Indie Rock Night", genre: "Alternative Rock", price: "$30", location: "Austin", date: "2026-11-10", imageUrl: '/EventPageImages/images (2).jpeg' },
    { id: 19, name: "Heavy Metal Thunder", genre: "Metal", price: "$50", location: "Tokyo", date: "2027-01-15", imageUrl:'/EventPageImages/imagesade.jpeg' },
    { id: 20, name: "Grunge Glory", genre: "Alternative Rock", price: "$33", location: "Portland", date: "2027-02-20", imageUrl: '/EventPageImages/stock-vector-strong-and-fearless-rose-flower-eagle-rock-and-roll-music-festival-poster-music-world-tour-2466677729.jpg' },
];

// Track the last time a concert was added or modified for "live" updates simulation
let lastUpdateTime = Date.now();

module.exports = {
    getAll: () => {
        return concerts;
    },

    getById: (id) => {
        return concerts.find(concert => concert.id === id);
    },

    create: (concertData) => {
        const newId = Math.max(...concerts.map(concert => concert.id), 0) + 1;
        const newConcert = { id: newId, ...concertData };
        concerts.push(newConcert);
        lastUpdateTime = Date.now();
        return newConcert;
    },

    update: (id, concertData) => {
        const index = concerts.findIndex(concert => concert.id === id);
        if (index === -1) return null;

        const updatedConcert = { ...concerts[index], ...concertData, id };
        concerts[index] = updatedConcert;
        lastUpdateTime = Date.now();
        return updatedConcert;
    },

    delete: (id) => {
        const index = concerts.findIndex(concert => concert.id === id);
        if (index === -1) return null;

        const deletedConcert = concerts[index];
        concerts.splice(index, 1);
        lastUpdateTime = Date.now();
        return deletedConcert;
    },

    // For filtering and sorting
    filter: (criteria) => {
        let filteredConcerts = [...concerts];

        if (criteria.genre) {
            filteredConcerts = filteredConcerts.filter(
                concert => concert.genre.toLowerCase() === criteria.genre.toLowerCase()
            );
        }

        if (criteria.search) {
            const searchTerm = criteria.search.toLowerCase();
            filteredConcerts = filteredConcerts.filter(
                concert => concert.name.toLowerCase().includes(searchTerm) ||
                    concert.location.toLowerCase().includes(searchTerm)
            );
        }

        return filteredConcerts;
    },

    // Add a random concert (for "live" updates)
    addRandom: () => {
        const genres = ["Rock", "Pop", "Jazz", "Classical", "Hip Hop", "Electronic", "Country", "Metal", "Alternative Rock", "Punk"];
        const locations = ["New York", "Los Angeles", "Chicago", "Houston", "Miami", "Seattle", "Boston", "London", "Berlin", "Tokyo"];
        const dates = [
            "2025-04-15", "2025-04-20", "2025-05-01", "2025-05-10",
            "2025-05-15", "2025-05-25", "2025-06-05", "2025-06-15"
        ];

        const newConcert = {
            id: Math.max(...concerts.map(concert => concert.id), 0) + 1,
            name: `Concert ${Math.floor(Math.random() * 1000)}`,
            genre: genres[Math.floor(Math.random() * genres.length)],
            price: `$${Math.floor(Math.random() * 500) + 50}`,
            location: locations[Math.floor(Math.random() * locations.length)],
            date: dates[Math.floor(Math.random() * dates.length)],
            imageUrl: "/EventPageImages/images.jpeg" // Default image
        };

        concerts.push(newConcert);
        lastUpdateTime = Date.now();
        return newConcert;
    },

    // Remove a random concert (for "live" updates)
    removeRandom: () => {
        if (concerts.length <= 1) return null;

        const randomIndex = Math.floor(Math.random() * concerts.length);
        const removedConcert = concerts[randomIndex];
        concerts.splice(randomIndex, 1);
        lastUpdateTime = Date.now();
        return removedConcert;
    },

    // Update a random concert's price (for "live" updates)
    updateRandomPrice: () => {
        if (concerts.length === 0) return null;

        const randomIndex = Math.floor(Math.random() * concerts.length);
        const concert = concerts[randomIndex];
        concert.price = `$${Math.floor(Math.random() * 500) + 50}`;
        lastUpdateTime = Date.now();
        return concert;
    },

    getLastUpdateTime: () => {
        return lastUpdateTime;
    }
};