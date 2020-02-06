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
var offersWithVariantLimits = [];
var offersWithoutVariantLimits = [];
var itemDescriptions = [];
var selectedOptionMemory = [];

function renderInputFields(item, style, rules, messages, preselectedOptions){
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

    var inputTextVisible = item.orderLimit == null || (item.maximumQuantity > 1 || item.maximumQuantity == null);
    var min = item.orderLimit != null ? item.orderLimit.minimumQuantity : 0;
    var max = item.orderLimit != null ? item.orderLimit.maximumQuantity : Number.MAX_SAFE_INTEGER;
    var checkType = sale.choice == "Multiple" ? 'checkbox' : 'radio';
    var name = sale.choice == "Multiple" ? item.id : "selection";

    var inputs = [];

    var input = $('<input>').attr({ type: 'text', name: name, "data-itemid": item.id, "data-preselectedOptions": preselectedOptions, placeholder: '0' }).addClass("promotionitem").toggle(inputTextVisible);
    if(style){ input.css(style); }
    inputs.push(input);

    if(!inputTextVisible){
        inputs.push($('<input>').attr({ type: checkType, name: name, "data-targetid": item.id,  "data-preselectedOptions": preselectedOptions, "data-minvalue": min, "data-maxvalue": max }).addClass("promotionitemtoggle"));
    }
  
    return inputs;
 }

 function determinePricingOffer(itemId, preselectedOptions){
    var offer = offersWithoutVariantLimits.filter(i => i.id == itemId)[0];
    if(!offer){       
        preselectedOptions.forEach(function(option){
            if(!offer){
                offer = offersWithVariantLimits[itemId].filter(o => o.variantLimits[0].optionSetId == option.optionSetId && o.variantLimits[0].matchingValues.includes(option.optionId))[0]
            }                        
        });
    }
    return offer;
 }

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


       
        // extend with promotion items

        // split those with variant limits from those that don't
        for (var key in sale.items) {
            if (sale.items.hasOwnProperty(key)){
                var item = sale.items[key];
                var itemDescription = collection.items.filter(function(i){ return i.id == item.id})[0];
                itemDescriptions[item.id] = itemDescription;

                if(item.variantLimits == null || item.variantLimits.length == 0){                   
                    offersWithoutVariantLimits.push(item);
                }
                else{
                    if (!offersWithVariantLimits.hasOwnProperty(item.id)){
                        offersWithVariantLimits[item.id] = []
                    }
                    offersWithVariantLimits[item.id].push(item);
                }
            }
        }

        // render offers with variant limits
        for (var itemId in offersWithVariantLimits) {
            if (offersWithVariantLimits.hasOwnProperty(itemId)){
                var itemDescription = itemDescriptions[itemId];

                var variantset = offersWithVariantLimits[itemId][0].variantLimits[0].optionSetId;
                              
                if(itemDescription.optionSets.length == 2){ // render this as a table
                    var x = itemDescription.optionSets.filter(s => s.id != variantset)[0];
                    var y = itemDescription.optionSets.filter(s => s.id == variantset)[0]; 
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

                        var item = offersWithVariantLimits[itemId].filter(o => o.variantLimits[0].matchingValues.includes(option.id))[0]

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
                            var inputs = renderInputFields(item, { "width": width, "min-width": width }, rules, messages, JSON.stringify([{
                                optionSetId : y.id,
                                optionId: option.id
                            },{
                                optionSetId : x.id,
                                optionId: o.id
                            }]));
                            inputs.forEach(input => td.append(input));                       
                        });
                        
                        tr.append(td);

                        table.append(tr);
                    });
                }
            }
        }
        
        // render offers without variants

        offersWithoutVariantLimits.forEach(function(item, k){
            var itemDescription = itemDescriptions[item.id];
            shouldShowTotal &= item.price.value > 0;

            var td = $('<td>');
            var inputs = renderInputFields(item, null, rules, messages);            
            inputs.forEach(input => td.append(input));  

            table.append($('<tr>')
                    .append($('<td>').append($('<label>').text(itemDescription.name + (item.price.value > 0 ? " " + item.price.currency + item.price.value : "")).attr('for', item.id)))
                    .append(td));
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
            $("[data-itemid]").each(function(i, el){

                var quantity = $(el).val();
                if(quantity == null || quantity.length == 0) quantity = 0;
                if(quantity == 0) return;
                
                var itemId = $(el).attr("data-itemId");
                var preselectedOptionsJson = $(el).attr("data-preselectedOptions");
                var preselectedOptions = preselectedOptionsJson != null ? JSON.parse(preselectedOptionsJson) : null;

                var offer = determinePricingOffer(itemId, preselectedOptions);
               
                if(offer) {
                    sum += quantity * offer.price.value;
                }
            });

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

                $("[data-itemid]").each(function(i, el){
                    var quantity = $(el).val();
                    if(quantity == null || quantity.length == 0) quantity = 0;
                    if(quantity == 0) return;
                    
                    var itemId = $(el).attr("data-itemId");

                    if(sale.choice == "Single"){
                        var selectedItemId = $('input[name=selection]:checked').attr('data-targetid');
                        if(itemId != selectedItemId) return;
                    }

                    var preselectedOptionsJson = $(el).attr("data-preselectedOptions");
                    var preselectedOptions = preselectedOptionsJson != null ? JSON.parse(preselectedOptionsJson) : null;
    
                    var offer = determinePricingOffer(itemId, preselectedOptions);
                   
                    if(offer) {
                        var description = itemDescriptions[offer.id];

                        var selectedOptions = null;
                        if(preselectedOptions){
                            selectedOptions = [];
                            preselectedOptions.forEach(function(preselected){
                                var optionSet = description.optionSets.filter(s => s.id == preselected.optionSetId)[0];                               
                                 selectedOptions.push({
                                    Id: optionSet.id,
                                    Name: optionSet.name,
                                    Value: preselected.optionId
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