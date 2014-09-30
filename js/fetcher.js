var xhr = new XMLHttpRequest();
var db = undefined;
var loaded = function(){return;};
//xhr.open('GET', 'hawc_test_lightcurves_repaired.db', true);
xhr.open('GET', 'hawc_test_lightcurves_copy.db', true);
xhr.responseType = 'arraybuffer';

// Send request for sql file
xhr.send();
// What to do when db is loaded
function set_loaded (func) {loaded = func;}

// Find gaps within the data
function find_gap(arr) {
   var m_diff = .0014; // 2 minute gap in mjd
   var gaps = [];
   for (var i = 1; i < arr.length; i++) {
      if (arr[i] - arr[i-1] > m_diff) {
         gaps.push(i-1);
         gaps.push(i);
      }
   }
   
   return gaps;
}   

// Given a database file & name of source, returns MJD, on & off data
function fetch(name, start, end) {
   console.log("was called");
   // Make sure db is already loaded
   if (typeof db === 'undefined') {
      return;
   }
   
   // Load arrays within date range
   var range = " WHERE MJD BETWEEN " + start + " AND " + end;
   var mjd_tbl = db.exec("SELECT MJD FROM lightcurve_on" + range)[0];
   var on_tbl = db.exec("SELECT "+ name + " FROM lightcurve_on" + range)[0];
   var off_tbl = db.exec("SELECT " + name + " FROM lightcurve_off" + range)[0];
   
   // Detect gaps in data
   var gaps = find_gap(mjd_tbl.values);
   
   // Make sure we have arrays of equal length (chop off last elt's)
   var lMjd = mjd_tbl.values.length;
   var lOn = on_tbl.values.length;
   var lOff = off_tbl.values.length;
   var l = d3.min([lMjd, lOn, lOff]);
   
   // Average on # of days, O(1) data points in # of days instead of O(n)
   // Shouldn't need high resolution when looking at a long timeframe anyway!
   var days = Math.ceil((mjd_tbl.values[l-1] - mjd_tbl.values[0])/2);
   
   // Throw out remainder points
   l = l - l % days;
   // data will contain json points w/ on, off, diff, rat & mjd values
   var dta = [];
   // number of consecutive zeros encountered
   var z = 0;
   // array to keep track of prev/current/next value was a gap
   var g = [false, false, false];
   var ce = 0;
   
   for (var i = 0; i < l; i += days) {
      // Average mjd of range
      var mjd = .5*(+mjd_tbl.values[i+days-1] + +mjd_tbl.values[i]);
      var on = 0;
      var off = 0;
      var gn = false;
      var gap = -1000000;// Set to -1 & see idea below
      
      // Average values to reduce # of data points, 
      // slightly reduces resolution, but vastly improves performance!
      for (var j = i; j < days + i; j++) {
         on += +on_tbl.values[j];
         off += +off_tbl.values[j];
         // Check if next point will have a gap
         if (gaps.indexOf(j+days) != -1)
            gn = true;
      }
      
      // If prev, curr or next are gaps, don't display this point
      g.shift();
      g.push(gn);
      if (g[0] || g[1] || g[2])
         gap = 1000000;// Set to 1 & see idea below
      
      // Either increment if this is zero or reset zero counter
      on == 0 && off == 0 ? z++ : z = 0;
      // Every eleven zeros, remove the middle (so that we have a padding of 5
      // zero points, makes the interpolation look nicer than no padding!)
      if (z == 11) {
         z = 10;
         dta.splice(dta.length - 6, 1);
      }
      
      var exc = on - off;
      ce += exc;
      var rat = off == 0 ? 0 : on/off;
      dta.push({mjd: mjd,
         on: on/days,
         off: off/days,
         exc: exc/days,
         ce: ce,
         rat: rat,
         gap: gap});// do gap*(max(on, off, exc, rat, ce)+1)?
   }
   
   return dta;
}

// When db is loaded, store into a var
xhr.onload = function(e) {
   // Load database into db
   var uInt8Array = new Uint8Array(this.response);
   db = new SQL.Database(uInt8Array);
   loaded();
};
