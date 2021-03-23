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

var renderNextMatch = function(){
  repository.nextMatchOfTeam(vblteamid, function(match){
        var src;
        var name;
        if(vblteamid != match.tTGUID){
            src = vbl.teamimage(match.tTGUID);
            name = match.tTNaam;
        }
        if(vblteamid != match.tUGUID){
            src = vbl.teamimage(match.tUGUID);
            name = match.tUNaam;
        }

        var d = new Date(match.jsDTCode);
        var div = $.template("#next-game-template",
        {
            matchuri: "/match/?matchid=" + match.guid,
            imgurl: "background: url(" + src +  "), url('/img/icon.jpg'); background-repeat: no-repeat; background-position: center center; background-size: cover;",
            name: name,
            day: d.toLocaleString(window.navigator.language, {weekday: 'long'}),
            date: d.toLocaleString(window.navigator.language, {day: 'numeric'}) + " " + d.toLocaleString(window.navigator.language, {month: 'long'}),
            time: ('0'+d.getUTCHours()).slice(-2) + ":" + ('0'+d.getMinutes()).slice(-2),
            location: match.accNaam
        });
        $("#next-game-placeholder").append(div);     
  });

  repository.futureMatchesOfTeam(vblteamid, function(match){
    var tr = $.template("#future-game-template", {
                date: match.datumString,
                time: match.beginTijd,
                home: match.tTNaam,
                away: match.tUNaam
            }, "tbody");
    var matchuri= "/match/?matchid=" + match.guid;
    tr.attr('onclick', 'window.document.location="' + matchuri + '";')
    $(".future-games").append(tr);
  });

repository.pastMatches(vblteamid, function(match){
    var tr = $.template("#past-game-template", {
                date: match.datumString,
                time: match.beginTijd,
                home: match.tTNaam,
                away: match.tUNaam,
                result: match.uitslag
            }, "tbody");
     var matchuri= "/match/?matchid=" + match.guid;
    tr.attr('onclick', 'window.document.location="' + matchuri + '";')
    $(".past-games").append(tr);
  });

};

var renderStandings = function(vblTeam){
      
    var qs = null;
    if(teamid != null){
        qs = "teamid=" + teamid; 
    }
    else if(vblteamid != null){
        qs = "vblteamid=" + vblteamid;   
    }

    $("#link-calendar").attr('href', '/teams/calendar/?' + qs);
    $("#link-results").attr('href', '/teams/results/?' + qs);

    if(vblTeam && vblTeam.poules){
        vblTeam.poules.forEach(function(p){
            if(p.naam.indexOf("OEFEN") === -1){
                var rank = "-";
                if(p.teams){
                    p.teams.forEach(function(t){
                        if(t.guid == vblteamid){
                            rank = t.rangNr;
                        }
                    });
                }

                var div = $.template("#standings-template",
                {
                    name: p.naam,
                    rank: rank           
                });
                var a = $(div).find(".detail-toggle");
                a.attr('href', '/teams/standings/?' + qs + "&poule=" + p.guid)
                $(".results").append(div);        
            }  
        });
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
    repository.loadMatches();
    repository.getTeam(vblteamid, function(vblteam){

        renderStandings(vblteam);
        $(".loading").hide();
        $("#team-dashboard").css("visibility", "visible");

    });     
});

$.topic("vbl.matches.loaded").subscribe(function () {
     renderNextMatch();   
});

$.topic("vbl.members.loaded").subscribe(function () {

});

$( document ).ready(function() {
    
});
