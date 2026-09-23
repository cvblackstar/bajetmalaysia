const pakwData = {
  Malaysia: { food: { urban: 501, rural: 446 }, nonFood: { urban: 1001, rural: 557 } },
  Johor: { food: { urban: 509, rural: 496 }, nonFood: { urban: 911, rural: 615 } },
  Kedah: { food: { urban: 423, rural: 403 }, nonFood: { urban: 691, rural: 518 } },
  Kelantan: { food: { urban: 432, rural: 430 }, nonFood: { urban: 771, rural: 586 } },
  Melaka: { food: { urban: 508, rural: 460 }, nonFood: { urban: 1001, rural: 636 } },
  "Negeri Sembilan": { food: { urban: 482, rural: 440 }, nonFood: { urban: 857, rural: 474 } },
  Pahang: { food: { urban: 492, rural: 474 }, nonFood: { urban: 821, rural: 519 } },
  "Pulau Pinang": { food: { urban: 519, rural: 454 }, nonFood: { urban: 1137, rural: 616 } },
  Perak: { food: { urban: 450, rural: 429 }, nonFood: { urban: 788, rural: 540 } },
  Perlis: { food: { urban: 435, rural: 374 }, nonFood: { urban: 685, rural: 568 } },
  Selangor: { food: { urban: 535, rural: 533 }, nonFood: { urban: 1177, rural: 619 } },
  Terengganu: { food: { urban: 439, rural: 399 }, nonFood: { urban: 753, rural: 507 } },
  Sabah: { food: { urban: 491, rural: 408 }, nonFood: { urban: 832, rural: 570 } },
  Sarawak: { food: { urban: 524, rural: 481 }, nonFood: { urban: 772, rural: 551 } },
  "W.P. Kuala Lumpur": { food: { urban: 521, rural: null }, nonFood: { urban: 1419, rural: null } },
  "W.P. Labuan": { food: { urban: 412, rural: 398 }, nonFood: { urban: 957, rural: 571 } },
  "W.P. Putrajaya": { food: { urban: 472, rural: null }, nonFood: { urban: 952, rural: null } }
};

const money = value => `RM${Math.round(value).toLocaleString("en-MY")}`;

function calculatePakw() {
  const state = document.getElementById("state").value;
  const strata = document.getElementById("strata").value;
  const householdSize = Math.max(1, Math.min(15, Number(document.getElementById("householdSize").value) || 1));
  const adjustment = Number(document.getElementById("adjustment").value) || 0;
  const data = pakwData[state] || pakwData.Malaysia;
  const selectedStrata = data.food[strata] == null ? "urban" : strata;

  const food = data.food[selectedStrata] * householdSize;
  const nonFood = data.nonFood[selectedStrata] * householdSize;
  const total = Math.max(0, food + nonFood + adjustment);

  document.getElementById("foodResult").textContent = money(food);
  document.getElementById("nonFoodResult").textContent = money(nonFood);
  document.getElementById("adjustmentResult").textContent = adjustment >= 0 ? `+${money(adjustment)}` : `-${money(Math.abs(adjustment))}`;
  document.getElementById("totalResult").textContent = money(total);
  document.getElementById("pakwResult").textContent = money(total);

  const strataLabel = selectedStrata === "urban" ? "Bandar" : "Luar bandar";
  document.getElementById("locationLabel").textContent = `${state} · ${strataLabel} · ${householdSize} orang`;
  document.getElementById("resultNote").textContent = selectedStrata !== strata
    ? `Data luar bandar tidak berkenaan untuk ${state}; anggaran menggunakan nilai bandar DOSM 2024.`
    : "Anggaran menggunakan PAKW per kapita DOSM 2024 dan didarab dengan saiz isi rumah.";
}

document.getElementById("calculatePakwButton").addEventListener("click", calculatePakw);
document.querySelectorAll("#state, #strata, #householdSize, #adjustment").forEach(el => el.addEventListener("input", calculatePakw));
calculatePakw();
