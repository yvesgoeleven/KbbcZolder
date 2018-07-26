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

function renderHeader(planning){
	var tr = $("#workplanning-table tr:first");
	var i = 1;
	planning.shifts.forEach(function(shift) {
		if(!shift.archived){
			var start = new Date(Date.parse(shift.workStartsOn));
			var end = new Date(Date.parse(shift.workEndsOn));
			var title = start.toLocaleDateString('nl-BE', { year: 'numeric', month: 'numeric', day: 'numeric' }) + " [" + start.toLocaleTimeString('nl-BE', { hour: 'numeric', minute: 'numeric' }) + "-" + end.toLocaleTimeString('nl-BE', { hour: 'numeric', minute: 'numeric' }) + "]";
			i++;
			sheet.insertRule("#workplanning-table tr:not(:last-child) td:nth-of-type(" + i + "):before {content: \"" + title + "\"; }", 0);
			var div = $.template("#shift-template",
			{
				title: title			
			});
			tr.append($("<th>").addClass("responsive-table-cell").append(div));		
		}		
	});
}

function renderRows(planning){
	planning.tasks.forEach(function(task) {
		if(!task.archived){
			var table = $("#workplanning-table");
			var div = $.template("#task-template",
			{
				description: task.description
			});
			var tr = $("<tr>");
			table.append(tr.append($("<td>").addClass("responsive-table-cell").append(div)));
			for (i = 0; i < planning.shifts.length; i++) {
				var shift = planning.shifts[i];
				var slots = planning.slots.filter(function(e){ return e.workTaskId === task.id && e.workShiftId == shift.id; });
				var slot = slots.length > 0 ? slots[0] : null;
				var slotid = task.id + "-" + shift.id;
				
				var content = renderSlotContent(task.id, shift.id, slot);					
				
				tr.append($("<td>").attr('id', slotid).addClass("responsive-table-cell").append(content));
			}
		}
	});
}
function renderSlotContent(taskid, shiftid, slot){
	var allocated = slot != null ? slot.allocations.length : 0;
	var content = $.template("#allocation-template",
	{
		shiftid: shiftid,
		taskid: taskid,
		indicator: slot != null && slot.minimumStaffRequired > 0 ? allocated + "/" + slot.minimumStaffRequired : ""
	});
	if(slot != null){
		if(allocated < slot.minimumStaffRequired) content.find(".table-indicator").addBack('.table-indicator').addClass("red");
		var allocationlist = content.find(".allocated-list");
		slot.allocations.forEach(function(allocation){
			allocationlist.append($("<li>").append(allocation.name));
		});
		
	}
	return content;
}


$(document).ready(function(){
   
   var id = $("#workplanning").attr('data-id')
   var org = "5159e64f-4d2e-42c4-968d-6ff38338129b";
   var service = "community-service.azurewebsites.net";
   //var service = "localhost:22465"; // uncomment for local testing
   var uri= "https://" + service + "/api/workplanning/" + org + "/" + id;

   $.ajax({
        type: 'GET',
        url: uri,
        dataType: 'json', 
        crossDomain: true, 
        success: function(p){   
		    planning = p;
			renderHeader(planning);
			renderRows(planning);	
        }
      });
});

var planning;