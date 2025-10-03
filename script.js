// Campus Locations Data
const locations = {
    'PCE Main Gate': { lat: 21.103063, lng: 79.004020 },
    'First Year Canteen': { lat: 21.103954, lng: 79.005062 },
    'Civil/Electrical': { lat: 21.103659, lng: 79.005430 },
    'First Year Building': { lat: 21.103415, lng: 79.005001 },
    'Swimming Pool': { lat: 21.103705, lng: 79.006245 },
    'Sports Building': { lat: 21.102051, lng: 79.004304 },
    'First Ground': { lat: 21.102249, lng: 79.004838 },
    'PCE Lake': { lat: 21.102662, lng: 79.006276 },
    'IT Garden': { lat: 21.101866, lng: 79.006795 },
    'IT Auditorium': { lat: 21.101265, lng: 79.005897 },
    'IT/CS/CT Department': { lat: 21.101590, lng: 79.006817 },
    'Saraswati Temple': { lat: 21.101881, lng: 79.005989 },
    'Library': { lat: 21.101417, lng: 79.007840 },
    'AIDS/IOT/Robotics': { lat: 21.101714, lng: 79.007636 },
    'Main Canteen': { lat: 21.102479, lng: 79.007738 },
    'EE/ETC/AERO': { lat: 21.102353, lng: 79.007597 },
    'Mahadev Temple': { lat: 21.103592, lng: 79.007413 },
    'Mechanical & T&P': { lat: 21.101812, lng: 79.009012 },
    'Admin Section': { lat: 21.101874, lng: 79.009377 },
    'Mechanical Ground': { lat: 21.101601, lng: 79.009004 },
    'MBA/BBA': { lat: 21.102040, lng: 79.008184 }
};

// Global Variables
let currentLocation = 'PCE Main Gate';
let map, currentMarker, destMarker, routeLine;

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

// Dijkstra's Algorithm for shortest path
function dijkstraShortestPath(start, end) {
    const distances = {};
    const previous = {};
    const unvisited = new Set(Object.keys(locations));

    // Initialize distances
    for (let location in locations) {
        distances[location] = Infinity;
        previous[location] = null;
    }
    distances[start] = 0;

    // Main algorithm loop
    while (unvisited.size > 0) {
        // Find node with minimum distance
        let current = null;
        let minDist = Infinity;
        
        for (let location of unvisited) {
            if (distances[location] < minDist) {
                minDist = distances[location];
                current = location;
            }
        }

        if (current === null || current === end) break;
        unvisited.delete(current);

        // Update distances to neighbors
        for (let neighbor in locations) {
            if (unvisited.has(neighbor)) {
                const dist = calculateDistance(
                    locations[current].lat, locations[current].lng,
                    locations[neighbor].lat, locations[neighbor].lng
                );
                const alt = distances[current] + dist;
                
                if (alt < distances[neighbor]) {
                    distances[neighbor] = alt;
                    previous[neighbor] = current;
                }
            }
        }
    }

    // Reconstruct path
    const path = [];
    let current = end;
    while (current !== null) {
        path.unshift(current);
        current = previous[current];
    }

    return { path, distance: distances[end] };
}

// Start Navigation - Simulate QR Scan
function startNavigation() {
    // Get URL parameters for actual QR code integration
    const urlParams = new URLSearchParams(window.location.search);
    const locationParam = urlParams.get('location');
    
    if (locationParam) {
        // Convert URL parameter to location name
        currentLocation = locationParam.replace(/_/g, ' ');
    } else {
        // Simulate random location for demo
        const locationKeys = Object.keys(locations);
        currentLocation = locationKeys[Math.floor(Math.random() * locationKeys.length)];
    }
    
    // Switch screens
    document.getElementById('welcomeScreen').classList.add('hidden');
    document.getElementById('destinationScreen').classList.remove('hidden');
    
    // Render destination list
    renderDestinations();
}

// Render Destination List
function renderDestinations() {
    const list = document.getElementById('destinationList');
    list.innerHTML = '';
    
    for (let location in locations) {
        if (location !== currentLocation) {
            const item = document.createElement('div');
            item.className = 'destination-item';
            
            // Calculate distance from current location
            const dist = calculateDistance(
                locations[currentLocation].lat,
                locations[currentLocation].lng,
                locations[location].lat,
                locations[location].lng
            );
            
            item.innerHTML = `
                <h3>${location}</h3>
                <p>📏 Approx. ${dist.toFixed(0)}m away</p>
            `;
            item.onclick = () => showNavigation(location);
            list.appendChild(item);
        }
    }
}

// Filter Destinations based on search
function filterDestinations() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    const items = document.querySelectorAll('.destination-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// Show Navigation Screen with Map
function showNavigation(destination) {
    // Switch screens
    document.getElementById('destinationScreen').classList.add('hidden');
    document.getElementById('navigationScreen').classList.remove('hidden');
    
    // Calculate shortest path using Dijkstra
    const result = dijkstraShortestPath(currentLocation, destination);
    const distance = result.distance;
    const walkTime = (distance / 1.4).toFixed(0); // Average walking speed 1.4 m/s
    
    // Update navigation info
    document.getElementById('fromLocation').textContent = currentLocation;
    document.getElementById('toLocation').textContent = destination;
    document.getElementById('distance').textContent = distance.toFixed(0) + ' meters';
    document.getElementById('walkTime').textContent = walkTime + ' seconds';
    
    // Initialize map with route
    initMap(result.path);
}

// Initialize Leaflet Map with Google Satellite View
function initMap(path) {
    // Remove existing map if any
    if (map) {
        map.remove();
    }

    const startLoc = locations[path[0]];
    
    // Create map centered on start location
    map = L.map('map').setView([startLoc.lat, startLoc.lng], 17);

    // Add Google Satellite tile layer
    L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google'
    }).addTo(map);

    // Create custom markers
    const startIcon = L.divIcon({
        html: '<div style="background: #4CAF50; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [30, 30],
        className: ''
    });

    const endIcon = L.divIcon({
        html: '<div style="background: #F44336; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [30, 30],
        className: ''
    });

    // Convert path to coordinates
    const pathCoords = path.map(loc => [locations[loc].lat, locations[loc].lng]);
    
    // Add start marker
    currentMarker = L.marker([locations[path[0]].lat, locations[path[0]].lng], { icon: startIcon })
        .addTo(map)
        .bindPopup(`<b>Start:</b> ${path[0]}`);
    
    // Add destination marker
    destMarker = L.marker([locations[path[path.length - 1]].lat, locations[path[path.length - 1]].lng], { icon: endIcon })
        .addTo(map)
        .bindPopup(`<b>Destination:</b> ${path[path.length - 1]}`);

    // Draw route line
    routeLine = L.polyline(pathCoords, {
        color: '#667eea',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10',
        lineJoin: 'round'
    }).addTo(map);

    // Fit map to show entire route
    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

    // Add waypoint markers
    path.forEach((loc, index) => {
        if (index > 0 && index < path.length - 1) {
            L.circleMarker([locations[loc].lat, locations[loc].lng], {
                radius: 5,
                fillColor: '#764ba2',
                color: '#fff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).addTo(map).bindPopup(`<b>Via:</b> ${loc}`);
        }
    });
}

// Reset Navigation - Select new destination
function resetNavigation() {
    document.getElementById('navigationScreen').classList.add('hidden');
    document.getElementById('destinationScreen').classList.remove('hidden');
    document.getElementById('searchBox').value = '';
    renderDestinations();
}

// Exit Navigation - Return to welcome screen
function exitNavigation() {
    document.getElementById('navigationScreen').classList.add('hidden');
    document.getElementById('welcomeScreen').classList.remove('hidden');
    
    // Clear map
    if (map) {
        map.remove();
        map = null;
    }
}

// Check for location parameter on page load
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const locationParam = urlParams.get('location');
    
    if (locationParam) {
        // Auto-start navigation if location parameter exists
        setTimeout(startNavigation, 500);
    }
});