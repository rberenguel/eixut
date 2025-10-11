import { state } from "./state.js";

export function updateUI() {
  const healthElement = document.getElementById("healthDisplay");
  const killsElement = document.getElementById("killsDisplay");
  healthElement.innerText =
    "HEALTH: " + "❤️".repeat(Math.max(0, state.playerHealth));
  killsElement.innerText = "KILLS: " + state.enemiesKilled;
}
