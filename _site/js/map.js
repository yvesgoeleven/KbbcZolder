function initMap() {
    var loc = {lat: 50.991189, lng: 5.18965};
    var map = new google.maps.Map(document.getElementById('map'), {
      zoom: 15,
      center: loc
    });
    /*var marker = new google.maps.Marker({
      position: loc,
      map: map
    });*/
  var infowindow = new google.maps.InfoWindow();
    var service = new google.maps.places.PlacesService(map);

    service.getDetails({ placeId: 'ChIJZRgmzYI7wUcRjEHmCqFIOFA' }, function(place, status) {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        var marker = new google.maps.Marker({
          map: map,
          position: place.geometry.location
        });
        google.maps.event.addListener(marker, 'click', function() {
          infowindow.setContent('<div><strong>' + place.name + '</strong><br>' +
            place.formatted_address + '</div>');
          infowindow.open(map, this);
        });
      }
    });
  }