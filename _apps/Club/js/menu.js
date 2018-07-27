$.topic("repository.initialized").subscribe(function () {
  repository.loadOrganization();
});

var order = ["HSE", "DSE", "J21", "M21", "J19", "M19", "J16", "M16", "J14", "M14", "G14", "G12", "G10", "G8", "G6"];
$.topic("vbl.organisation.loaded").subscribe(function () {
    repository.currentOrganisation(function(org){
        var sortedTeams = org.teams.sort(function(t1, t2){
            var naam1 = t1.naam.replace("Basket Lummen ", "");
            var code1 = naam1.substring(0, 3);
            var index1 = order.indexOf(code1);
            var naam2 = t2.naam.replace("Basket Lummen ", "");
            var code2 = naam2.substring(0, 3);
            var index2 = order.indexOf(code2);

            if(index1 == index2){
                var last1 = naam1.slice(-1);
                var last2 = naam2.slice(-1);
                if(last1 < last2) return -1;
                if(last1 > last2) return 1;
                return 0;
            }
            else{
                return index1 - index2;
            }
        });
        sortedTeams.forEach(function(team){
            var guid = encodeURIComponent(team.guid);
            var naam = team.naam.replace("Basket Lummen ", "");
            if($("[id=' + guid + ']").length){
                var markup = "<li id="+ guid + "><a href=\"/teams?teamid=" + guid + "\">" + naam + "</a></li>";
                if(naam.lastIndexOf("HSE", 0) === 0 || naam.lastIndexOf("DSE", 0) === 0){
                    $(markup).insertBefore("#teams-menu-separator");
                }
                else{
                    $("#teams-menu").append(markup);
                } 
            }
                      
        });
    });
   
});
