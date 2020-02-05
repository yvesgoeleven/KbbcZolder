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
var promotionholder;
var optional;
var required;
var salesid;
var title;
var buttontext;
var nexttext;
var sale;
var collection;
var items = [];
var itemDescriptions = [];
var selectedOptionMemory = [];

function renderForm(){
    var isIE = detectIE();
    
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
                .append($('<td>').append($('<label>').text('Registratie gaat pas open op ' + fromDate.toLocaleDateString("nm-BE", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })))));;
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

        var shouldShowTotal = true;
        var itemsWithVariantLimits = [];
        var itemsWithoutVariantLimits = [];

        // extend with promotion items

        // split those with variant limits from those that don't
        for (var key in sale.items) {
            if (sale.items.hasOwnProperty(key)){
                var item = sale.items[key];
                items[item.id] = item;
                var itemDescription = collection.items.filter(function(i){ return i.id == item.id})[0];
                itemDescriptions[item.id] = itemDescription;

                if(item.variantLimits == null || item.variantLimits.length == 0){                   
                    itemsWithoutVariantLimits.push(item);
                }
                else{
                    if (!itemsWithVariantLimits.hasOwnProperty(item.id)){
                        itemsWithVariantLimits[item.id] = []
                    }
                    itemsWithVariantLimits[item.id].push(item);
                }
            }
        }

        // render items with variant limits
        for (var itemId in itemsWithVariantLimits) {
            if (itemsWithVariantLimits.hasOwnProperty(itemId)){
                var itemDescription = itemDescriptions[itemId];

                var variantset = itemsWithVariantLimits[itemId][0].variantLimits[0].optionSetName;
                              
                if(itemDescription.optionSets.length == 2){ // render this as a table
                    var x = itemDescription.optionSets.filter(s => s.name != variantset)[0];
                    var y = itemDescription.optionSets.filter(s => s.name == variantset)[0]; 
                    var tr =  $('<tr>')
                    tr.append($('<td>').append($('<label>').text(itemDescription.name)));
                    var td =  $('<td>');                    
                    // render headers
                    var slash = false;
                    x.options.forEach(function(o){
                        if(slash){
                            td.append($("<span>").text(" / ")); 
                        }                     
                        td.append($("<span>").text(o.name)); 
                        slash = true;                       
                    });
                    tr.append(td);
                    table.append(tr);
                    y.options.forEach(function(option){

                        var item = itemsWithVariantLimits[itemId].filter(o => o.variantLimits[0].matchingValues.includes(option.id))[0]

                        shouldShowTotal &= item.price.value > 0;

                        tr =  $('<tr>');
                        td =  $('<td>');
                        td.append(option.name + (item.price.value > 0 ? " " + item.price.currency + item.price.value : ""));
                        tr.append(td);                        

                        td =  $('<td>');

                        var count = y.options.length;
                        // evenly distribute the width + account for padding per input - the padding at the edges
                        var width = "calc(" + (200 / count) + "px - " +  ((0.2 * count) - (0.4 / count)) + "em)";

                        x.options.forEach(function(o){                
                                      
                            td.append($("<input>").attr({ type: 'text', /*id: item.id, name: name,*/ placeholder: '0' }).css("width", width).css("min-width", width));                            
                        });
                        
                        tr.append(td);

                        table.append(tr);
                    });
                }
            }
        }
        

        // render items without variants
        itemsWithoutVariantLimits.forEach(function(item, k){
            var itemDescription = itemDescriptions[item.id];
            if(item.orderLimit != null)
            {
                var min = item.orderLimit.minimumQuantity != null ? item.orderLimit.minimumQuantity : 0;
                var max = item.orderLimit.maximumQuantity != null ? item.orderLimit.maximumQuantity : Number.MAX_SAFE_INTEGER; 
                rules[item.id] = {
                    range: [min, max]
                };
                messages[item.id] = {
                    range : "Vul een getal in tussen " + min + " en " + max
                }
            }
            else{
                rules[item.id] = {
                    number: true
                };
                messages[item.id] = {
                    number: "Vul een getal in"
                };

            }

            shouldShowTotal &= item.price.value > 0;

            var inputTextVisible = item.orderLimit == null || (item.maximumQuantity > 1 || item.maximumQuantity == null);
            var min = item.orderLimit != null ? item.orderLimit.minimumQuantity : 0;
            var max = item.orderLimit != null ? item.orderLimit.maximumQuantity : Number.MAX_SAFE_INTEGER;
            var checkType = sale.choice == "Multiple" ? 'checkbox' : 'radio';
            var name = sale.choice == "Multiple" ? item.id : "selection";

            table.append($('<tr>')
                    .append($('<td>').append($('<label>').text(itemDescription.name + (item.price.value > 0 ? " " + item.price.currency + item.price.value : "")).attr('for', item.id)))
                    .append($('<td>').append($('<input>').attr({ type: 'text', id: item.id, name: name, placeholder: '0' }).addClass("promotionitem").toggle(inputTextVisible))
                                    .append($('<input>').attr({ type: checkType, name: name, "data-targetid": item.id, "data-minvalue": min, "data-maxvalue": max }).addClass("promotionitemtoggle").toggle(!inputTextVisible) )));
     

            // if(item.variantLimits == null || item.variantLimits.length == 0){
            //            }
            // else{
            //     item.variantLimits.forEach(function(l, i){
            //         l.matchingValues.forEach(function (v, j){
            //             table.append($('<tr>')
            //             .append($('<td>').append($('<label>').text(itemDescription.name + " " + v + " " + (item.price.value > 0 ? " " + item.price.currency + item.price.value : "")).attr('for', item.id)))
            //             .append($('<td>').append($('<input>').attr({ type: 'text', id: item.id, name: name, placeholder: '0' }).addClass("promotionitem").toggle(inputTextVisible))
            //                             .append($('<input>').attr({ type: checkType, name: name, "data-targetid": item.id, "data-minvalue": min, "data-maxvalue": max }).addClass("promotionitemtoggle").toggle(!inputTextVisible) )));
            //         });
            //     });
            // }
        });

        // extend with total and submit button

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
                            .append($('<td>').append($('<label>').text(i == 0 ? 'Ik kom van': '').attr('for', 'delivery')))
                            .append($('<td>').append($('<input>').attr({ type: 'radio', id: 'delivery_' + i, name: 'delivery', value: JSON.stringify(d) })).append(" " + toShow)));
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

        // compute price on promotion item changes
        var computeTotal = function(){
            var sum = 0;
            for (var key in items) {
                if (items.hasOwnProperty(key)){
                    var item = items[key];
                    var quantity = $("#" + item.id).val();
                    if(quantity == null || quantity.length == 0) quantity = 0;
                    sum += quantity * item.price.value;
                }
            }
            return sum;
        };

        $(".promotionitem").change(function(){
            var sum = computeTotal();
            promotionholder.find('#price').text("€ " + sum);
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

        $(".promotionitemtoggle").change(function(){
            var targetid = $(this).attr('data-targetid');
            var itemDescription = itemDescriptions[targetid];
            if(itemDescription && itemDescription.optionSets){
                $(".variable-row").remove();
                itemDescription.optionSets.forEach(function(optionSet){
                    var sel = $("<select>").attr('data-targetid', targetid).attr('data-optionid', optionSet.name);
                    optionSet.options.forEach(function(value){
                        sel.append($("<option>").attr("value", value.id).text(value.name));
                    });
                    var previouslySelected = selectedOptionMemory.hasOwnProperty(optionSet.name);
                    if(previouslySelected){
                        sel.val(selectedOptionMemory[optionSet.name]);
                    }

                    $(".total-row").before($('<tr class="variable-row">')
                    .append($('<td>').append($('<label>').text(optionSet.name)))
                    .append($('<td>').append(sel)));
                });

                $("select[data-optionid]").change(function(){
                    var sel = $(this).attr('data-optionid');
                    var val = $(this).val();
                    selectedOptionMemory[sel] = val;
                });
            }
        });

        // set up form validation and submit logic
        var form = promotionholder.find('.responsive-form');
        form.validate({
            onkeyup: true,
            rules: rules,
            messages: messages,
            submitHandler: function (f) {
                
                $("#submit .spinner").show();
                $("#submit").attr('disabled', true);

                // gather the data
                var sum = computeTotal();

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

                var orderLines = [];
                if(sale.choice == "Multiple"){
                    for (var key in items) {
                        if (items.hasOwnProperty(key)){
                            var item = items[key];
                            var description = itemDescriptions[key];
                            var quantity = $("#" + item.id).val();
                            if(quantity == null || quantity.length == 0) quantity = 0;
                            if(quantity > 0){
                                orderLines.push({
                                    Id: guid(), 
                                    OrderedItem: {
                                        Id: item.id,
                                        CatalogId: item.catalogId,
                                        CollectionId: item.collectionId,
                                        Name: description.name,
                                        Price: {
                                            Currency: item.price.currency,
                                            Value: item.price.value
                                        },
                                        SelectedOptions : null
                                    },
                                    Quantity: quantity                               
                                });
                            }
                        }
                    }
                }
                else{ // promotion.choiceType == "Single"
                    var selectedItemId = $('input[name=selection]:checked').attr('data-targetid');
                    var item = items[selectedItemId];
                    var description = itemDescriptions[selectedItemId];
                    var quantity = $("#" + item.id).val();
                    if(quantity == null || quantity.length == 0) quantity = 0;
                    if(quantity > 0){
                        orderLines.push({
                            Id: guid(), 
                            OrderedItem: {
                                Id: item.id,
                                CatalogId: item.catalogId,
                                CollectionId: item.collectionId,
                                Name: description.name,
                                Price: {
                                    Currency: item.price.currency,
                                    Value: item.price.value
                                },
                                SelectedOptions : null
                            },
                            Quantity: quantity 
                        });
                    }                    
                }

                // get select options
                orderLines.forEach(function(orderLine){
                    var selectedOptions = [];
                    var itemDescription = itemDescriptions[orderLine.OrderedItem.Id];
                    if(itemDescription.optionSets !== "undefined" && itemDescription.optionSets !== null){
                        itemDescription.optionSets.forEach(function(optionSet){
                            var selected = $('select[data-targetid="' + orderLine.OrderedItem.Id + '"][data-optionid="' + optionSet.name + '"]').val();
                            var val = optionSet.options.filter(function(v){ return v.id == selected })[0];
                            selectedOptions.push({
                                Id: optionSet.id,
                                Name: optionSet.name,
                                Value: val.id
                            });
                        });
                        orderLine.OrderedItem.SelectedOptions = selectedOptions;
                    }                    
                });


                var orderId = guid();
                var placeOrder = {
                    OrderId: orderId, 
                    SaleId: saleid,
                    SellerId: orgId,
                    Buyer: buyer,
                    OrderLines: orderLines,
                    StatusUpdateRequested: statusUpdatesRequested
                };

                var report = function(message){
                // var table = promotionholder.find('table');                  
                  
                
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

                // var posturi= ordersService + "/api/orderbookings/" + orgId + "/" + sale.id;
                // // send it to the service
                // $.ajax({
                //     type: 'POST',
                //     url: posturi,
                //     contentType: 'application/json', 
                //     crossDomain: true,
                //     data : JSON.stringify(placeOrder),                        
                //     success: function(data){ 
                //       //report(promotion.successMessage.format(sum), data.message);
                //       report("Bestelling geplaatst");
                //       $("#submit .spinner").hide();
                //       $("#submit").attr('disabled', false);
                //     },
                //     error: function(xhr, ajaxOptions, thrownError){ 
                //         report("Er is een fout opgetreden bij het registreren. " + xhr.status);
                //     }
                // });
    
                return false;
                
            }
        });
    }
        
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
                renderForm();
			}
		});
	}	
}



/*if (!String.prototype.format) {
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

var catalogService = "https://clubmgmt-catalog-service.azurewebsites.net";
var salesService = "https://clubmgmt-sales-service.azurewebsites.net";
var ordersService = "https://clubmgmt-orders-service.azurewebsites.net";
//var ordersService = "http://localhost:22465"; // uncomment for local testing
var promotionholder;
var optional;
var required;
var salesid;
var title;
var buttontext;
var nexttext;
var sale;
var collection;
var items = [];
var itemDescriptions = [];
var selectedOptionMemory = [];

Handlebars.registerHelper('line-item-total', function(orderLine) {
   return orderLine.Quantity * orderLine.OrderedItem.Price.Value;
});

Handlebars.registerHelper('order-total', function(order) {
    var total = 0;
    
    order.OrderLines.forEach(function(orderLine){
        total += orderLine.Quantity * orderLine.OrderedItem.Price.Value;
    });
  
    return total;
  });

function renderForm(){
    var isIE = detectIE();
    
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

        var shouldShowTotal = true;
        // extend with promotion items
        for (var key in sale.items) {
            if (sale.items.hasOwnProperty(key)){
                var item = sale.items[key];
                items[item.id] = item;
                var itemDescription = collection.items.filter(function(i){ return i.id == item.id})[0];
                itemDescriptions[item.id] = itemDescription;

                
                if(item.orderLimit != null)
                {
                    var min = item.orderLimit.minimumQuantity != null ? item.orderLimit.minimumQuantity : 0;
                    var max = item.orderLimit.maximumQuantity != null ? item.orderLimit.maximumQuantity : 2147483647; 
                    rules[item.id] = {
                        range: [min, max]
                    };
                    messages[item.id] = {
                        range : "Vul een getal in tussen " + min + " en " + max
                    }
                }
                else{
                    rules[item.id] = {
                        number: true
                    };
                    messages[item.id] = {
                        number: "Vul een getal in"
                    };

                }

                shouldShowTotal &= item.price.value > 0;

                var inputTextVisible = item.orderLimit == null || item.maximumQuantity > 1;
                var min = item.orderLimit != null ? item.orderLimit.minimumQuantity : 0;
                var max = item.orderLimit != null ? item.orderLimit.maximumQuantity : Number.MAX_SAFE_INTEGER;
                var checkType = sale.choice == "Multiple" ? 'checkbox' : 'radio';
                var name = sale.choice == "Multiple" ? item.id : "selection";
                
                table.append($('<tr>')
                    .append($('<td>').append($('<label>').text(itemDescription.name + (item.price.value > 0 ? " " + item.price.currency + item.price.value : "")).attr('for', item.id)))
                    .append($('<td>').append($('<input>').attr({ type: 'text', id: item.id, name: name, placeholder: '0' }).addClass("promotionitem").toggle(inputTextVisible))
                                    .append($('<input>').attr({ type: checkType, name: name, "data-targetid": item.id, "data-minvalue": min, "data-maxvalue": max }).addClass("promotionitemtoggle").toggle(!inputTextVisible) )));
            }
        }

        // extend with total and submit button

        if(shouldShowTotal){
            table.append($('<tr class="total-row">')
                .append($('<td>').append($('<label>').text('Te betalen')))
                .append($('<td>').append($('<label>').text('€ 0').attr('id', 'price'))));
        }

        if(sale.deliverySlots.length > 0)
        {
            var show = sale.deliverySlots.length > 1;
                       
            sale.deliverySlots.forEach(function(d, i){

                var start = new Date(d.start);
                var end = new Date(d.end);
                var toShow = start.toLocaleTimeString("nl-BE", {hour: '2-digit', minute:'2-digit'}) + " tot " + end.toLocaleTimeString("nl-BE", {hour: '2-digit', minute:'2-digit'});

                table.append($('<tr>')
                            .append($('<td>').append($('<label>').text(i == 0 ? 'Ik kom van': '').attr('for', 'delivery')))
                            .append($('<td>').append($('<input>').attr({ type: 'radio', id: 'delivery_' + i, name: 'delivery', value: JSON.stringify(d) })).append(" " + toShow)));
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

        // compute price on promotion item changes
        var computeTotal = function(){
            var sum = 0;
            for (var key in items) {
                if (items.hasOwnProperty(key)){
                    var item = items[key];
                    var quantity = $("#" + item.id).val();
                    if(quantity == null || quantity.length == 0) quantity = 0;
                    sum += quantity * item.price.value;
                }
            }
            return sum;
        };

        $(".promotionitem").change(function(){
            var sum = computeTotal();
            promotionholder.find('#price').text("€ " + sum);
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

        $(".promotionitemtoggle").change(function(){
            var targetid = $(this).attr('data-targetid');
            var itemDescription = itemDescriptionss[targetid];
            if(itemDescription && itemDescription.optionSets){
                $(".variable-row").remove();
                itemDescription.optionSets.forEach(function(optionSet){
                    var sel = $("<select>").attr('data-targetid', targetid).attr('data-optionid', optionSet.name);
                    optionSet.options.forEach(function(value){
                        sel.append($("<option>").attr("value", value.id).text(value.name));
                    });
                    var previouslySelected = selectedOptionMemory.hasOwnProperty(optionSet.name);
                    if(previouslySelected){
                        sel.val(selectedOptionMemory[optionSet.name]);
                    }

                    $(".total-row").before($('<tr class="variable-row">')
                    .append($('<td>').append($('<label>').text(optionSet.name)))
                    .append($('<td>').append(sel)));
                });

                $("select[data-optionid]").change(function(){
                    var sel = $(this).attr('data-optionid');
                    var val = $(this).val();
                    selectedOptionMemory[sel] = val;
                });
            }
        });

        // set up form validation and submit logic
        var form = promotionholder.find('.responsive-form');
        form.validate({
            onkeyup: true,
            rules: rules,
            messages: messages,
            submitHandler: function (f) {
                
                $("#submit .spinner").show();
                $("#submit").attr('disabled', true);

                // gather the data
                var sum = computeTotal();

                var name = promotionholder.find('#name').val();
                var firstname = promotionholder.find('#firstname').val();
                var optionalInput = promotionholder.find('#email');
                var email = optionalInput != null ? optionalInput.val() : null;                
                var optionalInput = promotionholder.find('#telephone');
                var telephone = optionalInput != null ? optionalInput.val() : null;
                var optionalInput = promotionholder.find('#address');
                var address = optionalInput != null ?  optionalInput.val() : null;
                var statusUpdatesRequested = promotionholder.find('#sendConfirmation').is(':checked');
                var selectedDeliverySlot = $('input[name=delivery]:checked').val();
                var expectedDeliveryDateRange = selectedDeliverySlot && selectedDeliverySlot.length > 0 ? JSON.parse(selectedDeliverySlot) : null;

                // all properties must be in caps otherwise the confirmation template won't render on both ends
                var buyer = {
                    Name : firstname + " " + name,
                    Email : email,
                    Telephone : telephone,
                    Address : address
                }

                var orderLines = [];
                if(sale.choice == "Multiple"){
                    for (var key in items) {
                        if (items.hasOwnProperty(key)){
                            var item = items[key];
                            var description = itemDescriptions[key];
                            var quantity = $("#" + item.id).val();
                            if(quantity == null || quantity.length == 0) quantity = 0;
                            if(quantity > 0){
                                orderLines.push({
                                    Id: guid(), 
                                    OrderedItem: {
                                        Id: item.id,
                                        CatalogId: item.catalogId,
                                        CollectionId: item.collectionId,
                                        Name: description.name,
                                        Price: {
                                            Currency: item.price.currency,
                                            Value: item.price.value
                                        },
                                        SelectedOptions : null
                                    },
                                    Quantity: quantity                               
                                });
                            }
                        }
                    }
                }
                else{ // promotion.choiceType == "Single"
                    var selectedItemId = $('input[name=selection]:checked').attr('data-targetid');
                    var item = items[selectedItemId];
                    var description = itemDescriptions[selectedItemId];
                    var quantity = $("#" + item.id).val();
                    if(quantity == null || quantity.length == 0) quantity = 0;
                    if(quantity > 0){
                        orderLines.push({
                            Id: guid(), 
                            OrderedItem: {
                                Id: item.id,
                                CatalogId: item.catalogId,
                                CollectionId: item.collectionId,
                                Name: description.name,
                                Price: {
                                    Currency: item.price.currency,
                                    Value: item.price.value
                                },
                                SelectedOptions : null
                            },
                            Quantity: quantity 
                        });
                    }                    
                }

                // get select options
                orderLines.forEach(function(orderLine){
                    var selectedOptions = [];
                    var itemDescription = itemDescriptions[orderLine.OrderedItem.Id];
                    if(itemDescription.optionSets !== "undefined" && itemDescription.optionSets !== null){
                        itemDescription.optionSets.forEach(function(optionSet){
                            var selected = $('select[data-targetid="' + orderLine.OrderedItem.Id + '"][data-optionid="' + optionSet.name + '"]').val();
                            var val = optionSet.options.filter(function(v){ return v.id == selected })[0];
                            selectedOptions.push({
                                Id: optionSet.id,
                                Name: optionSet.name,
                                Value: val
                            });
                        });
                        orderLine.OrderedItem.SelectedOptions = selectedOptions;
                    }                    
                });


                var orderId = guid();
                var placeOrder = {
                    OrderId: orderId, 
                    SaleId: saleid,
                    SellerId: orgId,
                    Buyer: buyer,
                    OrderLines: orderLines,
                    StatusUpdateRequested: statusUpdatesRequested,
                    deliveryDetails : {
                        expectedDeliveryDateRange: expectedDeliveryDateRange != null ? {
                            start: new Date(expectedDeliveryDateRange.start),
                            end: new Date(expectedDeliveryDateRange.end)
                        } : null
                    }
                };

                var report = function(message){
                // var table = promotionholder.find('table');                  
                  
                
                    var div = $("<div>").append($('<label>').text(message))
                                        .append("<br/>")
                                        .append("<br/>")
                                        .append($("<button>").attr('id', 'print-order').attr('type', 'button').text(isIE === false ? "print uw bestelling" : "download uw bestelling" ))                  
                                        .append("&nbsp;")
                                        .append($("<button>").attr('id', 'next-order').attr('type', 'button').text(nexttext));
                                       
                    table.empty();
                    table.append($('<tr>').append($('<td>').append(div)).append($('<td>')));

                    $("#next-order").click(function(){
                        renderForm();
                    });

                    $("#print-order").click(function(){
                        
                        var template = Handlebars.compile(sale.confirmationMessage.template);
                        var body = template({
                            data: placeOrder
                        });
                        
                        var doc = new jsPDF()
                    
                        doc.addFileToVFS("PTSans.ttf", PTSans);
                        doc.addFont('PTSans.ttf', 'PTSans', 'normal');
                    
                        doc.setFont('PTSans'); // set font
                        
                        doc.setFontType("normal");
                        doc.setFontSize(11);
                        
                        var lines = doc.splitTextToSize(body, 180);
                        doc.text(20, 20 , lines)
                       
                        if(isIE === false){
                            doc.autoPrint();

                            var iframe = document.getElementById('printoutput');
                            iframe.src = doc.output('datauristring');
                        }
                        else{
                            doc.save('bestelling.pdf');
                        }
                    });
                };

                var posturi=  ordersService + "/api/purchaseorders/" + orgId + "/" + sale.id;
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
    
                return false;
                
            }
        });
    }
        
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
                renderForm();
			}
		});
	}	
}*/
