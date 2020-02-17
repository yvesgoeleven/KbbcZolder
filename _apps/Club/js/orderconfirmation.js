var ordersService = "https://clubmgmt-orderbooking-service.azurewebsites.net";
//var ordersService = "http://localhost:22465";
var salesService = "https://clubmgmt-sales-service.azurewebsites.net";

var getParameterByName = function (name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
var o = getParameterByName("o");
var confirmation;
var sale;

Handlebars.registerHelper('line-item-total', function(orderLine) {
   return orderLine.quantity * orderLine.orderedItem.price.value;
});

Handlebars.registerHelper('order-total', function(confirmation) {
    var total = 0;
    
    confirmation.orderLines.forEach(function(orderLine){
        total += orderLine.quantity * orderLine.orderedItem.price.value;
    });
  
    return total;
  }); 

function loadSale(){
    var salesbaseuri = salesService + "/api/sales/";
	var uri = salesbaseuri + orgId + "/" + confirmation.saleId + "/";
	$.ajax({
		 type: 'GET',
		 url: uri,
		 dataType: 'json', 
		 crossDomain: true,
		 success: function(p){       
             sale = p;
             render();
		 }
	   });
}

function loadConfirmation(){
    var ordersbaseuri = ordersService + "/api/orderbookings/";
	var uri = ordersbaseuri + "confirmation/" + o;
	$.ajax({
		 type: 'GET',
		 url: uri,
		 dataType: 'json', 
		 crossDomain: true,
		 success: function(p){       
            confirmation = p;		
			 loadSale();
		 }
	   });
}

function render(){
    var tmp = $("#confirmation-template").text().replace("{{{{raw}}}}", "").replace("{{{{/raw}}}}", "");   
    fixExpectedDeliveryDateFormat(confirmation);
    var template = Handlebars.compile(tmp);
    var body = template({
        data: {
            confirmation: confirmation,
            sale: sale
        }
    });

    $("#confirmation-canvas").append(body);

    $("#confirmation-canvas").show();
    html2pdf()
        .set({ 
            html2canvas: { scale: 4, letterRendering: true }, 
         /*   jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } */
        })
        .from($("#confirmation-canvas")[0]).toPdf().get('pdf').then(function (pdf) {
            $("#confirmation-canvas").hide();
            var iframe = document.getElementById('printoutput');
            iframe.src = "/pdf/viewer.html?file=" + pdf.output('bloburl');
          });
}

function fixExpectedDeliveryDateFormat(confirmation)
{
    if(confirmation.deliveryExpectations){
        var start = new Date(confirmation.deliveryExpectations.expectedDeliveryDateRange.start);
        confirmation.deliveryExpectations.expectedDeliveryDateRange.start = start.toLocaleTimeString("nl-BE", { hour: '2-digit', minute: '2-digit'});

        var end = new Date(confirmation.deliveryExpectations.expectedDeliveryDateRange.end);
        confirmation.deliveryExpectations.expectedDeliveryDateRange.end = end.toLocaleTimeString("nl-BE", { hour: '2-digit', minute: '2-digit'});
    }
}

$(document).ready(function(){
   
    loadConfirmation();
   
});
