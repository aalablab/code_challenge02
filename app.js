//Start DECLARATIONS AND PACKAGAES ===============================================================================

require("dotenv").config();

var mysql = require("mysql");
var connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: process.env.MYSQL_DB,
});

var express = require("express"); //install express
var app = express();
const port = 3000;
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.static("./scripts"));
app.use(express.static("./images"));

var session = require("express-session"); //install express-session
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      //maxAge: 10 * 1000 //* 60 * 4 //number (in milliseconds) to use when calculating the Expires
      maxAge: null,
    },
  })
);

var bodyParser = require("body-parser"); //install body-parser to get the needed data to pass into a post request.
app.use(bodyParser.urlencoded({ extended: true }));

var bcrypt = require("bcrypt");
var saltRounds = 10;

app.use(function (req, res, next) {
  res.setHeader(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  );
  next();
});

//End DECLARATIONS AND PACKAGAES ===============================================================================

// Initialize =====================================================
var v_sessionUsr = {};
// End Initializations ==============================

// Start Access ================================================================================================
//Home - Log in.
app.get("/", function (req, res) {
  let v_sessionUsr = req.session.user;
  // If the user has already logged in, then redirect to installer dashboard.
  if (v_sessionUsr) {
    res.redirect("/termsPage");
  } else {
    res.render("home", {
      loginOK: req.session.loginOK,
      errors: req.session.errors,
    });
  }
});
app.post("/signin", function (req, res) {
  var ipAddressMo = req.socket.remoteAddress;
  req.session.pcIPAdd = ipAddressMo;
  req.session.userID = Number(req.body.installerID);
  req.session.userpw = req.body.pword;

  if (Number.isInteger(req.session.userID)) {
    var q = "SELECT * FROM installers WHERE installerID = ?";
    connection.query(q, req.session.userID, function (error, results, fields) {
      if (error) throw error; //Show error in the backend (not on the clientside)
      if (results.length == 0) {
        req.session.errors = "Cannot find your profile. Contact Warren.";
        req.session.loginOK = false;
        res.redirect("/");
      } else {
        if (req.session.userpw == results[0].pword) {
          req.session.user = results;
          req.session.user[0].name =
            results[0].firstname + " " + results[0].lastname;
          req.session.loginOK = true;
          req.session.currQueIndex = 0;
          res.redirect("/termsPage"); //render will open a new page.
        } else {
          req.session.errors = "Wrong password. Try again or contact Warren.";
          req.session.loginOK = false;
          res.redirect("/");
        }
      }
    });
  } else {
    req.session.errors = "Wrong username. Try again or contact Warren.";
    req.session.loginOK = false;
    res.redirect("/");
  }
});

//Show installer dashboard.
app.get("/termsPage", function (req, res) {
  let v_sessionUsr = req.session.user;
  // If the user has already logged in, then redirect to installer dashboard.
  if (v_sessionUsr) {
    res.render("termsPage", {
      v_sessionUsr: req.session.user,
      pwordchgd: req.session.pwordchgd,
    });
  } else {
    res.redirect("/");
  }
});

//Let user change password.
app.get("/chgpword", function (req, res) {
  let v_sessionUsr = req.session.user;

  if (v_sessionUsr) {
    res.render("chgpword", {
      pwordchgd: req.session.pwordchgd,
      errors: req.session.errors,
    });
  } else {
    res.redirect("/");
  }
});
//Pasword change.
app.post("/pwordchgd", function (req, res) {
  if (req.session.user[0].pword != req.body.oldpw) {
    req.session.errors = "Old Password Incorrect!!!";
    req.session.pwordchgd = false;
    res.redirect("/chgpword");
  } else {
    if (req.body.newpw != req.body.newpwConfirm) {
      req.session.errors = "New Password does not match Confirm Password!";
      req.session.pwordchgd = false;
      res.redirect("/chgpword");
    } else {
      var q = "UPDATE installers SET pword = ? WHERE installerID = ?";
      connection.query(
        q,
        [req.body.newpw, req.session.userID],
        function (error, results, fields) {
          if (error) {
            console.log(error);
            req.session.errors = "CANNOT Update the Database. contact Warren.";
            req.session.pwordchgd = false;
            res.redirect("/chgpword");
          } else {
            req.session.pwordchgd = true;
            req.session.user[0].v_password = req.body.newpw;
            res.redirect("/termsPage"); //render will open a new page
          }
        }
      );
    }
  }
});

//Size Solar and List Available Clients
app.get("/clientList", function (req, res) {
  let v_sessionUsr = req.session.user;
  req.session.errors = null;

  if (v_sessionUsr) {
    var q =
      "SELECT * FROM clients WHERE workstatus = 'pending' ORDER BY firstname ASC";
    connection.query(q, function (error, results, fields) {
      if (error) throw error; //Show error in the backend (not on the clientside)

      if (results[0] != null) {
        req.session.clientList = results;
      }
      res.render("clientList", {
        clientList: req.session.clientList,
        errors: req.session.errors,
      });
    });
  } else {
    res.redirect("/");
  }
});

app.post("/createClient", function (req, res) {
  let v_sessionUsr = req.session.user;
  var clientFirstName = req.body.clientFirstName;
  var clientLastName = req.body.clientLastName;
  var clientNumber = req.body.clientNumber;
  var clientCity = req.body.clientCity;
  var clientMethod = req.body.clientMethod;
  req.session.clientMethod = clientMethod;

  if (v_sessionUsr) {
    if (
      clientFirstName == "" ||
      clientLastName == "" ||
      clientNumber == "" ||
      clientCity == ""
    ) {
      res.render("clientList", {
        errors:
          "All fields are required, ensure you completely fill up all details.",
      });
    } else {
      // Check if client already exist
      var q1 =
        "SELECT * FROM clients where firstname = ? AND lastname = ? AND mobilenum = ?";
      connection.query(
        q1,
        [clientFirstName, clientLastName, clientNumber],
        function (error, results, fields) {
          if (error) throw error; //Show error in the backend (not on the clientside)

          if (results.length > 0) {
            res.render("clientList", {
              errors: "Client already exist.",
            });
          } else {
            //Insert client details to the database.
            var q2 =
              "INSERT INTO clients (firstname, lastname, mobilenum, location_city, sizing_method) VALUES (?,?,?,?,?)";
            connection.query(
              q2,
              [
                clientFirstName,
                clientLastName,
                clientNumber,
                clientCity,
                clientMethod,
              ],
              function (error, results) {
                if (error) throw error; //Show error in the backend (not on the clientside)
                req.session.clientID = results.insertId;

                var q3 = "SELECT * FROM clients where clientID = ?";
                connection.query(
                  q3,
                  req.session.clientID,
                  function (error, results, fields) {
                    if (error) throw error; //Show error in the backend (not on the clientside)

                    if (results[0] == null) {
                      res.render("clientList", {
                        clientList: req.session.clientList,
                        errors: "NO CLIENT WAS CREATED.",
                      });
                    } else {
                      req.session.clientDetails = results;

                      if (
                        req.session.clientDetails[0].sizing_method ==
                        "monthly bill"
                      ) {
                        res.render("sizingDetailsByBill", {
                          errors: req.session.errors,
                          clientDetails: req.session.clientDetails,
                        });
                      } else if (
                        req.session.clientDetails[0].sizing_method ==
                        "appliances list"
                      ) {
                        res.render("sizingDetailsByAppliance", {
                          errors: req.session.errors,
                          clientDetails: req.session.clientDetails,
                        });
                      } else if (
                        req.session.clientDetails[0].sizing_method ==
                          "known power kW" ||
                        req.session.clientDetails[0].sizing_method ==
                          "other methods"
                      ) {
                        res.render("sizingDetailsByKW", {
                          errors: req.session.errors,
                          clientDetails: req.session.clientDetails,
                        });
                      }
                    }
                  }
                );
              }
            );
          }
        }
      );
    }
  } else {
    res.redirect("/");
  }
});

app.post("/cancelCreateClient", function (req, res) {
  let v_sessionUsr = req.session.user;

  if (v_sessionUsr) {
    var q = "DELETE FROM clientPowerSizings where clientID = ? ";
    connection.query(
      q,
      [req.session.clientID],
      function (error, results, fields) {
        if (error) throw error; //Show error in the backend (not on the clientside)

        var q1 = "DELETE FROM clients where clientID = ? ";
        connection.query(
          q1,
          [req.session.clientID],
          function (error, results, fields) {
            if (error) throw error; //Show error in the backend (not on the clientside)
            res.render("clientList", {
              errors:
                "Solar Sizing was cancelled and the client details were deleted.",
            });
          }
        );
      }
    );
  } else {
    res.redirect("/");
  }
});

app.post("/suggestInverterByBill", function (req, res) {
  let v_sessionUsr = req.session.user;
  var monthlyBill = req.body.monthlyBill;
  var energyPriceRate = req.body.energyPriceRate;
  var peakSunHours = req.body.peakSunHours;
  var daytimeUsePercent = req.body.daytimeUsePercent / 100;
  var nighttimeUsePercent = req.body.nighttimeUsePercent / 100;
  var currentPhase = req.body.currentPhase;
  var netmeterUse = req.body.netmeterUse;
  var netmeterRate = req.body.netmeterRate;
  var pvsystem_type = req.body.pvsystem_type;
  var clientID = req.session.clientID;
  var clientMethod = req.session.clientMethod;

  if (v_sessionUsr) {
    if (monthlyBill == "") {
      res.render("sizingDetailsByBill", {
        errors: "Monthly bill is required for calculation.",
        wasClientCreated: req.session.wasClientCreated,
        clientDetails: req.session.clientDetails,
      });
    } else {
      var monthly_consumption_kwh = Math.round(monthlyBill / energyPriceRate);
      var estimatedPower =
        Math.round((monthlyBill / energyPriceRate / 30 / 4) * 100) / 100;
      var req_fullday_energy_kwh =
        Math.round((monthlyBill / energyPriceRate / 30) * 100) / 100;
      var req_daytime_energy_kwh =
        Math.round(
          (monthlyBill / energyPriceRate / 30) * daytimeUsePercent * 100
        ) / 100;
      var req_nighttime_energy_kwh =
        Math.round((req_fullday_energy_kwh - req_daytime_energy_kwh) * 100) /
        100;
      var q =
        "INSERT INTO clientPowerSizings (clientID, sizing_method, req_power_kw, monthly_bill, local_energy_price, output_phase, peak_sun_hours, daytime_use_percent, nighttime_use_percent, netmeter_use_yesno, monthly_consumption_kwh, req_fullday_energy_kwh, req_daytime_energy_kwh, req_nighttime_energy_kwh,pvsystem_type,netmeter_sell_price) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
      connection.query(
        q,
        [
          clientID,
          clientMethod,
          estimatedPower,
          monthlyBill,
          energyPriceRate,
          currentPhase,
          peakSunHours,
          daytimeUsePercent,
          nighttimeUsePercent,
          netmeterUse,
          monthly_consumption_kwh,
          req_fullday_energy_kwh,
          req_daytime_energy_kwh,
          req_nighttime_energy_kwh,
          pvsystem_type,
          netmeterRate,
        ],
        function (error, results) {
          if (error) throw error; //Show error in the backend (not on the clientside)
          req.session.clientSizingID = results.insertId;

          res.redirect("/selectInverterByBill");
        }
      );
    }
  } else {
    res.redirect("/");
  }
});

app.get("/selectInverterByBill", function (req, res) {
  let v_sessionUsr = req.session.user;
  var clientID = req.session.clientID;

  if (v_sessionUsr) {
    var q1 =
      "SELECT * FROM clientPowerSizings where clientID = ? AND client_sizingID = ?";
    connection.query(
      q1,
      [clientID, req.session.clientSizingID],
      function (error, results, fields) {
        if (error) throw error; //Show error in the backend (not on the clientside)
        req.session.powerSizing = results;
        powerSizing = req.session.powerSizing;

        var q2 =
          "SELECT * FROM inverters WHERE inverter_type = ? AND output_phase = ?";
        connection.query(
          q2,
          [powerSizing[0].pvsystem_type, powerSizing[0].output_phase],
          function (error, results, fields) {
            if (error) throw error; //Show error in the backend (not on the clientside)
            req.session.inverters = results;

            var q3 = "SELECT * FROM solarpanels";
            connection.query(q3, function (error, results, fields) {
              if (error) throw error; //Show error in the backend (not on the clientside)
              req.session.solarpanels = results;

              var q4 = "SELECT * FROM batteries";
              connection.query(q4, function (error, results, fields) {
                if (error) throw error; //Show error in the backend (not on the clientside)
                req.session.batteries = results;

                req.session.wereInvertersFetch = false;

                res.render("sizingByBillInverter", {
                  errors: req.session.errors,
                  wereInvertersFetch: req.session.wereInvertersFetch,
                  clientDetails: req.session.clientDetails,
                  powerSizing: req.session.powerSizing,
                  inverters: req.session.inverters,
                  solarpanels: req.session.solarpanels,
                  batteries: req.session.batteries,
                });
              });
            });
          }
        );
      }
    );
  } else {
    res.redirect("/");
  }
});

app.post("/sizingByBillResults", function (req, res) {
  let v_sessionUsr = req.session.user;
  var clientID = req.session.clientID;

  let powerSizing = req.session.powerSizing;

  var inverterModelOpt = req.body.inverterModelOpt;
  var inverterOptionPcs = req.body.inverterOptionPcs;
  var calculatedInvPower = req.body.calculatedInvPower;
  var fulldayEnergy = calculatedInvPower * powerSizing[0].peak_sun_hours;

  var panelModelOption = req.body.panelModelOption;
  var panelOptionPcs = req.body.panelOptionPcs;
  var calculatedSolarPower = req.body.calculatedSolarPower;
  var fulldayPVEnergy = calculatedSolarPower * powerSizing[0].peak_sun_hours;

  var systemPower = calculatedInvPower;
  if (calculatedSolarPower < calculatedInvPower) {
    systemPower = calculatedSolarPower;
  }
  if (fulldayPVEnergy < fulldayEnergy) {
    fulldayEnergy = fulldayPVEnergy;
  }

  var batteryOptionModel = req.body.batteryOptionModel;
  var batteryOptionPcs = req.body.batteryOptionPcs;
  var calculatedBattEnergy = parseFloat(req.body.calculatedBattEnergy);

  var availableDaytimeEnergy = 0;
  var availableNighttimeEnergy = 0;
  var netmeterSellEnergy = 0;
  var netmeterOffsetEnergy = 0;
  var purchaseEnergy = 0;
  var sellAndBuyRate =
    powerSizing[0].netmeter_sell_price / powerSizing[0].local_energy_price;
  if (fulldayEnergy <= powerSizing[0].req_daytime_energy_kwh) {
    availableDaytimeEnergy = fulldayEnergy;
    purchaseEnergy = powerSizing[0].req_fullday_energy_kwh - fulldayEnergy;
  } else if (
    fulldayEnergy > powerSizing[0].req_daytime_energy_kwh &&
    fulldayEnergy < powerSizing[0].req_fullday_energy_kwh
  ) {
    availableDaytimeEnergy = powerSizing[0].req_daytime_energy_kwh;
    availableNighttimeEnergy = fulldayEnergy - availableDaytimeEnergy;
    if (availableNighttimeEnergy >= calculatedBattEnergy) {
      netmeterSellEnergy = availableNighttimeEnergy - calculatedBattEnergy;
      netmeterOffsetEnergy = netmeterSellEnergy * sellAndBuyRate;
      purchaseEnergy =
        powerSizing[0].req_nighttime_energy_kwh - calculatedBattEnergy;
      availableNighttimeEnergy = calculatedBattEnergy;
    } else {
      purchaseEnergy =
        powerSizing[0].req_nighttime_energy_kwh - availableNighttimeEnergy;
    }
  } else if (fulldayEnergy >= powerSizing[0].req_fullday_energy_kwh) {
    availableDaytimeEnergy = powerSizing[0].req_daytime_energy_kwh;
    availableNighttimeEnergy = fulldayEnergy - availableDaytimeEnergy;
    if (powerSizing[0].req_nighttime_energy_kwh <= calculatedBattEnergy) {
      netmeterSellEnergy =
        availableNighttimeEnergy - powerSizing[0].req_nighttime_energy_kwh;
      netmeterOffsetEnergy = netmeterSellEnergy * sellAndBuyRate;
      availableNighttimeEnergy = powerSizing[0].req_nighttime_energy_kwh;
    } else {
      netmeterSellEnergy = availableNighttimeEnergy - calculatedBattEnergy;
      netmeterOffsetEnergy = netmeterSellEnergy * sellAndBuyRate;
      purchaseEnergy =
        powerSizing[0].req_nighttime_energy_kwh - calculatedBattEnergy;
      availableNighttimeEnergy = calculatedBattEnergy;
    }
  }

  req.session.systemPower = systemPower;
  req.session.fulldayEnergy = fulldayEnergy;
  req.session.availableDaytimeEnergy = availableDaytimeEnergy;
  req.session.availableNighttimeEnergy = availableNighttimeEnergy;
  req.session.netmeterSellEnergy = netmeterSellEnergy;
  req.session.netmeterOffsetEnergy = netmeterOffsetEnergy;
  req.session.purchaseEnergy = purchaseEnergy;
  req.session.resultingBill = purchaseEnergy - netmeterOffsetEnergy;
  req.session.resultingSavings =
    availableDaytimeEnergy + availableNighttimeEnergy + netmeterOffsetEnergy;

  if (v_sessionUsr) {
    var q =
      "UPDATE clientPowerSizings SET inverterID = ?, pcs_of_inverter = ?, selected_ac_output_power_kw = ?, ac_output_energy_fullday = ?, panelID = ?, pcs_of_panel = ?, solar_panel_kw_peak = ?, batteryID = ?, pcs_of_battery = ?, battery_energy_kwh = ?, netmeter_sellenergy_kwh = ?, netmeter_offsetenergy_kwh = ?, grid_purchases_energy_kwh = ?  WHERE clientID = ? AND client_sizingID = ?";
    connection.query(
      q,
      [
        inverterModelOpt,
        inverterOptionPcs,
        calculatedInvPower,
        fulldayEnergy,
        panelModelOption,
        panelOptionPcs,
        calculatedSolarPower,
        batteryOptionModel,
        batteryOptionPcs,
        calculatedBattEnergy,
        netmeterSellEnergy,
        netmeterOffsetEnergy,
        purchaseEnergy,
        clientID,
        req.session.clientSizingID,
      ],
      function (error, results) {
        if (error) throw error; //Show error in the backend (not on the clientside)

        var q1 =
          "UPDATE clientPowerSizings INNER JOIN inverters ON clientPowerSizings.inverterID = inverters.inverterID SET clientPowerSizings.selected_inverter = inverters.inverter_model";
        connection.query(q1, function (error, results) {
          if (error) throw error;

          var q2 =
            "UPDATE clientPowerSizings INNER JOIN solarpanels ON clientPowerSizings.panelID = solarpanels.panelID SET clientPowerSizings.selected_panel = solarpanels.panel_model";
          connection.query(q2, function (error, results) {
            if (error) throw error;

            var q3 =
              "UPDATE clientPowerSizings INNER JOIN batteries ON clientPowerSizings.batteryID = batteries.batteryID SET clientPowerSizings.selected_battery = batteries.battery_model";
            connection.query(q3, function (error, results) {
              if (error) throw error;

              res.redirect("/sizingByBillResults");
            });
          });
        });
      }
    );
  } else {
    res.redirect("/");
  }
});

app.get("/sizingByBillResults", function (req, res) {
  let v_sessionUsr = req.session.user;
  var clientID = req.session.clientID;

  if (v_sessionUsr) {
    var q1 =
      "SELECT * FROM clientPowerSizings where clientID = ? AND client_sizingID = ?";
    connection.query(
      q1,
      [clientID, req.session.clientSizingID],
      function (error, results, fields) {
        if (error) throw error; //Show error in the backend (not on the clientside)
        req.session.powerSizing = results;
        powerSizing = req.session.powerSizing;

        var q2 =
          "SELECT * FROM inverters WHERE inverter_type = ? AND output_phase = ?";
        connection.query(
          q2,
          [powerSizing[0].pvsystem_type, powerSizing[0].output_phase],
          function (error, results, fields) {
            if (error) throw error; //Show error in the backend (not on the clientside)
            req.session.inverters = results;

            var q3 = "SELECT * FROM solarpanels";
            connection.query(q3, function (error, results, fields) {
              if (error) throw error; //Show error in the backend (not on the clientside)
              req.session.solarpanels = results;

              var q4 = "SELECT * FROM batteries";
              connection.query(q4, function (error, results, fields) {
                if (error) throw error; //Show error in the backend (not on the clientside)
                req.session.batteries = results;

                req.session.wereInvertersFetch = true;

                systemPower = Math.round(req.session.systemPower * 100) / 100;
                fulldayEnergy =
                  Math.round(req.session.fulldayEnergy * 100) / 100;
                availableDaytimeEnergy =
                  Math.round(req.session.availableDaytimeEnergy * 100) / 100;
                availableNighttimeEnergy =
                  Math.round(req.session.availableNighttimeEnergy * 100) / 100;
                netmeterSellEnergy =
                  Math.round(req.session.netmeterSellEnergy * 100) / 100;
                netmeterOffsetEnergy =
                  Math.round(req.session.netmeterOffsetEnergy * 100) / 100;
                purchaseEnergy =
                  Math.round(req.session.purchaseEnergy * 100) / 100;
                resultingBill =
                  Math.round(req.session.resultingBill * 100) / 100;
                resultingSavings =
                  Math.round(req.session.resultingSavings * 100) / 100;

                resultingBill =
                  30 *
                  Math.round(
                    resultingBill *
                      req.session.powerSizing[0].local_energy_price
                  );
                resultingBill = resultingBill.toLocaleString("en-US");

                resultingSavings =
                  30 *
                  Math.round(
                    resultingSavings *
                      req.session.powerSizing[0].local_energy_price
                  );
                resultingSavings = resultingSavings.toLocaleString("en-US");

                res.render("sizingByBillInverter", {
                  errors: req.session.errors,
                  wereInvertersFetch: req.session.wereInvertersFetch,
                  clientDetails: req.session.clientDetails,
                  powerSizing: req.session.powerSizing,
                  inverters: req.session.inverters,
                  solarpanels: req.session.solarpanels,
                  batteries: req.session.batteries,

                  systemPower: systemPower,
                  fulldayEnergy: fulldayEnergy,
                  availableDaytimeEnergy: availableDaytimeEnergy,
                  availableNighttimeEnergy: availableNighttimeEnergy,
                  netmeterSellEnergy: netmeterSellEnergy,
                  netmeterOffsetEnergy: netmeterOffsetEnergy,
                  purchaseEnergy: purchaseEnergy,
                  resultingBill: resultingBill,
                  resultingSavings: resultingSavings,
                });
              });
            });
          }
        );
      }
    );
  } else {
    res.redirect("/");
  }
});

app.get("/logout", (req, res, next) => {
  var v_sessionUsr = {};
  // Check if the session exist
  if (req.session.user) {
    // destroy the session and redirect the user to the index page.
    req.session.destroy(function () {
      res.redirect("/");
    });
  }
});
// End Access ================================================================================================

// Errors => page not found 404
app.use((req, res, next) => {
  var err = new Error("Page not found");
  err.status = 404;
  next(err);
});

// Handling errors (send them to the client)
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message);
});

app.listen(port, function () {
  console.log("Server listening on port " + port);
});
