// rberenguel/eixut/eixut-4ac6548c249ebe36481b419891e1f9d663f25fb5/js/map.js
class MapGenerator {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.grid = this.createGrid();
  }

  createGrid() {
    const grid = [];
    for (let y = 0; y < this.height; y++) {
      grid[y] = [];
      for (let x = 0; x < this.width; x++) {
        grid[y][x] = null;
      }
    }
    return grid;
  }

  generate(maxRooms) {
    this.grid = this.createGrid();
    const rooms = []; // A list of all created room coordinates

    // Create the starting room
    const startX = Math.floor(this.width / 2);
    const startY = Math.floor(this.height / 2);
    this.grid[startY][startX] = {
      type: "start",
      cleared: true,
      enemies: 0,
      splatters: [],
      items: ["shotgun", "health"], // DEBUG: Force items in start room
    };
    rooms.push({ x: startX, y: startY });
    let roomCount = 1;

    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 0, y: 1 }, // Down
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 }, // Right
    ];

    // Keep trying to add rooms until the max is reached
    while (roomCount < maxRooms) {
      // Pick a random *existing* room to branch from
      const randomRoom = rooms[Math.floor(Math.random() * rooms.length)];

      // Pick a random direction to try and build
      const randomDir =
        directions[Math.floor(Math.random() * directions.length)];

      const newX = randomRoom.x + randomDir.x;
      const newY = randomRoom.y + randomDir.y;

      // If the new coordinates are valid and empty, create a new room
      if (
        newX >= 0 &&
        newX < this.width &&
        newY >= 0 &&
        newY < this.height &&
        !this.grid[newY][newX]
      ) {
        const enemyCount = Math.floor(Math.random() * 3) + 1;
        this.grid[newY][newX] = {
          type: "normal",
          cleared: false,
          enemies: enemyCount,
          splatters: [],
          items: [],
        };
        rooms.push({ x: newX, y: newY });
        roomCount++;
      }
    }

    // Designate the last room
    let lastRoom = rooms[0];
    let maxDist = 0;
    for (const room of rooms) {
      const dist = Math.abs(room.x - startX) + Math.abs(room.y - startY);
      if (dist > maxDist) {
        maxDist = dist;
        lastRoom = room;
      }
    }
    this.grid[lastRoom.y][lastRoom.x].isLast = true;

    // Add items to other rooms (excluding start)
    const availableRooms = rooms.filter(
      (room) => this.grid[room.y][room.x].type === "normal",
    );
    const numberOfItems = Math.min(
      Math.floor(Math.random() * 2) + 1,
      availableRooms.length,
    );

    for (let i = 0; i < numberOfItems; i++) {
      const randomRoomIndex = Math.floor(Math.random() * availableRooms.length);
      const room = availableRooms[randomRoomIndex];
      availableRooms.splice(randomRoomIndex, 1);
      const itemType = Math.random() < 0.5 ? "health" : "shotgun";
      this.grid[room.y][room.x].items.push(itemType);
    }

    console.log("Map Generated:", JSON.parse(JSON.stringify(this.grid)));
  }
}

export { MapGenerator };