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
var poule = getParameterByName("poule");
var visualDate = new Date();

var renderPoules = function(vblTeam){
     if(vblTeam && vblTeam.poules){
        var p = vblTeam.poules.filter(function(pl){ return pl.guid === poule; })[0];   
        if(p){
            $("#team-name").text("Stand " + p.naam); 
            if(p.teams){
                p.teams.forEach(function(t){
                    var tr = $.template("#table-item-template", {
                        nr: t.rangNr,
                        team: t.naam,
                        played: t.wedAant,
                        wins: t.wedWinst,
                        draws: t.wedGelijk,
                        losses:  t.wedVerloren,
                        points: t.wedPunt
                    }, "tbody")
                    $("#standings-table tbody").append(tr);
                });
            }
            $("#standings-table").show(); 
        }         
    }
};


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
    repository.getTeam(vblteamid, function(vblteam){
        if(vblteam && vblteam.guid == vblteamid){
           renderPoules(vblteam);
           $(".loading").hide();
           $("#team-dashboard").css("visibility", "visible");
        }
    });     
});

$.topic("vbl.members.loaded").subscribe(function () {

});

$( document ).ready(function() {
    
});
