var showNextMatch = function(){
  repository.nextMatch(function(match){
    repository.currentOrganisation(function(org){
      var d = new Date(match.jsDTCode);
      $("#next-top-title span").text(d.toLocaleString(window.navigator.language, {weekday: 'long'}));
      /* looks like local time is stored as if it were utc? */
      $("#next-bottom-title span").text(d.toLocaleString(window.navigator.language, {day: 'numeric'}) + " " + d.toLocaleString(window.navigator.language, {month: 'long'}) + " | " + ('0'+d.getUTCHours()).slice(-2) + ":" + ('0'+d.getMinutes()).slice(-2));    
    
      var vs = "";
      org.teams.forEach(function(team){
          if(team.guid == match.tTGUID|| team.guid == match.tUGUID){
              vs = team.naam.replace(orgName, "").trim()
          }
      });
      if(vs == ""){
        if( partnerTeamIds.indexOf(encodeURI(match.tTGUID)) > -1){
            vs = match.tTNaam.replace(partnerName, "").trim();
        }
        else if( partnerTeamIds.indexOf(encodeURI(match.tUGUID)) > -1){
            vs = match.tUNaam.replace(partnerName, "").trim();
        }
      } 

      $("#next-vs").text(vs);

      var homesrc = vbl.teamimage(match.tTGUID);
      var awaysrc = vbl.teamimage(match.tUGUID);
      $("#next-home-team-logo img").attr("src", homesrc);
      $("#next-away-team-logo img").attr("src", awaysrc);
  
      $("#next-link").attr("href", "/match/?matchid=" + match.guid)
      $("#next-middle .container").css("visibility", "visible");

    });
  });
};


$.topic("repository.initialized").subscribe(function () {
  console.log("loading data");
  repository.loadMatches();
});

var orgloaded = false;
var matchesloaded = false;

// assumes init loads the org
$.topic("vbl.organisation.loaded").subscribe(function () {
    orgloaded = true;
    if(matchesloaded == true){
        showNextMatch();
    }
});

$.topic("vbl.matches.loaded").subscribe(function () {
    matchesloaded = true;
    if(orgloaded == true){
        showNextMatch();
    }
});

$.topic("vbl.members.loaded").subscribe(function () {

});


setInterval(function(){
  var width = $("#partners ul li:first-child img").outerWidth();
  $("#partners ul li:first-child").animate({
      opacity: 0, // animate slideUp
      marginLeft: '-' + width + 'px'
      }, 'slow', 'swing', function() {
      var el = $(this).detach();
      $("#partners ul").append(el);
      el.css({ 'opacity' : 1, 'margin-left' : 0 });
      });		
}, 5000);

var center = function(){
	$("img.focus-center").each(function(i, img) {
		var offset = ($(window).width() - $(img).width()) / 2;
		/*if(offset < -($(window).width() / 4) || $(img).css('margin-left') != "0px"){*/
			$(img).animate({
				marginLeft: offset + 'px'
			}, 'slow', 'swing', function() {});
		/*}*/
	});
}

$('#myCarousel').bind('slide.bs.carousel', function (e) {
	center();
});
$('#myCarousel').bind('slid.bs.carousel', function (e) {
	center();
});
$(window).resize(function(){
	center();
});
center();