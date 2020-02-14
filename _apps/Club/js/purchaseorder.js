if (!String.prototype.format) {
    String.prototype.format = function() {
      var args = arguments;
      return this.replace(/{(\d+)}/g, function(match, number) { 
        return typeof args[number] != 'undefined'
          ? args[number]
          : match
        ;
      });
    };
  }

var catalogService = "https://clubmgmt-catalog-service-test.azurewebsites.net";
var salesService = "https://clubmgmt-sales-service-test.azurewebsites.net";
var ordersService = "https://clubmgmt-orderbooking-service-test.azurewebsites.net";
//var sequenceService = "https://sequence-service-test.azurewebsites.net";
var sequenceService = "http://localhost:22465/";
var promotionholder;
var optional;
var required;
var salesid;
var title;
var buttontext;
var nexttext;
var sale;
var collection;
var offersPerItem = {};
var itemDescriptions = [];
var selectedOptionMemory = [];

function renderInputField(td, offer, rules, messages, style, variants){

	if(offer.orderLimit != null)
    {
        var min = offer.orderLimit.minimumQuantity != null ? offer.orderLimit.minimumQuantity : 0;
        var max = offer.orderLimit.maximumQuantity != null ? offer.orderLimit.maximumQuantity : Number.MAX_SAFE_INTEGER; 
        rules[offer.id] = {
            range: [min, max]
        };
        messages[offer.id] = {
            range : "Vul een getal in tussen " + min + " en " + max
        }
    }
    else{
        rules[offer.id] = {
            number: true
        };
        messages[offer.id] = {
            number: "Vul een getal in"
        };

	}
	
	var inputTextVisible = offer.orderLimit == null || (offer.orderLimit.maximumQuantity > 1 || offer.orderLimit.maximumQuantity == null);
    var min = offer.orderLimit != null ? offer.orderLimit.minimumQuantity : 0;
    var max = offer.orderLimit != null ? offer.orderLimit.maximumQuantity : Number.MAX_SAFE_INTEGER;
    var checkType = sale.choice == "Multiple" ? 'checkbox' : 'radio';
	var name = sale.choice == "Multiple" ? offer.id : "selection";

	var id = guid();
    var input = $('<input>').attr({ type: 'text', id:id, name: name, "data-itemid": offer.id, placeholder: '0' }).addClass("promotionitem").toggle(inputTextVisible);
    if(style){ input.css(style); }
		
	if(variants){
		for(var variant of variants){
			input.attr("data-variant-" + variant.optionSetId, variant.option.id);
		}
	}

	td.append(input);

    if(!inputTextVisible){
        td.append($('<input>').attr({ type: checkType, name: name, "data-targetid": id, "data-itemid": offer.id,  "data-minvalue": min, "data-maxvalue": max }).addClass("promotionitemtoggle"));
	}
	
	return id;
}

function renderSelect(td, targetid, itemId, optionSet){
	var sel = $("<select>").attr('data-targetid', targetid).attr('data-itemId', itemId).attr('data-optionsetid', optionSet.id).attr('data-optionsetname', optionSet.name);
	optionSet.options.forEach(function(value){
		sel.append($("<option>").attr("value", value.id).text(value.name));
	});
	var previouslySelected = selectedOptionMemory.hasOwnProperty(optionSet.name);
	if(previouslySelected){
		sel.val(selectedOptionMemory[optionSet.name]);
	}	

	td.append(sel);
}

function renderItemLabel(td, offers, itemDescription){
	if(offers.length == 1){ // single offer, render label with price
		var offer = offers[0];
		td.append($('<label>').text(itemDescription.name + (offer.price.value > 0 ? " " + offer.price.currency + offer.price.value : "")));
	}
	else{ // multiple offers, render label only
		td.append($('<label>').text(itemDescription.name));
	}
}

function renderOptions(tr, targetId, offers, itemDescription, rules, messages){
	if(!itemDescription || itemDescription.optionSets == null) return;
	var uniqueOptionSets = extractUniqueOptionSets(itemDescription);
	
	if(itemDescription.optionSets.length >= 1 && uniqueOptionSets.length == 1){ // all values in the different optionsets are equal
		renderOptionsAsDropDowns(tr, targetId, offers, itemDescription, rules, messages);
	}

	if(itemDescription.optionSets.length >= 2 && uniqueOptionSets.length == 2){ // render this as a table
		renderOptionsAsTable(tr, offers, itemDescription, rules, messages);
	}

}
function renderOptionsAsDropDowns(tr, targetid, offers, itemDescription, rules, messages){	

	var render = function(callback){
		itemDescription.optionSets.forEach(function(optionSet){

			var offer = offers[0];

			var td = $('<td>');
			
			renderSelect(td, targetid, offer.id, optionSet);	

			var toInsert = $('<tr>')
				.append($('<td>').append($('<label>').text(optionSet.name)))
				.append(td);

			callback(toInsert);
		});	
	}

	var wireOptionsets = function(){
		var optionsetid = $(this).attr('data-optionsetid');
		var optionsetname = $(this).attr('data-optionsetname');
		var targetid = $(this).attr('data-targetid');
		var val = $(this).val();

		$("#" + targetid).attr("data-variant-" + optionsetid, val);

		selectedOptionMemory[optionsetname] = val;
	}

	if(sale.choice == "Multiple"){
		render(toInsert => tr.after(toInsert));
		$("select[data-optionsetid]").unbind("change", wireOptionsets).bind("change", wireOptionsets);
	}
	else{
		$(".promotionitemtoggle[data-targetid=\"" + targetid + "\"]").change(function(){

			$(".temporary-row").remove();			
			render(toInsert => {
				toInsert.addClass("temporary-row");
				$(".total-row").before(toInsert);
			});
			$("select[data-optionsetid]").unbind("change", wireOptionsets).bind("change", wireOptionsets);
		});
	}

	
}

function renderOptionsAsTable(tr, offers, itemDescription, rules, messages){	
	var uniqueOptionSets = extractUniqueOptionSets(itemDescription);

	var xAxis = findOptionSetWithSmallestTotalLabelLength(uniqueOptionSets);
	var yAxis = findOptionSetWithHighestTotalLabelLength(uniqueOptionSets);

	var count = xAxis.optionSet.options.length;
	var width = "calc(" + (340 / count) + "px - " +  ((0.2 * count) - (0.4 / count)) + "em)";
	var style = { "width": width, "min-width": width, "margin" : "0.2em" };

	for(var option of yAxis.optionSet.options.slice().reverse()){
		var td1 = $("<td>");

		var offer = offers.filter(o => o.variantLimits[0].matchingValues.includes(option.id))[0]

		td1.append($("<span>").text(option.name + ((offer != null && offer.price.value > 0) ? " " + offer.price.currency + offer.price.value : "")));

		var td2 = $("<td>");
		

		for (var opt of xAxis.optionSet.options){

			// y-axis offer precedes x-axis if both should exist
			if(offer == null) offer = offers.filter(o => o.variantLimits[0].matchingValues.includes(opt.id))[0]

			renderInputField(td2, offer, rules, messages, style, [{
				optionSetId: yAxis.optionSet.id,
				option: option
			}, {
				optionSetId: xAxis.optionSet.id,
				option: opt
			}]);
		}

		var toInsert = $('<tr>')
			.append(td1)
			.append(td2);

		tr.after(toInsert);
	}	
}

function renderOfferOrOptionLabels(td, offers, itemDescription, rules, messages){
	if(offers.length == 1){ // single offer, render the input field
		var offer = offers[0];
		return renderInputField(td, offer, rules, messages);
	}
	else { // render labels of the options when there are more then 1 option set
		var uniqueOptionSets = extractUniqueOptionSets(itemDescription);

		if(uniqueOptionSets.length > 1){
			var toRender = findOptionSetWithSmallestTotalLabelLength(uniqueOptionSets) 

			td.css({
				"display": "flex",
                "justify-content": "space-between",
                "max-width": "340px",
			})

			for(var option of toRender.optionSet.options){
				
				var offer = offers.filter(o => o.variantLimits[0].matchingValues.includes(option.id))[0]

				td.append($("<span>").text(option.name + ((offer != null && offer.price.value > 0) ? " " + offer.price.currency + offer.price.value : "")).css("padding", "1vh 0vw"));
			}
		}

		return null;
	}
}

function findOptionSetWithSmallestTotalLabelLength(optionSets){
	var potential = computeTotalLabelLengthPerOptionSet(optionSets);
	var lowest = potential[0];
	var mayBeLower;
	for (var i=potential.length-1; i>=0; i--) {
		mayBeLower = potential[i];
		if (mayBeLower.length < lowest.length) lowest = mayBeLower;
	}
	return lowest;
}
function findOptionSetWithHighestTotalLabelLength(optionSets){
	var potential = computeTotalLabelLengthPerOptionSet(optionSets);
	var highest = potential[0];
	var mayBeHigher;
	for (var i=potential.length-1; i>=0; i--) {
		mayBeHigher = potential[i];
		if (mayBeHigher.length > highest.length) highest = mayBeHigher;
	}
	return highest;
}

function computeTotalLabelLengthPerOptionSet(optionSets){
	var results = [];

	for(var optionSet of optionSets){
		var length = 0;
		for(var option of optionSet.options){			
			length += option.name.length;	
		}		
		results.push({
			length: length,
			optionSet: optionSet
		});
	}

	return results;
}

function extractUniqueOptionSets(itemDescription){
	var filtered = [];

	for(var optionSet of itemDescription.optionSets){	
			
		var found = false;

		for(var toCompare of filtered){
			found = compare(toCompare.options, optionSet.options, "id");
			if(found) break;
		}

		if(!found){
			filtered.push(optionSet);
		}

	}

	return filtered;
}

function compare(array1, array2, prop) {
	if (array1.length != array2.length) {
	  return false;
	}
  
	array1 = array1.slice();
	array1.sort();
	array2 = array2.slice();
	array2.sort();
  
	for (var i = 0; i < array1.length; i++) {
	  if (array1[i][prop] != array2[i][prop]) {
		return false;
	  }
	}
  
	return true;
  }

function renderOffers(table, rules, messages){

	var shouldShowTotal = true;
	// All items should be rendered as a list

	for (var itemId in offersPerItem) {
		if (offersPerItem.hasOwnProperty(itemId)){				
			if(offersPerItem[itemId].length > 0){
				
				shouldShowTotal = shouldShowTotal && offersPerItem[itemId].filter(o => (o.price.value > 0)).length > 0;
				var itemDescription = itemDescriptions[itemId];
				
				var tr =  $('<tr>');
				var td1 =  $('<td>');
				var td2 =  $('<td>');
 
				renderItemLabel(td1, offersPerItem[itemId], itemDescription);
				var targetId = renderOfferOrOptionLabels(td2, offersPerItem[itemId], itemDescription, rules, messages);
				
				tr.append(td1);
				tr.append(td2);
				table.append(tr);

				renderOptions(tr, targetId, offersPerItem[itemId], itemDescription, rules, messages);
				

			}
		}
	}

	return shouldShowTotal;
}
 

function renderForm(){
    
    selectedOptionMemory = [];
    promotionholder.empty();

    var table = $('<table>');

    promotionholder.append($('<form>').addClass('responsive-form')
                    .append($('<fieldset>')
                    .append($('<legend>').text(title))
                    .append(table)));

    var today = new Date();
    var fromDate = new Date(sale.start);
    var fromDatePassed = fromDate < today;
    var toDatePassed = new Date(sale.end) <= today;

    if(!fromDatePassed){
        table.append($('<tr>')
                .append($('<td>').append($('<label>').text('Registratie gaat pas open op ' + fromDate.toLocaleDateString("nl-BE", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })))));;
    }

    if(toDatePassed){
        table.append($('<tr>')
                .append($('<td>').append($('<label>').text('Registratie is afgelopen'))));;
    }

    if(fromDatePassed && !toDatePassed)
    {

        table.append($('<tr>')
            .append($('<td>').append($('<label>').text('Voornaam').attr('for', 'firstname')))
            .append($('<td>').append($('<input>').attr({ type: 'text', id: 'firstname', name: 'firstname', placeholder: 'Vul je voornaam in...' }))));

        table.append($('<tr>')
            .append($('<td>').append($('<label>').text('Naam').attr('for', 'name')))
            .append($('<td>').append($('<input>').attr({ type: 'text', id: 'name', name: 'name', placeholder: 'Vul je naam in...' }))));

        if(required.includes("email") || optional.includes("email")){
            table.append($('<tr>')
                .append($('<td>').append($('<label>').text('Email').attr('for', 'email')))
                .append($('<td>').append($('<input>').attr({ type: 'text', id: 'email', name: 'email', placeholder: 'Vul je email in...' })))); 
        }

        if(required.includes("address") || optional.includes("address")){
            table.append($('<tr>')
                .append($('<td>').append($('<label>').text('Adres').attr('for', 'address')))
                .append($('<td>').append($('<input>').attr({ type: 'text', id: 'address', name: 'address', placeholder: 'Vul je adres in...' }))));
        }
        
        if(required.includes("telephone") || optional.includes("telephone")){
            table.append($('<tr>')
                .append($('<td>').append($('<label>').text('Telefoon').attr('for', 'telephone')))
                .append($('<td>').append($('<input>').attr({ type: 'text', id: 'telephone', name: 'telephone', placeholder: 'Vul je telefoonnummer in...' }))));
        }

        // set up form validation rules
        var rules = {
            name: {
                required: true
            },
            firstname: {
                required: true
            },
            email: {
                required: false
            },
            address: {
                required: false
            },
            telephone: {
                required: false
            }
        };
        required.forEach(function(r){
            rules[r].required = true;
        });

        // set up form validation messages
        var messages = {
            name: {
                required: "Naam is verplicht"
            },
            firstname: {
                required: "Voornaam is verplicht"
            },
            email: {
                required: "Email is verplicht"
            },
            address: {
                required: "Adres is verplicht"
            },
            telephone: {
                required: "Telefoon is verplicht"
            }
        };

        // render offers
        var shouldShowTotal = renderOffers(table, rules, messages);
        
        if(shouldShowTotal){
            table.append($('<tr class="total-row">')
                .append($('<td>').append($('<label>').text('Te betalen')))
                .append($('<td>').append($('<label>').text('€ 0').attr('id', 'price'))));
        }

        if(sale.deliverySlots.length > 0)
        {
            sale.deliverySlots.forEach(function(d, i){

                var start = new Date(d.start);
                var end = new Date(d.end);
                var toShow = start.toLocaleTimeString("nl-BE", {hour: '2-digit', minute:'2-digit'}) + " tot " + end.toLocaleTimeString("nl-BE", {hour: '2-digit', minute:'2-digit'});

                table.append($('<tr>')
                            .append($('<td>').append($('<label>').text(i == 0 ? 'Wij komen van': '').attr('for', 'delivery')))
                            .append($('<td>').append($('<input>').attr({ type: 'radio', id: 'delivery_' + i, name: 'delivery', value: JSON.stringify(d) })).append(" " + toShow)));
            
                $("input:radio[name=delivery]:first").attr('checked', true);
            });
        }

        table.append($('<tr>')
            .append($('<td>').append($('<label>').text('Stuur me een bevestiging').attr('for', 'sendConfirmation')))
            .append($('<td>').append($('<input>').attr({ type: 'checkbox', id: 'sendConfirmation', name: 'sendConfirmation', checked: 'checked' })).append(" (vereist email)")));        

        var btn = $('<button>')
            .attr({ type: 'submit', id: 'submit' })
            .append($('<img>').addClass("spinner").attr("src", "/img/loader-button.gif"))
            .append($("<span>").text(buttontext));

        table.append($('<tr>')
            .append($('<td>').append($('<label>').attr('for', 'submit')))
            .append($('<td>').append(btn)));
        
        $(".promotionitem").change(function(){
            var sum = computeTotal();
            $(".responsive-form").find('#price').text("€ " + sum);
        });

        $(".promotionitemtoggle").change(function(){
            // as not all untoggles trigger change, evaluate all on every toggle
            $(".promotionitemtoggle").each(function(i, toggle){
                var targetid = $(toggle).attr('data-targetid');
                var minvalue = $(toggle).attr('data-minvalue');
                var maxvalue = $(toggle).attr('data-maxvalue');
                $("#" + targetid).val($(toggle).is(':checked') ? maxvalue : minvalue).trigger("change");
            });                    
        });

        wireForm(table, rules, messages);
    }
}

function wireForm(table, rules, messages){
    var form = promotionholder.find('.responsive-form');
    form.validate({
        onkeyup: true,
        rules: rules,
        messages: messages,
        submitHandler: function (f) {
            
            $("#submit .spinner").show();
            $("#submit").attr('disabled', true);

            // gather the data
            var name = promotionholder.find('#name').val();
            var firstname = promotionholder.find('#firstname').val();
            var optionalInput = promotionholder.find('#email');
            var email = optionalInput != null ? optionalInput.val() : null;                
            var optionalInput = promotionholder.find('#telephone');
            var telephone = optionalInput != null ? optionalInput.val() : null;
            var optionalInput = promotionholder.find('#address');
            var address = optionalInput != null ?  optionalInput.val() : null;
            var statusUpdatesRequested = promotionholder.find('#sendConfirmation').is(':checked');

            // all properties must be in caps otherwise the confirmation template won't render on both ends
            var buyer = {
                Name : firstname + " " + name,
                Email : email,
                Telephone : telephone,
                Address : address
            }

            var orderLines = extractOrderLines(sale);

            var expectedDeliveryDateRangeJson = $("input:radio[name=delivery]:checked").val();

            var expectedDeliveryDateRange = expectedDeliveryDateRangeJson != null ? JSON.parse(expectedDeliveryDateRangeJson) : null;
            
            var claimuri = sequenceService + "/api/sequences/" + sale.id + "/claim";
            $.ajax({
                type: 'POST',
                url: claimuri,
                contentType: 'application/json', 
                crossDomain: true,                    
                success: function(sequence){ 
                   
                    var orderId = guid();
                    var placeOrder = {
                        OrderId: orderId, 
                        SaleId: saleid,
                        SellerId: orgId,
                        Buyer: buyer,
                        OrderLines: orderLines,
                        StatusUpdateRequested: statusUpdatesRequested,
                        DeliveryExpectations: expectedDeliveryDateRange != null ? {
                            ExpectedDeliveryDateRange: {
                                Start: expectedDeliveryDateRange.start,
                                End: expectedDeliveryDateRange.end
                            }
                        } : null,
                        referenceNumber: sequence
                    };
        
                    var report = function(message){
        
                        var div = $("<div>").append($('<label>').text(message))
                                            .append("(")
                                            .append($("<a>").attr('href', "/order/confirmation/?o=" + orderId ).attr('target', 'blank').text("Open pdf versie"))   
                                            .append(")")               
                                            .append("<br />")
                                            .append("<br />")
                                            .append($("<button>").attr('id', 'next-order').attr('type', 'button').text(nexttext));
                                            
                        table.empty();
                        table.append($('<tr>').append($('<td>').append(div)).append($('<td>')));
        
                        $("#next-order").click(function(){
                            renderForm();
                        });
        
                    };
        
                    var posturi= ordersService + "/api/orderbookings/" + orgId + "/" + sale.id;
                    // send it to the service
                    $.ajax({
                        type: 'POST',
                        url: posturi,
                        contentType: 'application/json', 
                        crossDomain: true,
                        data : JSON.stringify(placeOrder),                        
                        success: function(data){ 
                            //report(promotion.successMessage.format(sum), data.message);
                            report("Bestelling geplaatst");
                            $("#submit .spinner").hide();
                            $("#submit").attr('disabled', false);
                        },
                        error: function(xhr, ajaxOptions, thrownError){ 
                            report("Er is een fout opgetreden bij het registreren. " + xhr.status);
                        }
                    });
        
                    
                },
                error: function(xhr, ajaxOptions, thrownError){ 
                    report("Er is een fout opgetreden bij het aanvragen van het kaartnummer. " + xhr.status);
                    
                }
            });
          
            return false;
            
        }
    });
}


var computeTotal = function(){
	var sum = 0;
	$(".promotionitem").each(function(i, el){

		var quantity = $(el).val();
		if(quantity == null || quantity.length == 0) quantity = 0;
		if(quantity == 0) return;
		
		var itemId = $(el).attr("data-itemId");

		var variants = determineVariants($(el));		
		
		var offer = determinePricingOffer(itemId, variants);
		
		if(offer) {
			sum += quantity * offer.price.value;
		}
	});

	return sum;
};

function getAttributes ( node ) {
    var i,
        attributeNodes = node.attributes,
        length = attributeNodes.length,
        attrs = {};

    for ( i = 0; i < length; i++ ) attrs[attributeNodes[i].name] = attributeNodes[i].value;
    return attrs;
}

function determineVariants(el){
	var variants = [];
	var attributes = getAttributes($(el)[0]);
	
	for (var key in attributes) {
		if (attributes.hasOwnProperty(key)){
			if(key.startsWith("data-variant-")){
				variants.push({
					id: key.replace("data-variant-", ""),
					value: attributes[key]
				});
			}
		}
	}
		
	return variants;		
}

function determinePricingOffer(itemId, variants){
    if(offersPerItem.hasOwnProperty(itemId)){
        var potentialOffers = offersPerItem[itemId];
		if(potentialOffers.length == 1) return potentialOffers[0];		

		if(variants && variants.length > 0){
			for(var variant of variants){
				return potentialOffers.filter(o => o.variantLimits[0].optionSetId == variant.id && o.variantLimits[0].matchingValues.includes(variant.value))[0]
			}
		}        
    }
    return null;
}


function extractOrderLines(sale){
    var orderLines = [];

    $("[data-itemid]").each(function(i, el){
        var quantity = $(el).val();
        if(quantity == null || quantity.length == 0) quantity = 0;
        if(quantity == 0) return;
        
        var itemId = $(el).attr("data-itemId");

        if(sale.choice == "Single"){
            var selectedItemId = $('input[name=selection]:checked').attr('data-targetid');
            if(itemId != selectedItemId) return;
        }

        var variants = determineVariants($(el));
		
		var offer = determinePricingOffer(itemId, variants);
		
        
        if(offer) {
            var description = itemDescriptions[offer.id];

            var selectedOptions = null;
            if(variants){
                selectedOptions = [];
                variants.forEach(function(variant){
                    var optionSet = description.optionSets.filter(s => s.id == variant.id)[0];                               
                    selectedOptions.push({
                        Id: optionSet.id,
                        Name: optionSet.name,
                        Value: variant.value
                    });
                })

            }

            orderLines.push({
                Id: guid(), 
                OrderedItem: {
                    Id: offer.id,
                    CatalogId: offer.catalogId,
                    CollectionId: offer.collectionId,
                    Name: description.name,
                    Price: {
                        Currency: offer.price.currency,
                        Value: offer.price.value
                    },
                    SelectedOptions : selectedOptions
                },
                Quantity: quantity                               
            });
        }
    });
    
    // get select options
    orderLines.forEach(function(orderLine){
        if(orderLine.OrderedItem.SelectedOptions == null){
            var selectedOptions = [];
            var itemDescription = itemDescriptions[orderLine.OrderedItem.Id];
            if(itemDescription.optionSets !== "undefined" && itemDescription.optionSets !== null){
                itemDescription.optionSets.forEach(function(optionSet){
                    var selected = $('select[data-itemid="' + orderLine.OrderedItem.Id + '"][data-optionsetid="' + optionSet.id + '"]').val();
                    var val = optionSet.options.filter(function(v){ return v.id == selected })[0];
                    selectedOptions.push({
                        Id: optionSet.id,
                        Name: optionSet.name,
                        Value: val.id
                    });
                });
                orderLine.OrderedItem.SelectedOptions = selectedOptions;
            } 
        }                                      
    });

    return orderLines;
 }

 $(document).ready(function(){
   
    promotionholder = $("[data-saleid]");
    saleid = promotionholder.attr("data-saleid");
    title = promotionholder.attr("data-title");
    buttontext = promotionholder.attr("data-buttontext");
    nexttext = promotionholder.attr("data-nexttext");
    var toSplit = promotionholder.attr("data-required");
    required = toSplit != null ? toSplit.split(" "): [];
    toSplit = promotionholder.attr("data-optional");
    optional = toSplit != null ? toSplit.split(" "): [];
   

    loadSale();
});

function indexOffersPerItem(){
    for (var key in sale.items) {
		if (sale.items.hasOwnProperty(key)){
			var item = sale.items[key];
			var itemDescription = collection.items.filter(function(i){ return i.id == item.id})[0];
			itemDescriptions[item.id] = itemDescription;
			
			if (!offersPerItem.hasOwnProperty(item.id)){
				offersPerItem[item.id] = []
			}
			offersPerItem[item.id].push(item);               
		}
    }
    renderForm();
}

function loadSale(){
    var salesbaseuri = salesService + "/api/sales/";
	var uri = salesbaseuri + orgId + "/" + saleid + "/";
	$.ajax({
		 type: 'GET',
		 url: uri,
		 dataType: 'json', 
		 crossDomain: true,
		 success: function(p){       
			 sale = p;		
			 loadCollection();
		 }
	   });
}

function loadCollection(){
	if(sale && sale.items){
		var item = sale.items[0]; // assume all items from same catalog & collection for now

        var catalogbaseuri = catalogService + "/api/catalogs/";
		uri = catalogbaseuri + orgId + "/" + item.catalogId + "/collections/" + item.collectionId;
		$.ajax({
			type: 'GET',
			url: uri,
			dataType: 'json', 
			crossDomain: true,
			success: function(p){       
				collection = p;                
                indexOffersPerItem();
                registerSequence();
			}
		});
	}	
}

function registerSequence(){
	if(sale && sale.items){
        var sequencebaseuri = sequenceService + "/api/sequences/";
        var posturi = sequencebaseuri + sale.id;
        
        var defineSequence = {
            initialOffset: 700,
            rangeSize: 10
        }
        
        $.ajax({
            type: 'POST',
            url: posturi,
            contentType: 'application/json', 
            crossDomain: true,
            data : JSON.stringify(defineSequence),                        
            success: function(data){ 
               
                
            },
            error: function(xhr, ajaxOptions, thrownError){ 
               
                
            }
        });

	}	
}