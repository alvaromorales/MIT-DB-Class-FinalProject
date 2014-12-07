var map;
var markers = {};
var circles = {};
var containers = {};
var geocoder = new google.maps.Geocoder();

// Removes given circle from map.
var removeCircle = function(circleUID) {
  var circle = circles[circleUID];
  var container = containers[circleUID];
  container.close();
  circle.setMap(null);
  delete containers[circleUID];
  delete circles[circleUID]; 
};

// Removes given marker from map.
var removeMarker = function(markerUID) {
  var marker = markers[markerUID];
  marker.setMap(null); // set markers setMap to null to remove it from map
  delete markers[markerUID]; // delete marker instance from markers object
  removeCircle(marker.circle_id);
};

// Removes all markers from map.
var removeAllMarkers = function() {
  $.each(markers, function (markerUID, marker) {
    removeMarkerFromPlacesList(markerUID);
  });
};

// Concatenates given lat and lng with an underscore and returns it.
// This UID will be used as a key of marker to cache the marker in markers object.
var getMarkerUID = function(lat, lng) {
  return 'marker_' + lat + '_' + lng;
}; 

// Generates a UID for circles for each marker.
var getCircleUID = function(lat, lng) {
  return 'circle_' + lat + '_' + lng;
};

// Generates a UID for each marker's info container.
var getInfoContainerUID = function(lat, lng) {
  return 'container_' + lat + '_' + lng;
};

// Adds marker to the Marked Places list
var addMarkerToPlacesList = function(marker) {
  if (Object.keys(markers).length !== 0) {
    $('.marker-list').css('visibility', 'visible');
    $('.deleteMarkersButton').css('visibility', 'visible');
  }
  $('.marker-list').append('<li class="list-group-item" id="' + marker.id + '">' + 
    marker.title + 
    '<span class="glyphicon glyphicon-remove" onclick="removeMarkerFromPlacesList(\'' + marker.id + '\')"></span></li>');
};

// Removes marker from the Marked Places list
var removeMarkerFromPlacesList = function(markerUID) {
  removeMarker(markerUID);
  if (Object.keys(markers).length === 0) {
    $('.marker-list').css('visibility', 'hidden');
    $('.deleteMarkersButton').css('visibility', 'hidden');
  }
  var markerListElement = document.getElementById(markerUID.trim());
  markerListElement.remove();
};

var getInfoContainerContent = function(marker, circle) {
  var content = '<div class="infoContainer" id="' + getInfoContainerUID(marker.position.lat(), marker.position.lng()) + '">' + 
                '<p class="containerHeader">' + 
                  '<span class="containerTitle">Place: ' + marker.title + ', </span>' + 
                  '<span class="containerRadius"> Radius: ' + Math.round(circle.getRadius() / 1000) + ' km </span>' +
                '</p>' + 
                '<div class="btn-group" role="group" aria-label="...">' +
                  '<button type="button" class="btn btn-default" onclick="getTweetCount(\'' + marker.id + '\')">Get Tweet Count</button>' +
                  '<button type="button" class="btn btn-default" onclick="getTweetTrends(\'' + marker.id + '\')">Get Trending Tweet Topics</button>' + 
                '</div>' +
              '</div>';
  return content;
};

var drawCircleForMarker = function(map, marker) {
  var position = marker.position;
  var circleUID = marker.circle_id;
  var circleOptions = {
    strokeColor: '#FF0000',
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: '#FF0000',
    fillOpacity: 0.35,
    map: map,
    center: position,
    radius: 200000,
    editable: true,
    clickable: true
  };
  // Add the circle for this city to the map.
  var circle = new google.maps.Circle(circleOptions);
  circle.bindTo('center', marker, 'position');
  // Create info window
  var infoWindow = new google.maps.InfoWindow({
    content:  getInfoContainerContent(marker, circle)
  });
  containers[circleUID] = infoWindow;
  google.maps.event.addListener(circle, 'click', function(ev){
    infoWindow.setPosition(ev.latLng);
    infoWindow.open(map);
  });
  google.maps.event.addListener(circle, 'radius_changed', function(ev){
    var container = containers[circleUID];
    container.setContent(getInfoContainerContent(marker, circle)); 
  });
  circles[circleUID] = circle;
};

var updatePlaceName = function(marker) {
  geocoder.geocode({'latLng': marker.position}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      if (results[1]) {
        var newMarkerTitle = results[1].formatted_address;
        marker.title = newMarkerTitle;
        document.getElementById(marker.id).innerHTML = newMarkerTitle + '<span class="glyphicon glyphicon-remove" onclick="removeMarkerFromPlacesList(\'' + marker.id + '\')"></span>';
        // Update Info Container content
        var circle = circles[marker.circle_id];
        var container = containers[marker.circle_id];
        container.setContent(getInfoContainerContent(marker, circle));    
      } else {
        alert('No results found');
      }
    } else {
      alert('Geocoder failed due to: ' + status);
    }
  });
}

// Initializes the map and listens for marker additions.
var initialize = function() {
  map = new google.maps.Map(document.getElementById('map-canvas'), {
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    center: { lat: 0, lng: 0},
    zoom: 2,
    mapTypeControl: false
  });
  // Create the search box and link it to the UI element.
  var input = (document.getElementById('pac-input'));
  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
  var searchBox = new google.maps.places.SearchBox((input));
  // Listen for the event fired when the user selects an item from the
  // pick list. Retrieve the matching places for that item.
  google.maps.event.addListener(searchBox, 'places_changed', function() {
    var places = searchBox.getPlaces();
    if (places.length == 0) {
      return;
    }
    // For each place, get the icon, place name, and location.
    var bounds = new google.maps.LatLngBounds();
    for (var i = 0, place; place = places[i]; i++) {
      var position = place.geometry.location;
      var markerUID = getMarkerUID(position.lat(), position.lng());
      var circleUID = getCircleUID(position.lat(), position.lng());
      var infoContainerUID = getInfoContainerUID(position.lat(), position.lng());
      // Create a marker for each place.
      var marker = new google.maps.Marker({
        map: map,
        id: markerUID,
        circle_id: circleUID,
        container_id : infoContainerUID,
        title: place.name,
        position: position,
        draggable: true
      });
      google.maps.event.addListener(marker,'dragend',function() {
        updatePlaceName(marker);
      });
      markers[marker.id] = marker;
      addMarkerToPlacesList(marker);
      drawCircleForMarker(map, marker);
      bounds.extend(position);
    }
    // This is needed to set the zoom after fitbounds.
    google.maps.event.addListener(map, 'zoom_changed', function() {
        zoomChangeBoundsListener = 
            google.maps.event.addListener(map, 'bounds_changed', function(event) {
                if (this.getZoom() > 3 && this.initialZoom == true) {
                    // Change max/min zoom here
                    this.setZoom(3);
                    this.initialZoom = false;
                }
            google.maps.event.removeListener(zoomChangeBoundsListener);
        });
    });
    map.initialZoom = true;
    map.fitBounds(bounds);
  });
}

// Initialize Google Maps
google.maps.event.addDomListener(window, 'load', initialize);

// Initialize Socket IO
var socket = io();

// Load marker that already exists in the database
socket.on('load marker', function(marker) {
  console.log(marker);
});

var getTweetCount = function(markerUID) {
  // TODO: make it the marker undraggable and uneditable
  // Make button unclickable, and the other one clickable 
  var marker = markers[markerUID];
  var request = {};
  request.type = "create";
  request.feature = "count";
  request.id = marker.id;
  request.lat = marker.position.lat();
  request.lon = marker.position.lng();
  request.radius_km = Math.round(circles[marker.circle_id].getRadius() / 1000);
  socket.emit('count request', request);
};

var getTweetTrends = function(markerUID) {
  // TODO: make it the marker undraggable and uneditable
  // Make button unclickable, and the other one clickable
  var marker = markers[markerUID];
  var request = {};
  request.type = "create";
  request.feature = "trend";
  request.id = marker.id;
  request.lat = marker.position.lat();
  request.lon = marker.position.lng();
  request.radius_km = Math.round(circles[marker.circle_id].getRadius() / 1000);
  socket.emit('trend request', request);
};