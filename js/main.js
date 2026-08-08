import "./game.js";
import { DASH_SPEED, ATTACK_SPEED, DASH_DISTANCE, SWIPE_DELTA, ATTACK_SWIPE_DELTA } from "./modules/constants.js";

document.getElementById("debugOverlay").innerHTML =
  `DASH_SPEED: ${DASH_SPEED}<br>ATTACK_SPEED: ${ATTACK_SPEED}<br>DASH_DISTANCE: ${DASH_DISTANCE}<br>SWIPE_DELTA: ${SWIPE_DELTA}<br>ATTACK_SWIPE_DELTA: ${ATTACK_SWIPE_DELTA}<br>DASH: on-move<br>INPUT: window`;
