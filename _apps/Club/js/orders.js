function renderStyleSheet(){
	var style = document.createElement("style");

	style.setAttribute("media", "only screen and (max-width: 760px), (min-device-width: 768px) and (max-device-width: 1024px)");

	// WebKit hack :(
	style.appendChild(document.createTextNode(""));

	// Add the <style> element to the page
	document.head.appendChild(style);
	
	return style.sheet;
}
var sheet = renderStyleSheet();
var normalizedOptions = [];
var optionStatistics = [];
var numberOfOptionsToRender = 0;

function normalizeOptions(details){
	details.promotion.items.forEach(function(item){
		if(item.options) {
			item.options.forEach(function(option){
				normalizedOptions[option.name] = option;
				option.values.forEach(function(value){
					optionStatistics[value.name] = 0;
				});
			});
		}
	});
	numberOfOptionsToRender = Object.keys(normalizedOptions).length;
}

function renderHeader(details){
	var tr = $("#orders-table tr:first");
	var i = 1;
	sheet.insertRule("#orders-table td:nth-of-type(" + i + "):before {content: \"Naam\"; }", 0);
	
	
	// if multiple choices were allowed, list their names
	if(details.promotion.choiceType == "Multiple")
	{
		details.promotion.items.forEach(function(item) {
			var div = $.template("#available-item-template",
			{
				title: item.name
			});
			i++;
			sheet.insertRule("#orders-table td:nth-of-type(" + i + "):before {content: \"" + item.name + "\"; }", 0);
			tr.append($("<th>").addClass("responsive-table-cell").append(div));
		});
	}
	else{ // otherwise show as simple order
		var div = $.template("#available-item-template",
		{
			title: "Bestelling"
		});
		i++;
		sheet.insertRule("#orders-table td:nth-of-type(" + i + "):before {content: \"Bestelling\"; }", 0);
		tr.append($("<th>").addClass("responsive-table-cell").append(div));
	}

	if(numberOfOptionsToRender > 0)
	{
		i++;
		sheet.insertRule("#orders-table td:nth-of-type("+ i + "):before {content: \"Keuzes\"; }", 0);
		tr.append($("<th>").attr("colspan", numberOfOptionsToRender).addClass("responsive-table-cell").append("Keuzes"));
	}
	
	var div = $.template("#available-item-template",
	{
		title: "Totaal"
	});
	i++;
	sheet.insertRule("#orders-table td:nth-of-type("+ i + "):before {content: \"Totaal\"; }", 0);
	tr.append($("<th>").addClass("responsive-table-cell").append(div));	
}

function renderMultipleChoice(details){
	var table = $("#orders-table");
	details.subscriptions.forEach(function(subscription) {
		var div = $.template("#subscriber-template",
		{
			subscriberName: subscription.subscriberName
		});
		var tr = $("<tr>");
		table.append(tr.append($("<td>").addClass("responsive-table-cell").append(div)));
		var price = 0;
		details.promotion.items.forEach(function(item){
			var items = subscription.items.filter(function(e){ return e.promotionItem.id === item.id });
			
			var subscribed = items.length > 0 ? items[0] : null;
			if(subscribed)
			{
				var quantity = 0;
				items.forEach(function(s){
					quantity += s.quantity
				});	
				
				var content = $.template("#subscribed-template",
				{
					quantity: quantity
				});
				
				price += quantity * item.price;
				
				tr.append($("<td>").attr('id', subscribed.id).addClass("responsive-table-cell").append(content));				
			}
			else{
				if(details.promotion.choiceType == "Multiple") // if multiple choice and one choice was missing, assume it was not chosen
				{
					tr.append($("<td>").addClass("responsive-table-cell").append("0"));
				}
			}
			
		});			
		var content = $.template("#subscribed-template",
		{
			quantity: "€ " + price
		});
		
		tr.append($("<td>").addClass("responsive-table-cell").append(content));
	});
}

function renderSingleChoice(details){
	var table = $("#orders-table");
	details.subscriptions.forEach(function(subscription) {
		
		details.promotion.items.forEach(function(item){
			var items = subscription.items.filter(function(e){ return e.promotionItem.id === item.id });
			items.forEach(function(subscribed){
				var tr = $("<tr>");
				var div = $.template("#subscriber-template",
				{
					subscriberName: subscription.subscriberName
				});
				table.append(tr.append($("<td>").addClass("responsive-table-cell").append(div)));
				var price = item.price;
				if(subscribed)
				{
					var content = $.template("#subscribed-template",
					{
						quantity: subscribed.promotionItem.name
					});
					
					tr.append($("<td>").attr('id', subscribed.id).addClass("responsive-table-cell").append(content));	
					
					if(subscribed.selectedOptions){
						var optionCellsRendered = 0;
						subscribed.selectedOptions.forEach(function(option){
							tr.append($("<td>").addClass("responsive-table-cell").append(option.selectedOptionType.name));
							optionStatistics[option.selectedOptionType.name]++;
							optionCellsRendered++;
						});
						for(var i = optionCellsRendered; i < numberOfOptionsToRender; i++){
							tr.append($("<td>").addClass("responsive-table-cell").append(""));
						}
					}
				}
						
		
				var content = $.template("#subscribed-template",
				{
					quantity: "€ " + price
				});
				
				tr.append($("<td>").addClass("responsive-table-cell").append(content));
			});
			
			
		});			

		// show options

		
	});
}

function renderOptionStatistics(){
	var table = $("#option-statistics-table");
	var keys = Object.keys(optionStatistics);
	keys.forEach(function(key){
		var tr = $("<tr>");
		table.append(tr.append($("<td>").text(key)).append($("<td>").text(optionStatistics[key])));
	});
}

$(document).ready(function(){
    var id = $("#orders").attr("data-id");
    var service = "community-service.azurewebsites.net";
  //  var service = "localhost:22465"; // uncomment for local testing
    var uri= "https://" + service + "/api/promotions/" + id + "/subscriptions";
    var items = [];

    $.ajax({
        type: 'GET',
        url: uri,
        dataType: 'json', 
        crossDomain: true, 
        success: function(details){    
			
			normalizeOptions(details);
			renderHeader(details);
			if(details.promotion.choiceType == "Multiple"){
				renderMultipleChoice(details);
			}
			else{
				renderSingleChoice(details);
			}
            renderOptionStatistics();
        }
      });
});