var dbversion = 5;
var usedb = indexedDB;
//var usedb = false;

Date.prototype.getWeek = function()
{
    //Calcing the starting point
    var today = new Date(this.setHours(0, 0, 0, 0));

    var day = today.getDay();
    var offset = (day == 0) ? 6 : day - 1;
    var date = today.getDate() - offset;

        // Grabbing Start/End Dates
    var startDate = new Date(today.setDate(date));
    var endDate = new Date(today.setDate(startDate.getDate() + 7));

    return [startDate, endDate];
}

Date.prototype.currentLocalTime = function()
{
    var offset = -(this.getTimezoneOffset()/60);  
    return this.getTime() + offset * 3600 * 1000;
}


var repository = new function(){
    var self = this;

    this.initialize = function(vblOrgId, partnerTeamIds){
        self.vblOrgId = vblOrgId;   
        self.partnerTeamIds = partnerTeamIds;
        self.matches = [];
        self.matchDetails =  []; 

        if (usedb) {  

            var request = indexedDB.open(vblOrgId, dbversion);
            request.onerror = function(event) {
                console.warn("Database error: " + event.target.errorCode);
                $.topic("db.open.error").publish();
            };
            request.onsuccess = function(event) {
                self.db = event.target.result;
                console.log("Database opened");
                $.topic("db.open.success").publish();
                $.topic("repository.initialized").publish();               
            };
            request.onupgradeneeded = function(event) { 
                console.log("Database upgrade needed");
                self.db = event.target.result;
                self.ensureOrganisationsStore();
                self.ensureTeamsStore();
                self.ensureMembersStore();
                self.ensureMatchesStore();
                self.ensureMatchDetailsStore();
            };

        }
        else
        {
            console.warn("Browser doesn't support a stable version of IndexedDB.");
            $.topic("repository.initialized").publish(); 
        }
    }

    this.ensureOrganisationsStore =  function(){
        if (usedb && !self.db.objectStoreNames.contains('organisations')) {
            var orgStore = self.db.createObjectStore("organisations", { keyPath: "guid" });
        }
    }

    this.ensureTeamsStore =  function(){
        if (usedb && !self.db.objectStoreNames.contains('teams')) {
            var orgStore = self.db.createObjectStore("teams", { keyPath: "guid" });
        }
    }

    this.ensureMembersStore =  function(b){
         if (usedb && !self.db.objectStoreNames.contains('members')) {
            var memberStore = self.db.createObjectStore("members", { keyPath: "relGuid" });
         }
    }

    this.ensureMatchesStore =  function(b){
         if (usedb && !self.db.objectStoreNames.contains('matches')) {
            var matchesStore = self.db.createObjectStore("matches", { keyPath: "guid" });
            matchesStore.createIndex("jsDTCode", "jsDTCode")
         }
    }

    this.ensureMatchDetailsStore =  function(b){
         if (usedb && !self.db.objectStoreNames.contains('matchDetails')) {
            var matchesStore = self.db.createObjectStore("matchDetails", { keyPath: "doc.guid" });
            matchesStore.createIndex("jsDTCode", "doc.jsDTCode")
         }
    }

    this.loadOrganization = function(){
        vbl.orgDetail(self.vblOrgId, function(orgs){
            if(usedb){
                var tx = self.db.transaction("organisations", "readwrite").objectStore("organisations");
                orgs.forEach(function(o){
                    tx.put(o);
                });     
            }  
            else{
                 self.orgs = orgs;
             }
              $.topic("vbl.organisation.loaded").publish();                 
        }); 
    }

     this.loadTeam = function(teamId){
        vbl.teamDetail(teamId, function(teams){
            if(usedb){
                var tx = self.db.transaction("teams", "readwrite").objectStore("teams");
                teams.forEach(function(t){
                    tx.put(t);
                });  
            }  
            else{
                 self.teams = teams;
             }
             $.topic("vbl.team.loaded").publish();                 
        }); 
    }

    this.loadMembers = function(){
        vbl.members(self.vblOrgId, function(members){
            if(usedb){
                var tx = self.db.transaction("members", "readwrite").objectStore("members");
                members.forEach(function(m){
                tx.put(m);
                });
            }    
            else{
                 self.members = members;
             }
             $.topic("vbl.members.loaded").publish();
        }); 
    }

    this.loadMatches = function(){
        waitFor = [];
        var wait = new $.Deferred();
        vbl.matches(self.vblOrgId, function(matches){
             if(usedb){
                var tx = self.db.transaction("matches", "readwrite").objectStore("matches");
                matches.forEach(function(m){
                    tx.put(m);
                });
             }
             else{
                 self.matches.push.apply(self.matches, matches);
             }
             wait.resolve();
        });
        waitFor.push(wait);
        partnerTeamIds.forEach(function(teamId){
            var wait = new $.Deferred();
            vbl.teamMatches(teamId, function(matches){
                if(usedb){
                    var tx = self.db.transaction("matches", "readwrite").objectStore("matches");
                    matches.forEach(function(m){
                        tx.put(m);
                    });
                }
                else{
                    self.matches.push.apply(self.matches, matches);
                }
                wait.resolve();             
            }); 
            waitFor.push(wait);
        });

        $.when.apply($, waitFor).then(function() {
          $.topic("vbl.matches.loaded").publish();
        });
        
    }

    this.loadMatchDetails = function(matchId){
         vbl.matchDetails(matchId, function(matches){
             if(usedb){
                var tx = self.db.transaction("matchDetails", "readwrite").objectStore("matchDetails");
                matches.forEach(function(m){
                    tx.put(m);
                });
             }
             else{
                 self.matchDetails.push.apply(self.matchDetails, matches);
             }
              $.topic("vbl.match.details.loaded").publish();
        });
    }

    this.currentOrganisation = function(callback){
         if(usedb){
            self._currentOrganisationFromDb(callback);           
         }
         else{
            self._currentOrganisationFromArrays(callback); 
         }
    }

    this._currentOrganisationFromDb = function(callback){
        var tx = self.db.transaction("organisations", "readonly");
        var store = tx.objectStore("organisations");

        store.openCursor().onsuccess = function(e) {
            var cursor = e.target.result;
            if(cursor) {
                var key = cursor.key;
                var match = cursor.value;
                if(callback) callback(match);
            }
        }
    }
    
    this._currentOrganisationFromArrays = function(callback){
       callback(self.orgs[0]);
    }

     this.getTeam = function(teamid, callback){
         if(usedb){
            self._getTeamFromDb(teamid,callback);           
         }
         else{
            self._getTeamFromArrays(teamid,callback); 
         }
    }

    this._getTeamFromDb = function(teamid, callback){
        var tx = self.db.transaction("teams", "readonly");
        var store = tx.objectStore("teams");

        var req = store.get(teamid);

        req.onsuccess = function(event) {
            callback(req.result);
        };
    }
    
    this._getTeamFromArrays = function(teamid, callback){
       self.teams.forEach(function(team){
            if(team.guid == teamid){
                 callback(team);
            }
        });
    }

    this.futureMatchesOfTeam = function(teamId, callback){
         if(usedb){
            self._futureMatchesOfTeamFromDb(teamId, callback);           
         }
         else{
            self._futureMatchesOfTeamFromArrays(teamId, callback); 
         }
    }

    this._futureMatchesOfTeamFromDb = function(teamId, callback){
        var tx = self.db.transaction("matches", "readonly");
        var store = tx.objectStore("matches");
        var index = store.index("jsDTCode");

         var now = new Date().currentLocalTime();

        var range = IDBKeyRange.lowerBound(now);
        index.openCursor(range).onsuccess = function(e) {
            var cursor = e.target.result;
            if(cursor) {
                var key = cursor.key;
                var match = cursor.value;
                if((match.tTGUID == teamId || match.tUGUID == teamId)){
                     if(callback) callback(match);
                }
                cursor.continue();
            }
        }
    }

    this._futureMatchesOfTeamFromArrays = function(teamId, callback){
         var now = new Date().currentLocalTime();
        self.matches.forEach(function(match){
            if((match.tTGUID == teamId || match.tUGUID == teamId) && match.jsDTCode > now){
                callback(match);
            }
        });
    }

    this.futureMatches = function(callback){
        if(usedb){
           self._futureMatchesFromDb(callback);           
        }
        else{
           self._futureMatchesFromArrays(callback); 
        }
   }

   this._futureMatchesFromDb = function(callback){
       var tx = self.db.transaction("matches", "readonly");
       var store = tx.objectStore("matches");
       var index = store.index("jsDTCode");

        var now = new Date().currentLocalTime();

       var range = IDBKeyRange.lowerBound(now);
       index.openCursor(range).onsuccess = function(e) {
           var cursor = e.target.result;
           if(cursor) {
               var key = cursor.key;
               var match = cursor.value;
               if(match && ((match.tTGUID.startsWith(vblOrgId) || partnerTeamIds.indexOf(encodeURIComponent(match.tTGUID)) !== -1) ||
                (match.tUGUID.startsWith(vblOrgId) || partnerTeamIds.indexOf(encodeURIComponent(match.tUGUID)) !== -1)))    
                {
                    if(callback) callback(match);
                }  
               cursor.continue();
           }
       }
   }

   this._futureMatchesFromArrays = function(callback){
        var now = new Date().currentLocalTime();
       self.matches.forEach(function(match){
           if(match.jsDTCode > now){
               callback(match);
           }
       });
   }

    this.matchesInWeekOf = function(date, callback){
         if(usedb){
            self._matchesInWeekOfFromDb(date, callback);           
         }
         else{
            self._matchesInWeekOfFromArrays(date, callback); 
         }
    }

    this._matchesInWeekOfFromDb = function(date, callback){
        var dates = date.getWeek();
        var tx = self.db.transaction("matches", "readonly");
        var store = tx.objectStore("matches");
        var index = store.index("jsDTCode");

        var range = IDBKeyRange.bound(dates[0].currentLocalTime(), dates[1].currentLocalTime());
        index.openCursor(range).onsuccess = function(e) {
            var cursor = e.target.result;
            if(cursor) {
                var key = cursor.key;
                var match = cursor.value;
                if(match && ((match.tTGUID.startsWith(vblOrgId) || partnerTeamIds.indexOf(encodeURIComponent(match.tTGUID)) !== -1) ||
                (match.tUGUID.startsWith(vblOrgId) || partnerTeamIds.indexOf(encodeURIComponent(match.tUGUID)) !== -1)))    
                {
                    if(callback) callback(match);
                }    
                cursor.continue();
            }
        }
    }

    this._matchesInWeekOfFromArrays = function(date, callback){
         var dates = date.getWeek();
        self.matches.forEach(function(match){
            if(match.jsDTCode >= dates[0].currentLocalTime() && match.jsDTCode <= dates[1].currentLocalTime()){
                callback(match);
            }
        });
    }

    var computeSeasonStart = function(date){
        var year = date.getFullYear();
        var month = date.getMonth() + 1;
        if(month >= 7){
            return new Date(year, 6, 1);
        }
        else{
            return new Date(year - 1, 6, 1);
        }
    };

    this.pastMatches = function(teamId, callback){
         if(usedb){
            self._pastMatchesFromDb(teamId, callback);           
         }
         else{
            self._pastMatchesFromArrays(teamId, callback); 
         }
    }

    this._pastMatchesFromDb = function(teamId, callback){
        var tx = self.db.transaction("matches", "readonly");
        var store = tx.objectStore("matches");
        var index = store.index("jsDTCode");

        var today = new Date();
        var seasonStart = computeSeasonStart(today);

        var range = IDBKeyRange.bound(seasonStart.getTime(), today.getTime());
        index.openCursor(range).onsuccess = function(e) {
            var cursor = e.target.result;
            if(cursor) {
                var key = cursor.key;
                var match = cursor.value;
                if((match.tTGUID == teamId || match.tUGUID == teamId)){
                     if(callback) callback(match);
                }
                cursor.continue();
            }
        }
    }

    this._pastMatchesFromArrays = function(teamId, callback){
        var today = new Date();
        var seasonStart = computeSeasonStart(today);
        self.matches.forEach(function(match){
            if((match.tTGUID == teamId || match.tUGUID == teamId) && (match.jsDTCode >= seasonStart.getTime() && match.jsDTCode <= today.getTime())){
                callback(match);
            }
        });
    }

    this.nextMatch = function(callback){
         if(usedb){
            self._nextMatchFromDb(callback);           
         }
        else{
            self._nextMatchFromArrays(callback); 
         }
    }

    this._nextMatchFromDb = function(callback){
        var tx = self.db.transaction("matches", "readonly");
        var store = tx.objectStore("matches");
        var index = store.index("jsDTCode");

        var now = new Date().currentLocalTime();

        var range = IDBKeyRange.lowerBound(now);
        index.openCursor(range).onsuccess = function(e) {
            var cursor = e.target.result;
            if(cursor) {
                var key = cursor.key;
                var match = cursor.value;
                if(match && ((match.tTGUID.startsWith(vblOrgId) || partnerTeamIds.indexOf(encodeURIComponent(match.tTGUID)) !== -1) ||
                            (match.tUGUID.startsWith(vblOrgId) || partnerTeamIds.indexOf(encodeURIComponent(match.tUGUID)) !== -1)))
                
                {
                    if(callback) callback(match);
                }
                else{
                    cursor.continue();
                }
            }
        }         
    }

    this._nextMatchFromArrays = function(callback){
        var now = new Date().currentLocalTime();
        var futureMatches = [];
        self.matches.forEach(function(match){
            if(match.jsDTCode > now){
                futureMatches.push(match);
            }
        });

        if(futureMatches.length > 0)
        {
            futureMatches.sort(function(a,b) {return (a.jsDTCode > b.jsDTCode) ? 1 : ((b.jsDTCode > a.jsDTCode) ? -1 : 0);} );
            var match = futureMatches.shift();
            while(match)
            {
                if(((match.tTGUID.startsWith(vblOrgId) || partnerTeamIds.indexOf(encodeURIComponent(match.tTGUID)) !== -1) ||
                    (match.tUGUID.startsWith(vblOrgId) || partnerTeamIds.indexOf(encodeURIComponent(match.tUGUID)) !== -1)))    
                {
                    if(callback) callback(match);
                    match = null;
                }
                else{
                    match = futureMatches.shift();
                }
            }
        }
    }

    this.nextMatchOfTeam = function(teamId, callback){
         if(usedb){
            self._nextMatchOfTeamFromDb(teamId, callback);           
         }
         else{
            self._nextMatchOfTeamFromArrays(teamId, callback); 
         }
    }

    this._nextMatchOfTeamFromArrays = function(teamId, callback){
        var now = new Date().currentLocalTime();
        var futureMatchesOfTeam = [];
        self.matches.forEach(function(match){
            if((match.tTGUID == teamId || match.tUGUID == teamId) && match.jsDTCode > now){
                futureMatchesOfTeam.push(match);
            }
        });

        if(futureMatchesOfTeam.length > 0)
        {
            futureMatchesOfTeam.sort(function(a,b) {return (a.jsDTCode > b.jsDTCode) ? 1 : ((b.jsDTCode > a.jsDTCode) ? -1 : 0);} );
            callback(futureMatchesOfTeam[0])
        }
    }

    this._nextMatchOfTeamFromDb = function(teamId, callback){
        var tx = self.db.transaction("matches", "readonly");
        var store = tx.objectStore("matches");
        var index = store.index("jsDTCode");

        var now = new Date().currentLocalTime();

        var range = IDBKeyRange.lowerBound(now);
        index.openCursor(range).onsuccess = function(e) {
            var cursor = e.target.result;
            if(cursor) {
                var key = cursor.key;
                var match = cursor.value;
                if(match.tTGUID == teamId || match.tUGUID == teamId)
                {
                    if(callback) callback(match);
                }
                else{
                    cursor.continue();
                }                
            }
        }
    }

    this.getMatchDetails = function(matchId, callback){
         if(usedb){
            self._getMatchDetailsFromDb(matchId, callback);           
         }
         else{
            self._getMatchDetailsFromArrays(matchId, callback); 
         }
    }

    this._getMatchDetailsFromArrays = function(matchId, callback){
        self.matchDetails.forEach(function(match){
            if(match.doc.guid == matchId){
              callback(match)
            }
        });
    }

    this._getMatchDetailsFromDb = function(matchId, callback){
        var tx = self.db.transaction("matchDetails", "readonly");
        var store = tx.objectStore("matchDetails");

        var req = store.get(matchId);

        req.onsuccess = function(event) {
            callback(req.result);
        };
    }
}

