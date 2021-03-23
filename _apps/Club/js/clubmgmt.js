var clubmgmtimgbase = "https://clubmgmt.blob.core.windows.net/profiles/";
var clubmgmtleaguebaseuri = "https://league-service.azurewebsites.net/api/leagues/";
var clubmgmtorgbaseuri = "https://org-service.azurewebsites.net/api/organizations/";
var leagueId = "09346d48-da8b-4b66-ab72-c04bad59d3d8";

var clubmgmt = new function(){
    var self = this;

    this.getRequest = function(uri, callback){
        var xhttp = new XMLHttpRequest();
        xhttp.onload = function () { 
            callback(xhttp.status == 204 ? null : JSON.parse(xhttp.responseText)); 
        };
        xhttp.onerror = function xhrError () { console.error(this.statusText); }
        xhttp.open("GET", uri, true);
        xhttp.setRequestHeader("Content-type", "application/json");
        xhttp.send();    
    }
    
    //"{leagueid}/organizations/{orgId}/groups/{groupId}"
    this.mapTeam = function(groupId,callback){
        self.getRequest(clubmgmtleaguebaseuri + leagueId + "/organizations/" + orgId + "/groups/" + groupId, function(mapping){
            callback(mapping);           
        });
    }

    //{orgid}/groups/{groupid}
    this.loadTeam = function(groupId, callback){
        self.getRequest(clubmgmtorgbaseuri + orgId + "/groups/" + groupId, function(group){
            callback(group);           
        });
    }

}
