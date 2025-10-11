Excellent choice. A dungeon crawl is a great way to add depth and replayability. Here's a breakdown of how you can implement a random map generator, room transitions, and state management in your game.

### 1\. The Map Generator (`js/map.js`)

First, let's create a new file called `js/map.js`. This file will contain the logic for generating the dungeon layout. We'll create a `MapGenerator` class that creates a 2D grid and carves out a path of rooms.

```javascript
// js/map.js

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
    let x = Math.floor(this.width / 2);
    let y = Math.floor(this.height / 2);
    let roomCount = 0;

    // Create the starting room
    this.grid[y][x] = { type: "start", cleared: true, enemies: 0 };
    roomCount++;

    const directions = [
      { x: 0, y: -1 }, // Up
      { x: 0, y: 1 }, // Down
      { x: -1, y: 0 }, // Left
      { x: 1, y: 0 }, // Right
    ];

    while (roomCount < maxRooms) {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      const newX = x + dir.x;
      const newY = y + dir.y;

      if (newX >= 0 && newX < this.width && newY >= 0 && newY < this.height) {
        if (!this.grid[newY][newX]) {
          const enemyCount = Math.floor(Math.random() * 3) + 1; // 1-3 enemies
          this.grid[newY][newX] = {
            type: "normal",
            cleared: false,
            enemies: enemyCount,
          };
          roomCount++;
        }
        x = newX;
        y = newY;
      }
    }
  }
}
```

### 2\. Integrating the Map into Your Game (`js/game.js`)

Now, let's modify `js/game.js` to use our new `MapGenerator`. We'll need to:

1.  Create a map when the game starts.
2.  Keep track of the player's current room.
3.  Spawn enemies based on the current room's data.
4.  Implement room transitions.

Here are the key modifications for `js/game.js`:

```javascript
// js/game.js

// ... (existing code)

class Game {
  constructor() {
    // ... (existing constructor code)

    this.mapGenerator = new MapGenerator(10, 10);
    this.mapGenerator.generate(15); // Generate a map with 15 rooms
    this.currentRoom = { x: 5, y: 5 }; // Start in the center

    this.init();
  }

  init() {
    // ... (existing init code)
    this.spawnEnemiesForCurrentRoom();
  }

  spawnEnemiesForCurrentRoom() {
    const room = this.mapGenerator.grid[this.currentRoom.y][this.currentRoom.x];
    if (room && !room.cleared) {
      for (let i = 0; i < room.enemies; i++) {
        this.spawnEnemy();
      }
    }
  }

  update() {
    // ... (existing update code)

    this.checkRoomCompletion();
    this.handleRoomTransitions();
  }

  checkRoomCompletion() {
    const room = this.mapGenerator.grid[this.currentRoom.y][this.currentRoom.x];
    if (room && !room.cleared && this.enemies.length === 0) {
      room.cleared = true;
      // You can add a notification or sound effect here
    }
  }

  handleRoomTransitions() {
    const room = this.mapGenerator.grid[this.currentRoom.y][this.currentRoom.x];
    if (room && !room.cleared) {
      // Don't allow transitions until the room is cleared
      return;
    }

    const transitionBuffer = 10;
    if (this.player.position.x > CONFIG.width / 2 - transitionBuffer) {
      this.moveRoom(1, 0);
      this.player.position.x = -CONFIG.width / 2 + transitionBuffer;
    } else if (this.player.position.x < -CONFIG.width / 2 + transitionBuffer) {
      this.moveRoom(-1, 0);
      this.player.position.x = CONFIG.width / 2 - transitionBuffer;
    } else if (this.player.position.z > CONFIG.height / 2 - transitionBuffer) {
      this.moveRoom(0, 1);
      this.player.position.z = -CONFIG.height / 2 + transitionBuffer;
    } else if (this.player.position.z < -CONFIG.height / 2 + transitionBuffer) {
      this.moveRoom(0, -1);
      this.player.position.z = CONFIG.height / 2 - transitionBuffer;
    }
  }

  moveRoom(dx, dy) {
    const newX = this.currentRoom.x + dx;
    const newY = this.currentRoom.y + dy;

    if (this.mapGenerator.grid[newY] && this.mapGenerator.grid[newY][newX]) {
      this.currentRoom.x = newX;
      this.currentRoom.y = newY;
      this.clearEnemiesAndBullets();
      this.spawnEnemiesForCurrentRoom();
    }
  }

  clearEnemiesAndBullets() {
    this.enemies.forEach((enemy) => this.scene.remove(enemy.mesh));
    this.enemies = [];
    this.enemyBullets.forEach((bullet) => this.scene.remove(bullet.mesh));
    this.enemyBullets = [];
  }

  // ... (rest of the file)
}
```

### 3\. Update `index.html`

Finally, don't forget to include your new `map.js` file in your `index.html`:

```html
<script src="js/config.js"></script>
<script src="js/map.js"></script>
<script src="js/game.js"></script>
<script src="js/main.js"></script>
```

### Next Steps and Enhancements

This is a basic implementation to get you started. Here are some ways you can expand upon it:

- **Room Variety:** Add different room types to your `MapGenerator` (e.g., 'treasure', 'boss', 'shop'). You could also have rooms with different layouts or environmental hazards.
- **Visual Transitions:** Instead of instantly teleporting the player, you could implement a smooth camera pan between rooms.
- **Minimap:** You could create a simple minimap that shows the layout of the dungeon and the player's current position.
- **"Locking" the Room:** When the player enters an uncleared room, you could visually represent the "doors" closing until all enemies are defeated.
