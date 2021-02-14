window.addEventListener("load", function() {
	if (nabu && nabu.page && nabu.page.provide) {
		nabu.page.provide("page-structure", { 
			category: "Layouts",
			name: "Three Columns",
			description: "A simple layout with three columns",
			icon: "page/core/layouts/three-columns.png",
			content: {"type":"page-row","content":{"id":11,"cells":[{"id":14,"rows":[{"id":13,"cells":[],"class":null,"customId":null,"instances":{},"condition":null,"direction":"vertical","align":null,"on":null,"collapsed":false,"name":"Column Contents"}],"alias":null,"bindings":{},"name":"Column 1","state":{},"target":"page","on":null,"class":null,"customId":null,"width":1,"height":null,"instances":{},"condition":null,"devices":[],"clickEvent":{"eventFields":[],"name":null}},{"id":12,"rows":[{"id":16,"cells":[],"class":null,"customId":null,"instances":{},"condition":null,"direction":"vertical","align":null,"on":null,"collapsed":false,"name":"Column Contents"}],"alias":null,"bindings":{},"name":"Column 2","state":{},"target":"page","on":null,"class":null,"customId":null,"width":1,"height":null,"instances":{},"condition":null,"devices":[],"clickEvent":null},{"id":15,"rows":[{"id":17,"cells":[],"class":null,"customId":null,"instances":{},"condition":null,"direction":"vertical","align":null,"on":null,"collapsed":false,"name":"Column Contents"}],"alias":null,"bindings":{},"name":"Column 3","state":{},"target":"page","on":null,"class":null,"customId":null,"width":1,"height":null,"instances":{},"condition":null,"devices":[],"clickEvent":{"eventFields":[],"name":null}}],"class":null,"customId":null,"instances":{},"condition":null,"direction":null,"align":null,"on":null,"collapsed":false,"name":"Columns"}}
		});
	}
});