$( document ).ready(function() {
    var targetPage = "/b" + window.location.pathname + window.location.search
    $("#targetPage").attr("href",  targetPage);
    $("#targetPage").text(targetPage);
});