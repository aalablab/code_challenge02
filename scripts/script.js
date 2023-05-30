function startTime() {
  var today = new Date(Date.now()).toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  document.getElementById("currDateTime").innerHTML = today;
  var t = setTimeout(startTime, 500);
}

function calcNightUse() {
  var daytimeUse = document.getElementById("daytimeUsePercent").value;
  var nightUse = 100 - daytimeUse;
  document.getElementById("nighttimeUsePercent").value = nightUse;
}

function calcInvPowerModel() {
  var e1 = document.getElementById("inverterModelOpt");
  var inverterID = e1.value;

  var e2 = document.getElementById("inverterPowerOpt");
  e2.value = inverterID;

  var inverterPower = e2.options[e2.selectedIndex].text;

  var numberOfPieces = document.getElementById("inverterOptionPcs").value;
  var totalPower = Math.round((inverterPower * numberOfPieces) / 10) / 100;
  document.getElementById("calculatedInvPower").value = totalPower;
}

function calcInvPower() {
  var e1 = document.getElementById("inverterPowerOpt");
  var inverterID = e1.value;

  var e2 = document.getElementById("inverterModelOpt");
  e2.value = inverterID;

  var inverterPower = e1.options[e1.selectedIndex].text;

  var numberOfPieces = document.getElementById("inverterOptionPcs").value;
  var totalPower = Math.round((inverterPower * numberOfPieces) / 10) / 100;
  document.getElementById("calculatedInvPower").value = totalPower;
}

function calcSolarPowerModel() {
  var e1 = document.getElementById("panelModelOption");
  var panelID = e1.value;

  var e2 = document.getElementById("panelPowerOption");
  e2.value = panelID;

  var solarPower = e2.options[e2.selectedIndex].text;

  var numberOfPieces = document.getElementById("panelOptionPcs").value;
  var totalPower = Math.round((solarPower * numberOfPieces) / 10) / 100;
  document.getElementById("calculatedSolarPower").value = totalPower;
}

function calcSolarPower() {
  var e2 = document.getElementById("panelPowerOption");
  var panelID = e2.value;

  var e1 = document.getElementById("panelModelOption");
  e1.value = panelID;

  var solarPower = e1.options[e1.selectedIndex].text;

  var numberOfPieces = document.getElementById("panelOptionPcs").value;
  var totalPower = Math.round((solarPower * numberOfPieces) / 10) / 100;
  document.getElementById("calculatedSolarPower").value = totalPower;
}

function calcBattEnergyModel() {
  if (document.getElementById("pvsystemType").innerHTML == "Grid-tie") {
    document.getElementById("batteryOptionPcs").value = "0";
    alert("There are no batteries for Grid-tie System.");
  } else {
    var e1 = document.getElementById("batteryOptionModel");
    var batteryID = e1.value;

    var e2 = document.getElementById("batteryOptionEnergy");
    e2.value = batteryID;

    var battEnergy = e2.options[e2.selectedIndex].text;

    var numberOfPieces = document.getElementById("batteryOptionPcs").value;
    var totalEnergy = battEnergy * numberOfPieces;
    document.getElementById("calculatedBattEnergy").value = totalEnergy;
  }
}

function calcBattEnergy() {
  if (document.getElementById("pvsystemType").innerHTML == "Grid-tie") {
    document.getElementById("batteryOptionPcs").value = "0";
    alert("There are no batteries for Grid-tie System.");
  } else {
    var e2 = document.getElementById("batteryOptionEnergy");
    var batteryID = e2.value;

    var e1 = document.getElementById("batteryOptionModel");
    e1.value = batteryID;

    var battEnergy = e2.options[e2.selectedIndex].text;

    var numberOfPieces = document.getElementById("batteryOptionPcs").value;
    var totalEnergy = battEnergy * numberOfPieces;
    document.getElementById("calculatedBattEnergy").value = totalEnergy;
  }
}
