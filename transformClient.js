/*
 * Copyright (c) 2008-2014 The Open Source Geospatial Foundation
 * 
 * Published under the BSD license.
 * See https://github.com/geoext/geoext2/blob/master/license.txt for the full
 * text of the license.
 */

Ext.require([
    'Ext.container.Viewport',
    'Ext.state.Manager',
    'Ext.state.CookieProvider',
    'Ext.window.MessageBox',
    'GeoExt.panel.Map'
]);

var dworkspace = 'topp';
//var dworkspace = 'acme';

var mapinfo = [];

Ext.application({
  name: 'Helmert Map Transform',
  launch: function() {
    Ext.state.Manager.setProvider(Ext.create('Ext.state.CookieProvider', {
      expires: new Date(new Date().getTime()+(1000*60*60*24*7)) //7 days from now
    }));

    function createMap(renderTo) {
      map = new OpenLayers.Map({});
      mappanel = Ext.create('GeoExt.panel.Map', {
        renderTo: renderTo,
        width: 450,
        height: 320,
        map: map,
      });
      return {map: map, mappanel: mappanel};
    }

    mapinfo  = [ createMap("left"), createMap("right") ];
  }
});

function updateDropDown(features) {
  for (var i = 0; i < 2; ++i) {
    var dropdown = $("<select/>");
    dropdown.attr("id", "layers" + i);
    $.each(features, function(index, f) {
      var option = $("<option/>");
      option.attr("value", f.href)
      option.text(f.name)
      dropdown.append(option);
    });
    $("#layers" + i).replaceWith(dropdown);
  }
}

function updateDropDownStores(layers) {
  var all_feature_names = [];
  var success_count = 0;
  for (var i in layers.dataStores.dataStore) {
    var myds = layers.dataStores.dataStore[i];

    var success = (function() {
      var dsname = myds.name;
      return function(features) {
        for (var j in features.featureTypes.featureType) {
          var myfs = features.featureTypes.featureType[j];
          all_feature_names.push({name: dsname + "/" + myfs.name, href: myfs.href})
        }
        success_count++;
        if (success_count == layers.dataStores.dataStore.length) {
          all_feature_names.sort(function(l,r) { return l.name > r.name; });
          updateDropDown(all_feature_names)
        }
      };
    })();

    $.ajax ({
      type: "GET",
      url: myds.href.replace(".json", "/featuretypes.json"),
      dataType: 'json',
      headers: {
          "Authorization": "Basic " + btoa("admin:geoserver")
      },
      success: success
    });
  }
  if (layers.dataStores.dataStore.length==0) {
    updateDropDown(all_feature_names);
  }
}

function updateLayers() {
  $.ajax ({
    type: "GET",
    url: 'http://localhost:8086/geoserver/rest/workspaces/'+dworkspace+'/datastores.json',
    dataType: 'json',
    headers: {
        "Authorization": "Basic " + btoa("admin:geoserver")
    },
    success: updateDropDownStores
  });
}

function loadLayer(mid) {
  
  var file = $("#layers" + mid + " option:selected").attr("value");
  // file: [... "geoserver", "rest", "workspaces", "acme", "datastores", "vg2500_geo84", "featuretypes", "vg2500_sta.json"]
  var parts = file.split('/')
  var featureName = parts.pop().replace(".json", "").replace(/^\s+|\s+$/gm,'');
  parts.pop(); parts.pop(); parts.pop();
  var workspace = parts.pop()

  var urlp = [];
  for (var i = 0; parts[i] != "rest"; ++i) {
    urlp.push(parts[i])
  }

  var baseurl = urlp.join("/");

  var url = baseurl + "/wms/" + workspace;
  var layer = workspace + ":" + featureName; 

  var mi = mapinfo[mid];
  var map = mi.map;

  //Load the new layer
  var wms = new OpenLayers.Layer.WMS("Source Layer", url, {layers: layer} );
  map.addLayer(wms);
  
  var pl = mi.pointLayer = new OpenLayers.Layer.Vector("Point Layer");
  map.addLayer(pl);
  var control = new OpenLayers.Control.DrawFeature(pl, OpenLayers.Handler.Point);
  map.addControl(control);
  control.activate();

  mi.mapurl = baseurl + "/" + workspace + "/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=" + layer + "&outputformat=json"
}

function removePoints() {
  function clearAll(mi) {
    if (mi.pointLayer)
      mi.pointLayer.removeAllFeatures();
  }
  clearAll(mapinfo[0]);
  clearAll(mapinfo[1]);
}

function error(e) {
  $('#error').html(e);
}

function extractPoints(vl) {
  var p = [];
  for (var i in vl.features) {
    var geo = vl.features[i].geometry;
    var point = {x:geo.x, y:geo.y};
    p.push(point);
  }
  return p;
}

function transformMap() {
  if (!mapinfo[0].mapurl) {
    error("Load a map first");
    return;
  }
  var inp = extractPoints(mapinfo[0].pointLayer);
  var out = extractPoints(mapinfo[1].pointLayer);
  if (inp.length < 2 || out.length < 2) {
    error("We need at least two points");
    return;
  }
  error("");//Clear previous

  // Do the transformation
  $.ajax({
    url: mapinfo[0].mapurl,
    type: 'GET',
    dataType: "text", // Don't process the return data
    success: function(res) {
      $.ajax({
        url: "http://localhost:8086/helmert/map",
        type: "POST",
        contentType: "application/json; charset=utf-8",
        data: JSON.stringify({ "map": res, "inp": inp, "out": out }),
        success: function(tmap) {
          var unitsLayer = new OpenLayers.Layer.Vector("transformed");
          mapinfo[1].map.addLayer(unitsLayer);
          var geojson_format = new OpenLayers.Format.GeoJSON();
          unitsLayer.addFeatures(geojson_format.read(tmap));
        }
      });
  }}); 
}

var files;

function loadFile() {
  //Based on http://abandon.ie/notebook/simple-file-uploads-using-jquery-ajax
  event.stopPropagation(); // Stop stuff happening
  event.preventDefault(); // Totally stop stuff happening

  var data = new FormData();
  $.each(files, function(key, value) {
    data.append(key, value);
  });

  var filename = $('#fl').val().split(/[/\\]/).slice(-1)[0].split(/\./)[0];
  $.ajax({
    headers: {
      "Authorization": "Basic " + btoa("admin:geoserver")
    },
    url: 'http://localhost:8086/geoserver/rest/workspaces/'+dworkspace+'/datastores/'+filename+'/file.shp',
    type: 'PUT',
    contentType: "application/zip",
    data: data,
    cache: false,
    processData: false, // Don't process the files
    success: updateLayers
  });
}

$(function() {
  updateLayers();

  $('#fl').on('change', function(event) {
    files = event.target.files;
  });

});


