var getParameterByName = function (name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
var vblteamid = getParameterByName("vblteamid");
var teamid = getParameterByName("teamid");
var visualDate = new Date();

var renderFutureMatches = function(){
  repository.futureMatchesOfTeam(vblteamid, function(match){
    var matchuri= "/match/?matchid=" + match.guid;
    var tr = $.template("#table-item-template", {
        code: match.wedID,
        date: match.datumString,
        time: match.beginTijd,
        home: match.tTNaam,
        away: match.tUNaam,
        acc: match.accNaam,
        link: matchuri,
    }, "tbody");

    $("#calendar-table tbody").append(tr);
  });
  $("#calendar-table").show();
}


$.topic("repository.initialized").subscribe(function () {
    console.log("loading data");
     
    if(vblteamid != null){
      repository.loadTeam(vblteamid);
    }
    else if(teamid != null){   
      
        clubmgmt.mapTeam(teamid, function(map){
            if(map == null){            
                $(".loading").hide();
                $("#team-dashboard").css("visibility", "visible");                          
            }
            else{
                vblteamid = map.referenceId;
                repository.loadTeam(vblteamid);
            }               
        });

    }
   
  });

$.topic("vbl.team.loaded").subscribe(function () {
    repository.loadMatches();
    repository.getTeam(vblteamid, function(vblteam){
        if(vblteam && vblteam.guid == vblteamid){
           $(".loading").hide();
           $("#team-dashboard").css("visibility", "visible");
        }
    });     
});

$.topic("vbl.matches.loaded").subscribe(function () {
     renderFutureMatches();   
});

$.topic("vbl.members.loaded").subscribe(function () {

});

$( document ).ready(function() {
    
});
