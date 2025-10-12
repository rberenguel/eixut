import { state } from "./state.js";

export function updateUI() {
  const healthElement = document.getElementById("healthDisplay");
  const killsElement = document.getElementById("killsDisplay");
  const shotgunElement = document.getElementById("shotgunDisplay");

  healthElement.innerText =
    "HEALTH: " + "❤️".repeat(Math.max(0, state.playerHealth));
  killsElement.innerText = "KILLS: " + state.enemiesKilled;

  if (state.hasShotgun) {
    shotgunElement.innerText = "SHELLS: " + "💥".repeat(state.shotgunAmmo);
  } else {
    shotgunElement.innerText = "";
  }
}
